import Anthropic from "@anthropic-ai/sdk";
import { MODEL_HAIKU, PROMPT_DIARY_SCORING } from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const scoringSystem = `Você avalia o desempenho dos alunos em uma aula já registrada.
Responda APENAS um JSON válido no formato:
{"students":[{"diary_student_id":"uuid","student_id":"uuid","comprehension_score":0-10,"engagement_score":0-10,"attention_score":0-10,"flags":[],"short_note":"frase curta"}]}
Use os IDs exatos fornecidos no contexto. flags é array de strings (pode ser vazio).`;

export async function runDiaryScoringJob(
  diaryId: string,
  professorId: string
): Promise<void> {
  const admin = createAdminClient();
  const idempotencyKey = `diary_scoring:${diaryId}`;

  const { data: dup } = await admin
    .from("ai_jobs")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (dup?.status === "done") return;

  const { data: diary, error: de } = await admin
    .from("diaries")
    .select("id, content, lesson_type, professor_id")
    .eq("id", diaryId)
    .eq("professor_id", professorId)
    .single();
  if (de || !diary) return;

  const { data: dsRows, error: dse } = await admin
    .from("diary_students")
    .select(
      "id, student_id, absent, teacher_comprehension_rating, teacher_attention_rating, teacher_engagement_rating"
    )
    .eq("diary_id", diaryId);
  if (dse || !dsRows?.length) return;

  const activeRows = dsRows.filter((r) => !r.absent);
  if (activeRows.length === 0) return;

  const presentRows = activeRows;
  const allPresentHaveTeacherRatings =
    presentRows.length > 0 &&
    presentRows.every(
      (r) =>
        r.teacher_comprehension_rating != null &&
        r.teacher_attention_rating != null &&
        r.teacher_engagement_rating != null
    );
  if (allPresentHaveTeacherRatings) {
    return;
  }

  const studentLines = activeRows
    .map(
      (r) =>
        `diary_student_id=${r.id}, student_id=${r.student_id}, absent=${r.absent ?? false}`
    )
    .join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY ausente — diary_scoring ignorado");
    return;
  }

  const { data: jobRow } = await admin
    .from("ai_jobs")
    .upsert(
      {
        professor_id: professorId,
        type: "diary_scoring",
        status: "processing",
        payload: { diary_id: diaryId },
        model: MODEL_HAIKU,
        prompt_version: PROMPT_DIARY_SCORING,
        attempt_count: 1,
        idempotency_key: idempotencyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    )
    .select("id")
    .single();

  const jobId = jobRow?.id ?? dup?.id;
  if (!jobId) return;

  const anthropic = new Anthropic({ apiKey });
  try {
    const msg = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 2048,
      system: scoringSystem,
      messages: [
        {
          role: "user",
          content: `Conteúdo da aula:\n${diary.content}\nTipo: ${diary.lesson_type ?? "mixed"}\nAlunos:\n${studentLines}\nGere scores para cada linha.`,
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as {
      students?: Array<{
        diary_student_id: string;
        student_id: string;
        comprehension_score: number;
        engagement_score: number;
        attention_score: number;
        flags?: string[];
        short_note?: string;
      }>;
    };
    const inTok = msg.usage?.input_tokens ?? 0;
    const outTok = msg.usage?.output_tokens ?? 0;
    const cost = Math.max(
      1,
      Math.round(estimateCostCents(MODEL_HAIKU, inTok, outTok))
    );

    for (const s of parsed.students ?? []) {
      const { error: updErr } = await admin
        .from("diary_students")
        .update({
          comprehension_score: s.comprehension_score,
          engagement_score: s.engagement_score,
          attention_score: s.attention_score,
        })
        .eq("id", s.diary_student_id)
        .eq("diary_id", diaryId);
      if (updErr) throw new Error(`diary_students update failed: ${updErr.message}`);

      const overall =
        (s.comprehension_score + s.engagement_score + s.attention_score) / 3;
      const { error: upsErr } = await admin.from("student_progress").upsert(
        {
          student_id: s.student_id,
          professor_id: professorId,
          overall_score: overall,
          short_note: s.short_note ?? null,
          last_diary_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );
      if (upsErr) throw new Error(`student_progress upsert failed: ${upsErr.message}`);
    }

    await admin
      .from("ai_jobs")
      .update({
        status: "done",
        result: parsed as unknown as Record<string, unknown>,
        input_tokens: inTok,
        output_tokens: outTok,
        cost_cents: cost,
        attempt_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        last_error: err,
        attempt_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    console.error("diary_scoring", err);
  }
}
