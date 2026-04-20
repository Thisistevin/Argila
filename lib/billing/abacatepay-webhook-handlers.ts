import type { SupabaseClient } from "@supabase/supabase-js";
import {
  periodEndAfterPayment,
  periodEndAfterTrial,
  type ProfessorBillingCycle,
} from "@/lib/billing/pricing";
import { insertBillingFunnelEvent } from "@/lib/billing/events";

type CheckoutSessionRow = {
  id: string;
  professor_id: string;
  billing_cycle: ProfessorBillingCycle;
  trial_days_applied: number;
  coupon_code: string | null;
  promotion_source: string | null;
};

function extractData(body: Record<string, unknown>): Record<string, unknown> {
  const d = body.data;
  if (d && typeof d === "object") return d as Record<string, unknown>;
  return {};
}

function pickRecord(
  source: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const value = source[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickCheckoutLike(data: Record<string, unknown>): Record<string, unknown> {
  return (
    pickRecord(data, "checkout") ??
    pickRecord(data, "billing") ??
    data
  );
}

function pickCustomerId(data: Record<string, unknown>): string {
  const customer = pickRecord(data, "customer");
  const checkout = pickCheckoutLike(data);
  return String(
    customer?.id ??
      checkout.customerId ??
      data.customerId ??
      ""
  );
}

// ---------------------------------------------------------------------------
// Classificadores de eventos
// ---------------------------------------------------------------------------

export function isCheckoutCompletedEvent(event: string): boolean {
  return event === "checkout.completed";
}

export function isSubscriptionRenewedEvent(event: string): boolean {
  return event === "subscription.renewed";
}

export function isSubscriptionCancelledEvent(event: string): boolean {
  return event === "subscription.cancelled";
}

// ---------------------------------------------------------------------------
// checkout.completed — pagamento inicial confirmado
// ---------------------------------------------------------------------------

export async function handleAbacateCheckoutCompleted(
  admin: SupabaseClient,
  body: Record<string, unknown>
): Promise<void> {
  const data = extractData(body);
  const checkout = pickCheckoutLike(data);
  const billingId = String(checkout.id ?? "");
  const externalId = String(checkout.externalId ?? "");
  const customerId = pickCustomerId(data);
  if (!billingId) return;

  let session: CheckoutSessionRow | null = null;

  // 1. Buscar sessão pelo billing ID salvo no checkout
  if (billingId) {
    const { data: byBilling } = await admin
      .from("checkout_sessions")
      .select(
        "id, professor_id, billing_cycle, trial_days_applied, coupon_code, promotion_source"
      )
      .eq("abacatepay_billing_id", billingId)
      .maybeSingle();
    if (byBilling) session = byBilling as CheckoutSessionRow;
  }

  // 2. Buscar sessão pelo externalId (nosso UUID de sessão)
  if (!session && externalId) {
    const { data: byExt } = await admin
      .from("checkout_sessions")
      .select(
        "id, professor_id, billing_cycle, trial_days_applied, coupon_code, promotion_source"
      )
      .eq("id", externalId)
      .maybeSingle();
    if (byExt) session = byExt as CheckoutSessionRow;
  }

  // 3. Fallback: identificar professor pelo customer ID
  const professorId =
    session?.professor_id ??
    (
      await admin
        .from("profiles")
        .select("id")
        .eq("abacate_customer_id", customerId)
        .maybeSingle()
    ).data?.id;

  if (!professorId) return;

  const billingCycle = (session?.billing_cycle ?? "monthly") as ProfessorBillingCycle;
  const trialDays = session?.trial_days_applied ?? 0;
  const now = new Date();
  const periodStart = now;
  const periodEnd =
    trialDays > 0
      ? periodEndAfterTrial(now, trialDays, billingCycle)
      : periodEndAfterPayment(now, billingCycle);
  const status = trialDays > 0 ? "trialing" : "active";

  if (session?.id) {
    await admin
      .from("checkout_sessions")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        provider_payload: data as unknown as Record<string, unknown>,
        updated_at: now.toISOString(),
      })
      .eq("id", session.id);

    await admin
      .from("billing_transactions")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        provider_payload: body as unknown as Record<string, unknown>,
        provider_event: "checkout.completed",
        updated_at: now.toISOString(),
      })
      .eq("abacatepay_billing_id", billingId);

    // Registrar resgate de cupom se aplicável
    if (session.coupon_code) {
      const { data: coup } = await admin
        .from("coupons")
        .select("id, redemptions_count, benefit_type, benefit_value")
        .ilike("code", session.coupon_code)
        .maybeSingle();
      if (coup?.id) {
        await admin
          .from("coupons")
          .update({
            redemptions_count: (coup.redemptions_count ?? 0) + 1,
            updated_at: now.toISOString(),
          })
          .eq("id", coup.id);
        await admin.from("coupon_redemptions").insert({
          coupon_id: coup.id,
          professor_id: professorId,
          checkout_session_id: session.id,
          code_snapshot: session.coupon_code,
          benefit_type_snapshot: coup.benefit_type,
          benefit_value_snapshot: coup.benefit_value,
        });
      }
    }

    await insertBillingFunnelEvent(admin, {
      professorId,
      checkoutSessionId: session.id,
      eventName: "payment_confirmed",
      billingCycle,
    });
  }

  await admin
    .from("subscriptions")
    .update({
      plan: "professor",
      billing_cycle: billingCycle,
      status,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      source: "abacatepay",
      last_payment_at: now.toISOString(),
      provider_payload: data as unknown as Record<string, unknown>,
      cancel_at_period_end: false,
      cancel_requested_at: null,
    })
    .eq("professor_id", professorId);
}

