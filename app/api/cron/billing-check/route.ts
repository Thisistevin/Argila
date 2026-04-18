import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";
import { retentionRunAfter } from "@/lib/billing/retention";

/** Marca past_due, processa cancelamentos ao fim do período e retention jobs. */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let markedPastDue = 0;
  let downgraded = 0;
  let retentionProcessed = 0;

  const { data: overdueRows } = await admin
    .from("subscriptions")
    .select("id")
    .in("status", ["active", "trialing"])
    .eq("source", "asaas")
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
        deletion_scheduled_for: runAfter,
      })
      .eq("id", r.id);
    await admin.from("retention_jobs").insert({
      professor_id: r.professor_id,
      job_type: "premium_cleanup",
      status: "scheduled",
      run_after: runAfter,
      reason: "downgrade_professor",
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
        await admin.from("reports").delete().eq("professor_id", job.professor_id);
        await admin.from("classes").delete().eq("professor_id", job.professor_id);
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
    downgraded,
    retentionProcessed,
  });
}
