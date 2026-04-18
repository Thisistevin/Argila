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

function pickPayment(body: Record<string, unknown>): Record<string, unknown> | null {
  const p = body.payment ?? body.data;
  if (p && typeof p === "object") return p as Record<string, unknown>;
  return null;
}

export function normalizeAsaasEvent(event: string): string {
  return event.trim().toUpperCase().replace(/\./g, "_");
}

export async function handleAsaasPaymentReceived(
  admin: SupabaseClient,
  body: Record<string, unknown>
): Promise<void> {
  const payment = pickPayment(body);
  if (!payment) return;
  const paymentId = String(payment.id ?? "");
  const customerId = String(payment.customer ?? "");
  const externalRef = String(payment.externalReference ?? "");
  if (!paymentId || !customerId) return;

  let session: CheckoutSessionRow | null = null;

  if (paymentId) {
    const { data: byPay } = await admin
      .from("checkout_sessions")
      .select("id, professor_id, billing_cycle, trial_days_applied, coupon_code, promotion_source")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();
    if (byPay) session = byPay as CheckoutSessionRow;
  }
  if (!session && externalRef) {
    const { data: byExt } = await admin
      .from("checkout_sessions")
      .select("id, professor_id, billing_cycle, trial_days_applied, coupon_code, promotion_source")
      .eq("id", externalRef)
      .maybeSingle();
    if (byExt) session = byExt as CheckoutSessionRow;
  }
  if (!session) {
    const { data: bySub } = await admin
      .from("checkout_sessions")
      .select("id, professor_id, billing_cycle, trial_days_applied, coupon_code, promotion_source")
      .eq("asaas_subscription_id", String(payment.subscription ?? ""))
      .maybeSingle();
    if (bySub) session = bySub as CheckoutSessionRow;
  }

  const professorId =
    session?.professor_id ??
    (
      await admin
        .from("profiles")
        .select("id")
        .eq("asaas_customer_id", customerId)
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
        provider_payload: payment as unknown as Record<string, unknown>,
        updated_at: now.toISOString(),
      })
      .eq("id", session.id);

    await admin
      .from("billing_transactions")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        provider_payload: body as unknown as Record<string, unknown>,
        provider_event: "PAYMENT_RECEIVED",
        updated_at: now.toISOString(),
      })
      .eq("asaas_payment_id", paymentId);

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
      source: "asaas",
      last_payment_at: now.toISOString(),
      provider_payload: payment as unknown as Record<string, unknown>,
      cancel_at_period_end: false,
      cancel_requested_at: null,
    })
    .eq("professor_id", professorId);
}

export async function handleAsaasPaymentOverdue(
  admin: SupabaseClient,
  body: Record<string, unknown>
): Promise<void> {
  const payment = pickPayment(body);
  if (!payment) return;
  const paymentId = String(payment.id ?? "");
  const customerId = String(payment.customer ?? "");
  if (!customerId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("asaas_customer_id", customerId)
    .maybeSingle();
  const professorId = profile?.id as string | undefined;
  if (!professorId) return;

  await admin
    .from("subscriptions")
    .update({
      status: "past_due",
      provider_payload: payment as unknown as Record<string, unknown>,
    })
    .eq("professor_id", professorId)
    .eq("source", "asaas");

  if (paymentId) {
    await admin
      .from("billing_transactions")
      .update({
        status: "overdue",
        provider_payload: body as unknown as Record<string, unknown>,
        provider_event: "PAYMENT_OVERDUE",
        updated_at: new Date().toISOString(),
      })
      .eq("asaas_payment_id", paymentId);
  }

  await insertBillingFunnelEvent(admin, {
    professorId,
    checkoutSessionId: null,
    eventName: "payment_overdue",
  });
}

export function isPaymentReceivedEvent(normalized: string): boolean {
  return (
    normalized.includes("RECEIVED") ||
    normalized.includes("CONFIRMED") ||
    normalized.includes("PAYMENT_RECEIVED")
  );
}

export function isPaymentOverdueEvent(normalized: string): boolean {
  return normalized.includes("OVERDUE");
}

