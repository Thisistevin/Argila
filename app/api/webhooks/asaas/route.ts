import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Asaas — validar com ASAAS_WEBHOOK_SECRET (header ou token do provedor).
 * Eventos: payment.received, payment.overdue (nomes podem variar — normalizar no corpo).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ASAAS_WEBHOOK_SECRET;
  const token =
    request.headers.get("asaas-access-token") ??
    request.headers.get("x-asaas-token");
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = String(body.event ?? body.type ?? "");
  const admin = createAdminClient();
  const payment = (body.payment ?? body.data) as Record<string, unknown> | undefined;
  const customerId = String(
    payment?.customer ?? (body.customer as string) ?? ""
  );

  if (!customerId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("asaas_customer_id", customerId)
    .maybeSingle();

  const professorId = profile?.id as string | undefined;
  if (!professorId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  if (event.includes("received") || event.includes("CONFIRMED")) {
    await admin
      .from("subscriptions")
      .update({
        plan: "professor",
        billing_cycle: "monthly",
        status: "active",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        source: "asaas",
      })
      .eq("professor_id", professorId);
  }

  if (event.includes("overdue") || event.includes("OVERDUE")) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("professor_id", professorId)
      .eq("source", "asaas");
  }

  return NextResponse.json({ ok: true });
}
