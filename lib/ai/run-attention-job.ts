import Anthropic from "@anthropic-ai/sdk";
import {
  ATTENTION_MIN_DIARIES,
  ATTENTION_WINDOW_MAX,
  MODEL_HAIKU,
  PROMPT_ATTENTION,
} from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const system = `Com base nos scores recentes do aluno, responda APENAS JSON:
{"attention_trend":"improving"|"declining"|"stable"|"insufficient_data","confidence":0.0-1.0,"note":"diagnóstico interno curto"}`;

export async function runAttentionForStudent(
  studentId: string,
  professorId: string
): Promise<void> {
  const admin = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  const { data: dlist } = await admin
    .from("diaries")
    .select("id")
    .eq("professor_id", professorId);

  const allIds = dlist?.map((d) => d.id) ?? [];
  if (!allIds.length) return;

  const { data: scored } = await admin
    .from("diary_students")
    .select(
      "comprehension_score, attention_score, engagement_score, absent, created_at, diary_id"
    )
    .eq("student_id", studentId)
    .in("diary_id", allIds)
    .not("comprehension_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(ATTENTION_WINDOW_MAX);

  const list = scored ?? [];
  if (list.length < ATTENTION_MIN_DIARIES) {
    await admin
      .from("student_progress")
      .upsert(
        {
          student_id: studentId,
          professor_id: professorId,
          attention_trend: "insufficient_data",
          attention_confidence: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );
    return;
  }

  const idempotencyKey = `attention_check:${studentId}:${new Date().toISOString().slice(0, 10)}`;
  const anthropic = new Anthropic({ apiKey });

  const { data: jobIns } = await admin
    .from("ai_jobs")
    .insert({
      professor_id: professorId,
      type: "attention_check",
      status: "processing",
      payload: { student_id: studentId },
      model: MODEL_HAIKU,
      prompt_version: PROMPT_ATTENTION,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  const jobId = jobIns?.id;

  try {
    const msg = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 512,
      system,
      messages: [
        {
          role: "user",
          content: `Últimos registros (JSON):\n${JSON.stringify(list)}`,
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as {
      attention_trend?: string;
      confidence?: number;
      note?: string;
    };
    const inTok = msg.usage?.input_tokens ?? 0;
    const outTok = msg.usage?.output_tokens ?? 0;
    const cost = Math.max(
      1,
      Math.round(estimateCostCents(MODEL_HAIKU, inTok, outTok))
    );

    await admin
      .from("student_progress")
      .upsert(
        {
          student_id: studentId,
          professor_id: professorId,
          attention_trend: parsed.attention_trend ?? "insufficient_data",
          attention_confidence: parsed.confidence ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (jobId) {
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
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    if (jobId) {
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
}
