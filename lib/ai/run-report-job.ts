import Anthropic from "@anthropic-ai/sdk";
import { randomBytes } from "crypto";
import { MODEL_SONNET, PROMPT_REPORT } from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const system = `Gere relatórios de progresso de alunos em português. Responda APENAS JSON:
{"title":"string","body_markdown":"string","attention_trend":"improving"|"declining"|"stable"|"insufficient_data","highlights":["até 3"],"suggestions":["até 3"]}
Tom profissional e caloroso. Sem tabelas no markdown — parágrafos. Máximo ~400 palavras no body_markdown.`;

export async function processOneReportJob(jobId: string): Promise<boolean> {
  const admin = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;

  const { data: job, error } = await admin
    .from("ai_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("type", "report")
    .eq("status", "pending")
    .maybeSingle();
  if (error || !job) return false;

  const payload = job.payload as {
    student_id?: string;
    period_start?: string;
    period_end?: string;
  };
  const studentId = payload.student_id;
  const professorId = job.professor_id;
  if (!studentId || !professorId) return false;

  await admin
    .from("ai_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const start = payload.period_start ?? "1970-01-01";
  const end = payload.period_end ?? "2099-12-31";

  const { data: drows } = await admin
    .from("diaries")
    .select("id, content, ai_summary, lesson_type, created_at")
    .eq("professor_id", professorId)
    .gte("created_at", `${start}T00:00:00.000Z`)
    .lte("created_at", `${end}T23:59:59.999Z`);

  const diaryIds = drows?.map((d) => d.id) ?? [];
  const { data: srows } = diaryIds.length
    ? await admin
        .from("diary_students")
        .select("*")
        .eq("student_id", studentId)
        .in("diary_id", diaryIds)
    : { data: [] };

  const context = { diaries: drows ?? [], entries: srows ?? [] };

  const anthropic = new Anthropic({ apiKey });
  try {
    const msg = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: "user",
          content: `Aluno ${studentId}. Período ${start} a ${end}.\nDados:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as {
      title?: string;
      body_markdown?: string;
      attention_trend?: string;
      highlights?: string[];
      suggestions?: string[];
    };
    const inTok = msg.usage?.input_tokens ?? 0;
    const outTok = msg.usage?.output_tokens ?? 0;
    const cost = Math.max(
      1,
      Math.round(estimateCostCents(MODEL_SONNET, inTok, outTok))
    );

    const shareToken = randomBytes(24).toString("hex");

    await admin.from("reports").insert({
      student_id: studentId,
      professor_id: professorId,
      content: parsed.body_markdown ?? "",
      title: parsed.title ?? "Relatório",
      attention_trend: parsed.attention_trend ?? null,
      highlights: parsed.highlights ?? [],
      suggestions: parsed.suggestions ?? [],
      period_start: start,
      period_end: end,
      share_token: shareToken,
    });

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
    return true;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        last_error: err,
        attempt_count: (job.attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return false;
  }
}

export async function pickPendingReportJob(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_jobs")
    .select("id")
    .eq("type", "report")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
