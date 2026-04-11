import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Abacatepay — evento billing.paid (estrutura conforme doc / plano).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const sig = request.headers.get("x-webhook-signature");
  if (!secret || sig !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { billing?: { id?: string; status?: string; customer?: string } };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.event !== "billing.paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const customer = body.data?.billing?.customer;
  if (!customer) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("abacate_customer_id", customer)
    .maybeSingle();

  const professorId = profile?.id as string | undefined;
  if (!professorId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 12);

  await admin
    .from("subscriptions")
    .update({
      plan: "professor",
      billing_cycle: "annual",
      status: "active",
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      source: "abacatepay",
      abacate_bill_id: body.data?.billing?.id ?? null,
    })
    .eq("professor_id", professorId);

  return NextResponse.json({ ok: true });
}
