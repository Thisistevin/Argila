"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
} from "@/lib/entitlement";
import { MODEL_SONNET, PROMPT_REPORT } from "@/lib/ai/config";
import { randomUUID } from "crypto";

export async function enqueueReport(input: {
  studentId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  if (!canUseReports(sub) || isPastDue(latest)) return;

  const idempotencyKey = `report:${user.id}:${input.studentId}:${input.periodStart}:${input.periodEnd}:${randomUUID()}`;

  const { error } = await supabase.from("ai_jobs").insert({
    professor_id: user.id,
    type: "report",
    status: "pending",
    payload: {
      student_id: input.studentId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
    },
    model: MODEL_SONNET,
    prompt_version: PROMPT_REPORT,
    idempotency_key: idempotencyKey,
  });

  if (error) return;
  revalidatePath(`/aluno/${input.studentId}`);
}

export async function enqueueReportFromForm(formData: FormData) {
  const studentId = String(formData.get("student_id") ?? "");
  if (!studentId) return;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);
  await enqueueReport({
    studentId,
    periodStart,
    periodEnd,
  });
}

export async function updateReportContent(id: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("reports")
    .update({ content })
    .eq("id", id)
    .eq("professor_id", user.id);

  if (error) return;
  revalidatePath("/galeria");
}
