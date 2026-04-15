import Anthropic from "@anthropic-ai/sdk";
import {
  JOURNEY_SUGGESTION_WINDOW,
  MODEL_HAIKU,
  PROMPT_JOURNEY_SUGGESTION,
} from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const system = `Você analisa o progresso de um aluno numa jornada de aprendizado com marcos ordenados.
Com base nos scores recentes dos diários e no progresso agregado, indique em qual marco o aluno parece estar.
Responda APENAS JSON válido:
{"suggested_milestone_id":"uuid-do-marco","confidence":0.0-1.0,"reasoning":"texto curto em português para o professor"}
O suggested_milestone_id deve ser exatamente um dos IDs listados no contexto.`;

export async function runJourneySuggestionForStudent(
  studentId: string,
  professorId: string,
  journeyId: string
): Promise<void> {
  const admin = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  const { data: journey } = await admin
    .from("journeys")
    .select("id, professor_id, name")
    .eq("id", journeyId)
    .eq("professor_id", professorId)
    .maybeSingle();
  if (!journey) return;

  const { data: sj } = await admin
    .from("student_journeys")
    .select("id")
    .eq("student_id", studentId)
    .eq("journey_id", journeyId)
    .maybeSingle();
  if (!sj) return;

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("professor_id", professorId)
    .maybeSingle();
  if (!student) return;

  const { data: milestones } = await admin
    .from("milestones")
    .select("id, name, position, description")
    .eq("journey_id", journeyId)
    .order("position", { ascending: true });
  const msList = milestones ?? [];
  if (msList.length === 0) return;

  const { data: dlist } = await admin
    .from("diaries")
    .select("id")
    .eq("professor_id", professorId);
  const diaryIds = dlist?.map((d) => d.id) ?? [];
  if (!diaryIds.length) return;

  const { data: scored } = await admin
    .from("diary_students")
    .select(
      "comprehension_score, attention_score, engagement_score, absent, created_at, diary_id"
    )
    .eq("student_id", studentId)
    .in("diary_id", diaryIds)
    .not("comprehension_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(JOURNEY_SUGGESTION_WINDOW);

  const { data: progress } = await admin
    .from("student_progress")
    .select("overall_score, attention_trend, attention_confidence, short_note, last_diary_at")
    .eq("student_id", studentId)
    .eq("professor_id", professorId)
    .maybeSingle();

  const idempotencyKey = `journey_suggestion:${studentId}:${journeyId}:${new Date().toISOString().slice(0, 10)}`;

  const { data: jobRow } = await admin
    .from("ai_jobs")
    .upsert(
      {
        professor_id: professorId,
        type: "journey_suggestion",
        status: "processing",
        payload: { student_id: studentId, journey_id: journeyId },
        model: MODEL_HAIKU,
        prompt_version: PROMPT_JOURNEY_SUGGESTION,
        attempt_count: 1,
        idempotency_key: idempotencyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    )
    .select("id")
    .single();

  const jobId = jobRow?.id;
  if (!jobId) {
    console.error("journey_suggestion: falha ao criar ai_job", {
      studentId,
      journeyId,
    });
    return;
  }

  const context = {
    journey_name: journey.name,
    milestones: msList,
    recent_diary_scores: scored ?? [],
    student_progress: progress ?? null,
  };

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 512,
      system,
      messages: [
        {
          role: "user",
          content: `Contexto (JSON):\n${JSON.stringify(context)}`,
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as {
      suggested_milestone_id?: string;
      confidence?: number;
      reasoning?: string;
    };

    const suggestedId = parsed.suggested_milestone_id?.trim();
    const valid =
      suggestedId &&
      msList.some((m) => m.id === suggestedId);

    const inTok = msg.usage?.input_tokens ?? 0;
    const outTok = msg.usage?.output_tokens ?? 0;
    const cost = Math.max(
      1,
      Math.round(estimateCostCents(MODEL_HAIKU, inTok, outTok))
    );

    if (valid && suggestedId) {
      const note =
        parsed.reasoning?.trim() ||
        `Confiança ${((parsed.confidence ?? 0) * 100).toFixed(0)}%`;
      await admin
        .from("student_journeys")
        .update({
          ai_suggested_milestone_id: suggestedId,
          ai_suggestion_note: note,
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", studentId)
        .eq("journey_id", journeyId);

      await admin
        .from("ai_jobs")
        .update({
          status: "done",
          result: parsed as unknown as Record<string, unknown>,
          input_tokens: inTok,
          output_tokens: outTok,
          cost_cents: cost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } else {
      await admin
        .from("ai_jobs")
        .update({
          status: "failed",
          last_error: "Resposta inválida ou marco inexistente",
          input_tokens: inTok,
          output_tokens: outTok,
          cost_cents: cost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        last_error: err,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
