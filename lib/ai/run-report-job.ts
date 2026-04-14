import Anthropic from "@anthropic-ai/sdk";
import { MODEL_SONNET, PROMPT_REPORT } from "@/lib/ai/config";
import { estimateCostCents } from "@/lib/ai/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const system = `Gere relatórios de progresso de alunos em português.
Responda APENAS JSON válido:
{
  "title": "string",
  "body_markdown": "string",
  "attention_trend": "improving"|"declining"|"stable"|"insufficient_data",
  "highlights": ["até 3 strings"],
  "suggestions": ["até 3 strings"]
}

Tom profissional e caloroso. Sem tabelas no markdown — use parágrafos.
Máximo ~400 palavras no body_markdown.

Se generation.mode for "directed", focar no aspecto indicado em generation.focus.
Se generation.teacher_guidance existir, seguir as orientações do professor.
Considerar relatórios anteriores (highlights/suggestions) para mostrar evolução, sem repetir conteúdo.`;

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
    report_id?: string;
  };
  const studentId = payload.student_id;
  const professorId = job.professor_id;
  const reportId = payload.report_id;

  if (!studentId || !professorId || !reportId) {
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        last_error: "payload incompleto (student_id / report_id)",
        attempt_count: (job.attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return false;
  }

  const { data: reportRow, error: repErr } = await admin
    .from("reports")
    .select(
      "id, status, generation_mode, generation_focus, teacher_guidance, student_id, professor_id"
    )
    .eq("id", reportId)
    .maybeSingle();

  if (
    repErr ||
    !reportRow ||
    reportRow.status !== "generating" ||
    reportRow.student_id !== studentId ||
    reportRow.professor_id !== professorId
  ) {
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        last_error: "report inválido ou não está em geração",
        attempt_count: (job.attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return false;
  }

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
        .select(
          "diary_id, absent, comprehension_score, attention_score, engagement_score, note, created_at"
        )
        .eq("student_id", studentId)
        .in("diary_id", diaryIds)
    : { data: [] };

  const studentDiaryIds = new Set((srows ?? []).map((s) => s.diary_id));
  const diariesFiltered = (drows ?? []).filter((d) => studentDiaryIds.has(d.id));

  const diaries = diariesFiltered.map((d) => ({
    date: d.created_at,
    content: d.content,
    summary: d.ai_summary,
    lesson_type: d.lesson_type,
  }));

  const student_entries = (srows ?? []).map((e) => ({
    date: e.created_at,
    absent: e.absent,
    comprehension_score: e.comprehension_score,
    attention_score: e.attention_score,
    engagement_score: e.engagement_score,
    note: e.note,
  }));

  const { data: progress } = await admin
    .from("student_progress")
    .select(
      "overall_score, attention_trend, attention_confidence, short_note"
    )
    .eq("student_id", studentId)
    .eq("professor_id", professorId)
    .maybeSingle();

  const current_progress = {
    overall_score: progress?.overall_score ?? null,
    attention_trend: progress?.attention_trend ?? null,
    attention_confidence: progress?.attention_confidence ?? null,
    short_note: progress?.short_note ?? null,
  };

  const { data: prevRows } = await admin
    .from("reports")
    .select("period_start, period_end, title, highlights, suggestions, attention_trend")
    .eq("student_id", studentId)
    .eq("professor_id", professorId)
    .neq("id", reportId)
    .in("status", ["published", "ready"])
    .order("created_at", { ascending: false })
    .limit(3);

  const previous_reports = (prevRows ?? []).map((r) => ({
    period: `${r.period_start} a ${r.period_end}`,
    title: r.title,
    highlights: r.highlights,
    suggestions: r.suggestions,
    attention_trend: r.attention_trend,
  }));

  const generation = {
    mode: reportRow.generation_mode ?? "automatic",
    focus: reportRow.generation_focus,
    teacher_guidance: reportRow.teacher_guidance,
  };

  const context = {
    diaries,
    student_entries,
    current_progress,
    previous_reports,
    generation,
  };

  const anthropic = new Anthropic({ apiKey });
  try {
    const msg = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: "user",
          content: `Aluno (id interno) ${studentId}. Período ${start} a ${end}.\nDados:\n${JSON.stringify(context, null, 2)}`,
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

    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.slice(0, 3)
      : [];
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3)
      : [];

    const { error: repUpdErr } = await admin
      .from("reports")
      .update({
        content: parsed.body_markdown ?? "",
        title: parsed.title ?? "Relatório",
        attention_trend: parsed.attention_trend ?? null,
        highlights,
        suggestions,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (repUpdErr) throw new Error(`reports update failed: ${repUpdErr.message}`);

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
    await admin
      .from("reports")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);
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
