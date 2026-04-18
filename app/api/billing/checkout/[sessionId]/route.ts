import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("checkout_sessions")
    .select("status, paid_at, checkout_payload, professor_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !row || row.professor_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = row.checkout_payload as Record<string, unknown> | null;

  let redirectTo: string | null = null;
  if (row.status === "paid") {
    redirectTo = "/planos";
  }

  return NextResponse.json({
    status: row.status,
    paidAt: row.paid_at,
    awaitingPaymentPayload: payload,
    redirectTo,
  });
}
