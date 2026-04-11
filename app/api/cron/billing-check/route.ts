import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";

/** Marca past_due assinaturas pagas vencidas (ignora explorar / system / free). */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: rows } = await admin
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .neq("source", "system")
    .neq("billing_cycle", "free")
    .lt("period_end", now);

  for (const r of rows ?? []) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("id", r.id);
  }
  return NextResponse.json({ ok: true, marked: rows?.length ?? 0 });
}
