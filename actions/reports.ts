"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
} from "@/lib/entitlement";
import { MODEL_SONNET, PROMPT_REPORT } from "@/lib/ai/config";
import {
  REPORT_FOCUS_OPTIONS,
  type ReportFocusOption,
} from "@/lib/reports/constants";

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayDateStrLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function assertReportEntitlement() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  if (!canUseReports(sub) || isPastDue(latest)) {
    redirect("/planos");
  }
  return { supabase, user };
}

export async function createReportDraft(formData: FormData) {
  const { supabase, user } = await assertReportEntitlement();

  const studentId = String(formData.get("student_id") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const generationModeRaw = String(formData.get("generation_mode") ?? "automatic").trim();
  const generationMode =
    generationModeRaw === "directed" ? "directed" : "automatic";
  const generationFocusRaw = String(
    formData.get("generation_focus") ?? ""
  ).trim();
  const teacherGuidance = String(
    formData.get("teacher_guidance") ?? ""
  ).trim();

  if (!studentId || !periodStart || !periodEnd) {
    redirect("/galeria");
  }

  if (periodStart > periodEnd) {
    redirect(`/aluno/${studentId}/relatorios/novo?err=period`);
  }

  const today = todayDateStrLocal();
  if (periodStart > today || periodEnd > today) {
    redirect(`/aluno/${studentId}/relatorios/novo?err=future`);
  }

  if (teacherGuidance.length > 500) {
    redirect(`/aluno/${studentId}/relatorios/novo?err=guidance`);
  }

  let generationFocus: string | null = null;
  if (generationMode === "directed") {
    if (
      !generationFocusRaw ||
      !REPORT_FOCUS_OPTIONS.includes(generationFocusRaw as ReportFocusOption)
    ) {
      redirect(`/aluno/${studentId}/relatorios/novo?err=focus`);
    }
    generationFocus = generationFocusRaw.slice(0, 100);
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("professor_id", user.id)
    .maybeSingle();
  if (!student) redirect("/galeria");

  const { data: existingGen } = await supabase
    .from("reports")
    .select("id")
    .eq("student_id", studentId)
    .eq("professor_id", user.id)
    .eq("status", "generating")
    .maybeSingle();

  if (existingGen?.id) {
    redirect(`/aluno/${studentId}/relatorios/${existingGen.id}`);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("reports")
    .insert({
      student_id: studentId,
      professor_id: user.id,
      content: null,
      title: null,
      period_start: periodStart,
      period_end: periodEnd,
      status: "generating",
      generation_mode: generationMode,
      generation_focus: generationFocus,
      teacher_guidance: teacherGuidance || null,
      share_token: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    redirect(`/aluno/${studentId}/relatorios/novo?err=insert`);
  }

  const reportId = inserted.id;
  const idempotencyKey = `report:${user.id}:${reportId}`;

  const { data: jobRow, error: jobErr } = await supabase
    .from("ai_jobs")
    .insert({
      professor_id: user.id,
      type: "report",
      status: "pending",
      payload: {
        student_id: studentId,
        period_start: periodStart,
        period_end: periodEnd,
        report_id: reportId,
      },
      model: MODEL_SONNET,
      prompt_version: PROMPT_REPORT,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (jobErr || !jobRow) {
    await supabase.from("reports").delete().eq("id", reportId);
    redirect(`/aluno/${studentId}/relatorios/novo?err=job`);
  }

  await supabase
    .from("reports")
    .update({
      source_job_id: jobRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath(`/aluno/${studentId}`);
  redirect(`/aluno/${studentId}/relatorios/${reportId}`);
}

export async function saveReportDraft(
  reportId: string,
  data: { title: string; content: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "auth" };

  const title = data.title.trim().slice(0, 200);
  const content = data.content;

  const { data: row } = await supabase
    .from("reports")
    .select("id, student_id, status")
    .eq("id", reportId)
    .eq("professor_id", user.id)
    .maybeSingle();

  if (!row || (row.status !== "ready" && row.status !== "published")) {
    return { ok: false as const, error: "state" };
  }

  const { error } = await supabase
    .from("reports")
    .update({
      title: title || "Relatório",
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("professor_id", user.id);

  if (error) return { ok: false as const, error: "db" };

  revalidatePath(`/aluno/${row.student_id}`);
  revalidatePath(`/aluno/${row.student_id}/relatorios/${reportId}`);
  return { ok: true as const };
}

export async function publishReport(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "auth" };

  const { data: row } = await supabase
    .from("reports")
    .select("id, student_id, status, share_token")
    .eq("id", reportId)
    .eq("professor_id", user.id)
    .maybeSingle();

  if (!row || (row.status !== "ready" && row.status !== "published")) {
    return { ok: false as const, error: "state" };
  }

  const shareToken = row.share_token ?? randomBytes(24).toString("hex");

  const { error } = await supabase
    .from("reports")
    .update({
      status: "published",
      share_token: shareToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("professor_id", user.id);

  if (error) return { ok: false as const, error: "db" };

  revalidatePath(`/aluno/${row.student_id}`);
  revalidatePath(`/aluno/${row.student_id}/relatorios/${reportId}`);
  return { ok: true as const, shareToken };
}

const DAILY_REPORT_LIMIT = 3;

export async function regenerateReport(reportId: string) {
  const { supabase, user } = await assertReportEntitlement();

  const { data: current } = await supabase
    .from("reports")
    .select(
      "id, student_id, status, period_start, period_end, generation_mode, generation_focus, teacher_guidance"
    )
    .eq("id", reportId)
    .eq("professor_id", user.id)
    .maybeSingle();

  if (!current || current.status !== "failed") {
    if (current?.student_id) {
      redirect(
        `/aluno/${current.student_id}/relatorios/${reportId}?err=regen`
      );
    }
    redirect("/galeria");
  }

  const studentId = current.student_id;

  const { count, error: cntErr } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("professor_id", user.id)
    .gte("created_at", startOfLocalDayIso());

  if (cntErr || (count ?? 0) >= DAILY_REPORT_LIMIT) {
    redirect(
      `/aluno/${studentId}/relatorios/${reportId}?err=limite_diario`
    );
  }

  const { data: existingGen } = await supabase
    .from("reports")
    .select("id")
    .eq("student_id", studentId)
    .eq("professor_id", user.id)
    .eq("status", "generating")
    .maybeSingle();

  if (existingGen?.id) {
    redirect(`/aluno/${studentId}/relatorios/${existingGen.id}`);
  }

  const mode =
    current.generation_mode === "directed" ||
    current.generation_mode === "automatic"
      ? current.generation_mode
      : "automatic";

  const { data: inserted, error: insErr } = await supabase
    .from("reports")
    .insert({
      student_id: studentId,
      professor_id: user.id,
      content: null,
      title: null,
      period_start: current.period_start,
      period_end: current.period_end,
      status: "generating",
      generation_mode: mode,
      generation_focus: current.generation_focus,
      teacher_guidance: current.teacher_guidance,
      share_token: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    redirect(`/aluno/${studentId}/relatorios/${reportId}?err=insert`);
  }

  const newReportId = inserted.id;
  const idempotencyKey = `report:${user.id}:${newReportId}`;

  const { data: jobRow, error: jobErr } = await supabase
    .from("ai_jobs")
    .insert({
      professor_id: user.id,
      type: "report",
      status: "pending",
      payload: {
        student_id: studentId,
        period_start: current.period_start,
        period_end: current.period_end,
        report_id: newReportId,
      },
      model: MODEL_SONNET,
      prompt_version: PROMPT_REPORT,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (jobErr || !jobRow) {
    await supabase.from("reports").delete().eq("id", newReportId);
    redirect(`/aluno/${studentId}/relatorios/${reportId}?err=job`);
  }

  await supabase
    .from("reports")
    .update({
      source_job_id: jobRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newReportId);

  revalidatePath(`/aluno/${studentId}`);
  redirect(`/aluno/${studentId}/relatorios/${newReportId}`);
}
