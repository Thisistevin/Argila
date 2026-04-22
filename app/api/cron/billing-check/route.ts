import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";
import { insertBillingFunnelEvent } from "@/lib/billing/events";
import { retentionRunAfter } from "@/lib/billing/retention";

async function deleteByProfessor(
  admin: SupabaseClient,
  table: string,
  professorId: string
) {
  const { error } = await admin
    .from(table)
    .delete()
    .eq("professor_id", professorId);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function cleanupPremiumData(admin: SupabaseClient, professorId: string) {
  const { data: journeys, error: journeysErr } = await admin
    .from("journeys")
    .select("id")
    .eq("professor_id", professorId);
  if (journeysErr) throw new Error(`journeys select: ${journeysErr.message}`);

  const journeyIds = (journeys ?? [])
    .map((j) => j.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (journeyIds.length > 0) {
    const { error: sjErr } = await admin
      .from("student_journeys")
      .delete()
      .in("journey_id", journeyIds);
    if (sjErr) throw new Error(`student_journeys: ${sjErr.message}`);

    const { error: msErr } = await admin
      .from("milestones")
      .delete()
      .in("journey_id", journeyIds);
    if (msErr) throw new Error(`milestones: ${msErr.message}`);
  }

  await deleteByProfessor(admin, "journeys", professorId);
  await deleteByProfessor(admin, "reports", professorId);
  await deleteByProfessor(admin, "classes", professorId);
  await deleteByProfessor(admin, "student_progress", professorId);
}

/** Marca past_due, processa cancelamentos ao fim do período e retention jobs. */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let markedPastDue = 0;
  let trialExpired = 0;
  let downgraded = 0;
  let retentionProcessed = 0;

  const { data: overdueRows } = await admin
    .from("subscriptions")
    .select("id")
    .in("status", ["active", "trialing"])
    .in("source", ["asaas", "abacatepay"])
    .neq("billing_cycle", "free")
    .lt("period_end", nowIso)
    .eq("cancel_at_period_end", false);

  for (const r of overdueRows ?? []) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("id", r.id);
    markedPastDue += 1;
  }

  const { data: trialEndRows } = await admin
    .from("subscriptions")
    .select("id, professor_id")
    .eq("plan", "professor")
    .eq("status", "trialing")
    .eq("source", "system")
    .lt("period_end", nowIso);

  for (const r of trialEndRows ?? []) {
    await admin
      .from("subscriptions")
      .update({
        status: "trial_expired",
        trial_ended_at: nowIso,
      })
      .eq("id", r.id);
    await insertBillingFunnelEvent(admin, {
      professorId: r.professor_id as string,
      eventName: "trial_expired",
      metadata: { source: "cron" },
    });
    trialExpired += 1;
  }

  const { data: cancelEnd } = await admin
    .from("subscriptions")
    .select("id, professor_id")
    .eq("plan", "professor")
    .in("status", ["active", "trialing"])
    .eq("cancel_at_period_end", true)
    .lt("period_end", nowIso);

  for (const r of cancelEnd ?? []) {
    const runAfter = retentionRunAfter(new Date(), 90).toISOString();
    await admin
      .from("subscriptions")
      .update({
        plan: "explorar",
        billing_cycle: "free",
        status: "active",
        source: "system",
        cancel_at_period_end: false,
        canceled_at: nowIso,
        downgraded_at: nowIso,
        downgrade_reason: "cancel_at_period_end",
        deletion_scheduled_for: runAfter,
      })
      .eq("id", r.id);
    await admin.from("retention_jobs").insert({
      professor_id: r.professor_id,
      job_type: "premium_cleanup",
      status: "scheduled",
      run_after: runAfter,
      reason: "cancel_at_period_end",
    });
    downgraded += 1;
  }

  const { data: jobs } = await admin
    .from("retention_jobs")
    .select("id, professor_id, job_type")
    .eq("status", "scheduled")
    .lte("run_after", nowIso);

  for (const job of jobs ?? []) {
    await admin
      .from("retention_jobs")
      .update({ status: "processing", updated_at: nowIso })
      .eq("id", job.id);
    try {
      if (job.job_type === "premium_cleanup") {
        await cleanupPremiumData(admin, job.professor_id);
      } else if (job.job_type === "account_delete") {
        await admin.auth.admin.deleteUser(job.professor_id);
      }
      await admin
        .from("retention_jobs")
        .update({ status: "done", updated_at: nowIso })
        .eq("id", job.id);
      retentionProcessed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("retention_jobs")
        .update({
          status: "failed",
          last_error: msg,
          updated_at: nowIso,
        })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({
    ok: true,
    markedPastDue,
    trialExpired,
    downgraded,
    retentionProcessed,
  });
}