// ---------------------------------------------------------------------------
// subscription.renewed — renovação automática
// ---------------------------------------------------------------------------

export async function handleAbacateSubscriptionRenewed(
  admin: SupabaseClient,
  body: Record<string, unknown>
): Promise<void> {
  const data = extractData(body);
  const customerId = pickCustomerId(data);
  if (!customerId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("abacate_customer_id", customerId)
    .maybeSingle();
  const professorId = profile?.id as string | undefined;
  if (!professorId) return;

  // Buscar assinatura ativa para saber o ciclo
  const { data: sub } = await admin
    .from("subscriptions")
    .select("billing_cycle, period_end")
    .eq("professor_id", professorId)
    .eq("source", "abacatepay")
    .maybeSingle();

  const billingCycle = ((sub?.billing_cycle as ProfessorBillingCycle) ?? "monthly");
  const now = new Date();
  const periodEnd = periodEndAfterPayment(now, billingCycle);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      last_payment_at: now.toISOString(),
      provider_payload: data as unknown as Record<string, unknown>,
      cancel_at_period_end: false,
    })
    .eq("professor_id", professorId)
    .eq("source", "abacatepay");

  const payment = pickRecord(data, "payment");
  const checkout = pickCheckoutLike(data);
  await admin.from("billing_transactions").insert({
    professor_id: professorId,
    billing_cycle: billingCycle,
    payment_method:
      Array.isArray(checkout.methods) && checkout.methods.includes("CARD")
        ? "card"
        : "pix",
    status: "paid",
    amount_cents: Number(payment?.amount ?? checkout.amount ?? data.amount ?? 0),
    paid_at: now.toISOString(),
    abacatepay_customer_id: customerId,
    abacatepay_billing_id: String(payment?.id ?? checkout.id ?? data.id ?? ""),
    provider_event: "subscription.renewed",
    provider_payload: body as unknown as Record<string, unknown>,
  });

  await insertBillingFunnelEvent(admin, {
    professorId,
    eventName: "payment_confirmed",
    billingCycle,
  });
}

// ---------------------------------------------------------------------------
// subscription.cancelled — cancelamento via Abacatepay
// ---------------------------------------------------------------------------

export async function handleAbacateSubscriptionCancelled(
  admin: SupabaseClient,
  body: Record<string, unknown>
): Promise<void> {
  const data = extractData(body);
  const customerId = pickCustomerId(data);
  if (!customerId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("abacate_customer_id", customerId)
    .maybeSingle();
  const professorId = profile?.id as string | undefined;
  if (!professorId) return;

  await admin
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      cancel_requested_at: new Date().toISOString(),
    })
    .eq("professor_id", professorId)
    .eq("source", "abacatepay")
    .in("status", ["active", "trialing"]);
}
