import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingFunnelEventName =
  | "view_plan"
  | "select_cycle"
  | "start_checkout"
  | "apply_coupon"
  | "submit_payment"
  | "checkout_awaiting_payment"
  | "payment_confirmed"
  | "payment_overdue"
  | "cancel_subscription"
  | "regularize_payment_clicked";

export async function insertBillingFunnelEvent(
  supabase: SupabaseClient,
  params: {
    professorId: string;
    checkoutSessionId?: string | null;
    eventName: BillingFunnelEventName;
    entrypoint?: string | null;
    billingCycle?: string | null;
    paymentMethod?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await supabase.from("billing_funnel_events").insert({
    professor_id: params.professorId,
    checkout_session_id: params.checkoutSessionId ?? null,
    event_name: params.eventName,
    entrypoint: params.entrypoint ?? null,
    billing_cycle: params.billingCycle ?? null,
    payment_method: params.paymentMethod ?? null,
    metadata: params.metadata ?? null,
  });
  if (error) {
    console.error("insertBillingFunnelEvent", error);
  }
}
