import Anthropic from "@anthropic-ai/sdk";
import {
  JOURNEY_SUGGESTION_WINDOW,
  MODEL_HAIKU,
  PROMPT_JOURNEY_SUGGESTION,
} from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_VALID_DIARIES = 3;

const system = `Você analisa o progresso de um aluno numa jornada de aprendizado com marcos ordenados.
Com base nos scores recentes dos diários, resumos individuais, notas do professor e progresso agregado, sugira o marco mais adequado.
Responda APENAS JSON válido:
{"suggested_milestone_id":"uuid ou null","confidence":0.0-1.0,"reasoning":"texto curto em português para o professor"}

Regras obrigatórias (o contexto inclui "allowed_milestone_ids"):
- suggested_milestone_id DEVE ser null ou um dos UUIDs em allowed_milestone_ids. Nunca use outro id.
- Se allowed_milestone_ids tiver um único elemento, só pode sugerir esse ou null.
- Seja conservador: prefira null se os dados forem fracos.`;

function allowedMilestoneIds(
  milestones: { id: string; position: number }[],
  currentMilestoneId: string | null
): string[] {
  const sorted = [...milestones].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return [];
  if (!currentMilestoneId) {
    return [sorted[0].id];
  }
  const idx = sorted.findIndex((m) => m.id === currentMilestoneId);
  if (idx < 0) {
    return [sorted[0].id];
  }
  const next = sorted[idx + 1];
  return next ? [sorted[idx].id, next.id] : [sorted[idx].id];
}

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
    .select("id, current_milestone_id")
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

  const allowedIds = allowedMilestoneIds(msList, sj.current_milestone_id);

  const { data: dlist } = await admin
    .from("diaries")
    .select("id")
    .eq("professor_id", professorId);
  const diaryIds = dlist?.map((d) => d.id) ?? [];
  if (!diaryIds.length) return;

  const { data: scored } = await admin
    .from("diary_students")
    .select(
      "comprehension_score, attention_score, engagement_score, absent, created_at, diary_id, note, ai_student_summary"
    )
    .eq("student_id", studentId)
    .in("diary_id", diaryIds)
    .eq("absent", false)
    .not("comprehension_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(JOURNEY_SUGGESTION_WINDOW);

  const validList = scored ?? [];
  if (validList.length < MIN_VALID_DIARIES) {
    return;
  }

  const { data: recentRich } = await admin
    .from("diary_students")
    .select("note, ai_student_summary, created_at, absent")
    .eq("student_id", studentId)
    .in("diary_id", diaryIds)
    .order("created_at", { ascending: false })
    .limit(12);

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
    current_milestone_id: sj.current_milestone_id,
    allowed_milestone_ids: allowedIds,
    milestones: msList,
    recent_diary_scores: validList,
    teacher_notes_and_summaries: (recentRich ?? []).map((r) => ({
      note: r.note,
      ai_student_summary: r.ai_student_summary,
      absent: r.absent,
      created_at: r.created_at,
    })),
    student_progress: progress ?? null,
    valid_diary_sample_size: validList.length,
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
      suggested_milestone_id?: string | null;
      confidence?: number;
      reasoning?: string;
    };

    let suggestedId =
      typeof parsed.suggested_milestone_id === "string"
        ? parsed.suggested_milestone_id.trim()
        : parsed.suggested_milestone_id === null
          ? ""
          : "";

    if (suggestedId && !allowedIds.includes(suggestedId)) {
      suggestedId = "";
    }

    const inTok = msg.usage?.input_tokens ?? 0;
    const outTok = msg.usage?.output_tokens ?? 0;
    const cost = Math.max(
      1,
      Math.round(estimateCostCents(MODEL_HAIKU, inTok, outTok))
    );

    if (suggestedId) {
      const note =
        parsed.reasoning?.trim() ||
        `Confiança ${((parsed.confidence ?? 0) * 100).toFixed(0)}%`;
      await admin
        .from("student_journeys")
        .update({
          ai_suggested_milestone_id: suggestedId,
          ai_suggestion_note: note,
          ai_suggestion_confidence: parsed.confidence ?? null,
          ai_suggested_at: new Date().toISOString(),
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
          last_error: "Sem sugestão válida ou modelo retornou null",
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
