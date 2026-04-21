"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  abacateCreateCustomer,
  abacateCreateBilling,
  extractPixBase64,
  getAbacateBillingCustomerId,
} from "@/lib/billing/abacatepay";
import { validateCouponForCheckout } from "@/lib/billing/coupons";
import { insertBillingFunnelEvent } from "@/lib/billing/events";
import {
  baseAmountForProfessorCycle,
  computeCheckoutPricing,
  type CouponBenefit,
} from "@/lib/billing/pricing";
import { retentionRunAfter } from "@/lib/billing/retention";

const entrypointSchema = z.enum([
  "studio_plans",
  "landing_pricing_professor",
  "landing_cta",
]);

/** Persiste ID de cliente Abacatepay após criação. */
export async function linkAbacatepayCustomer(abacateCustomerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ abacate_customer_id: abacateCustomerId })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/planos");
  return { ok: true as const };
}

const previewSchema = z.object({
  billingCycle: z.enum(["monthly", "annual"]),
  couponCode: z.string().max(40).optional().nullable(),
  entrypoint: entrypointSchema,
});

export async function applyCouponPreview(raw: unknown) {
  const parsed = previewSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos" };
  }
  const { billingCycle, couponCode, entrypoint } = parsed.data;
  const supabase = await createClient();
  let couponBenefit: CouponBenefit | null = null;

  if (couponCode?.trim()) {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("coupons")
      .select("*")
      .ilike("code", couponCode.trim())
      .maybeSingle();
    const v = validateCouponForCheckout(row as never, billingCycle);
    if (!v.ok) return { ok: false as const, error: v.error };
    couponBenefit = v.benefit;
  }

  const landingTrial =
    entrypoint !== "studio_plans"
      ? await readLandingTrialConfig()
      : null;

  const pricing = computeCheckoutPricing({
    billingCycle,
    coupon: couponBenefit,
    landingTrial: couponBenefit ? null : landingTrial,
  });

  const {
    data: { user: previewUser },
  } = await supabase.auth.getUser();
  if (previewUser && couponBenefit && couponCode?.trim()) {
    await insertBillingFunnelEvent(supabase, {
      professorId: previewUser.id,
      eventName: "apply_coupon",
      entrypoint,
      billingCycle,
      metadata: { code: couponCode.trim().toUpperCase() },
    });
  }

  return { ok: true as const, pricing };
}

async function readLandingTrialConfig(): Promise<{
  enabled: boolean;
  trialDays: number;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "landing_professor_trial")
    .maybeSingle();
  const v = data?.value as { enabled?: boolean; trialDays?: number } | null;
  if (!v) return { enabled: true, trialDays: 14 };
  return {
    enabled: Boolean(v.enabled),
    trialDays: Number(v.trialDays ?? 14),
  };
}

const startCheckoutSchema = z.object({
  billingCycle: z.enum(["monthly", "annual"]),
  entrypoint: entrypointSchema,
  paymentMethod: z.enum(["pix", "card"]),
  fullName: z.string().min(2).max(200),
  country: z.string().default("BR"),
  state: z.string().length(2),
  cpfCnpj: z.string().min(11).max(18).optional().nullable(),
  couponCode: z.string().max(40).optional().nullable(),
});

export type StartCheckoutResult =
  | {
      ok: true;
      checkoutSessionId: string;
      redirectTo: string;
      externalRedirect?: boolean;
    }
  | { ok: false; error: string };

export async function startCheckout(raw: unknown): Promise<StartCheckoutResult> {
  const parsed = startCheckoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("abacate_customer_id, email, name")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado" };

  let couponBenefit: CouponBenefit | null = null;
  let couponRowCode: string | null = null;
  if (v.couponCode?.trim()) {
    const adminC = createAdminClient();
    const { data: row } = await adminC
      .from("coupons")
      .select("*")
      .ilike("code", v.couponCode.trim())
      .maybeSingle();
    const val = validateCouponForCheckout(row as never, v.billingCycle);
    if (!val.ok) return { ok: false, error: val.error };
    couponBenefit = val.benefit;
    couponRowCode = row?.code ?? v.couponCode.trim().toUpperCase();
  }

  const landingTrial =
    v.entrypoint !== "studio_plans" && !couponBenefit
      ? await readLandingTrialConfig()
      : null;

  const pricing = computeCheckoutPricing({
    billingCycle: v.billingCycle,
    coupon: couponBenefit,
    landingTrial: couponBenefit ? null : landingTrial,
  });

  const base = baseAmountForProfessorCycle(v.billingCycle);
  const { data: inserted, error: insErr } = await supabase
    .from("checkout_sessions")
    .insert({
      professor_id: user.id,
      plan: "professor",
      billing_cycle: v.billingCycle,
      entrypoint: v.entrypoint,
      payment_method: v.paymentMethod,
      status: "checkout_started",
      base_amount_cents: base,
      final_amount_cents: pricing.final_amount_cents,
      coupon_code: couponRowCode,
      promotion_source: pricing.promotion_source,
      discount_percent: pricing.discount_percent,
      extra_trial_days: pricing.extra_trial_days,
      trial_days_applied: pricing.trial_days_applied,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "Falha ao criar sessão" };
  }

  const sessionId = inserted.id as string;

  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    checkoutSessionId: sessionId,
    eventName: "start_checkout",
    entrypoint: v.entrypoint,
    billingCycle: v.billingCycle,
    paymentMethod: v.paymentMethod,
  });

  if (couponRowCode) {
    await insertBillingFunnelEvent(supabase, {
      professorId: user.id,
      checkoutSessionId: sessionId,
      eventName: "apply_coupon",
      entrypoint: v.entrypoint,
      billingCycle: v.billingCycle,
      paymentMethod: v.paymentMethod,
      metadata: { code: couponRowCode },
    });
  }

  const due = new Date();
  due.setDate(due.getDate() + 3);
  const dueStr = due.toISOString().slice(0, 10);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://studio.argila.app";

  const existingCustomerId = profile.abacate_customer_id as string | null;

  try {
    if (process.env.ABACATEPAY_API_KEY) {
      await insertBillingFunnelEvent(supabase, {
        professorId: user.id,
        checkoutSessionId: sessionId,
        eventName: "submit_payment",
        entrypoint: v.entrypoint,
        billingCycle: v.billingCycle,
        paymentMethod: v.paymentMethod,
      });

      // 1. Determinar produto pelo ciclo
      const isAnnual = v.billingCycle === "annual";
      const productExternalId = isAnnual ? "professor-annual" : "professor-monthly";
      const productName = isAnnual
        ? "Argila - Professor (Anual)"
        : "Argila - Professor";
      const methods: ("PIX" | "CARD")[] =
        v.paymentMethod === "pix" ? ["PIX"] : ["CARD"];

      // 2. Criar cliente v2 quando ainda não houver ID salvo no perfil.
      let abacateCustomerId = existingCustomerId;
      if (!abacateCustomerId) {
        abacateCustomerId = await abacateCreateCustomer({
          name: v.fullName,
          email: (profile.email as string) || user.email || "",
          taxId: v.cpfCnpj ? v.cpfCnpj.replace(/\D/g, "") : undefined,
          cellphone: "",
          country: "BR",
          metadata: {
            professorId: user.id,
          },
        });
        await supabase
          .from("profiles")
          .update({ abacate_customer_id: abacateCustomerId })
          .eq("id", user.id);
      }

      // 3. Criar checkout v2 — produtos são criados/reutilizados no cliente Abacatepay.
      const billing = await abacateCreateBilling({
        items: [
          {
            externalId: productExternalId,
            name: productName,
            quantity: 1,
            price: pricing.final_amount_cents,
            cycle: isAnnual ? "ANNUALLY" : "MONTHLY",
          },
        ],
        frequency: "SUBSCRIPTION",
        methods,
        customerId: abacateCustomerId,
        externalId: sessionId,
        returnUrl: `${appUrl}/checkout/aguardando/${sessionId}`,
        completionUrl: `${appUrl}/planos`,
      });

      // 4. Se o checkout retornar outro customerId, persiste para compras futuras.
      const returnedCustomerId = getAbacateBillingCustomerId(billing);
      if (returnedCustomerId && returnedCustomerId !== abacateCustomerId) {
        abacateCustomerId = returnedCustomerId;
        await supabase
          .from("profiles")
          .update({ abacate_customer_id: returnedCustomerId })
          .eq("id", user.id);
      }

      // 5. Montar checkout_payload com campos que a UI espera
      const checkoutPayload: Record<string, unknown> = {
        invoiceUrl: billing.url,
        encodedImage: extractPixBase64(billing.brCodeBase64),
        payload: billing.brCode ?? null,
      };

      // 6. Inserir transação
      await supabase.from("billing_transactions").insert({
        professor_id: user.id,
        checkout_session_id: sessionId,
        billing_cycle: v.billingCycle,
        payment_method: v.paymentMethod,
        status: "pending",
        amount_cents: pricing.final_amount_cents,
        due_at: `${dueStr}T23:59:59.999Z`,
        abacatepay_customer_id: abacateCustomerId,
        abacatepay_billing_id: billing.id,
        provider_payload: billing as unknown as Record<string, unknown>,
      });

      // 7. Atualizar sessão
      await supabase
        .from("checkout_sessions")
        .update({
          status: "awaiting_payment",
          abacatepay_customer_id: abacateCustomerId,
          abacatepay_billing_id: billing.id,
          awaiting_payment_until: `${dueStr}T23:59:59.999Z`,
          checkout_payload: checkoutPayload,
          provider_payload: billing as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      await insertBillingFunnelEvent(supabase, {
        professorId: user.id,
        checkoutSessionId: sessionId,
        eventName: "checkout_awaiting_payment",
        paymentMethod: v.paymentMethod,
      });

      // 8. Checkout v2 usa página hospedada também para PIX.
      return {
        ok: true,
        checkoutSessionId: sessionId,
        redirectTo: billing.url,
        externalRedirect: true,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("checkout_sessions")
      .update({
        status: "failed",
        checkout_payload: { error: msg },
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: false, error: msg };
  }

  // Fallback dev: sem ABACATEPAY_API_KEY configurada
  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    checkoutSessionId: sessionId,
    eventName: "submit_payment",
    entrypoint: v.entrypoint,
    billingCycle: v.billingCycle,
    paymentMethod: v.paymentMethod,
  });
  await supabase
    .from("checkout_sessions")
    .update({
      status: "awaiting_payment",
      checkout_payload: {
        dev: true,
        message: "Configure ABACATEPAY_API_KEY para testar o fluxo real.",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    checkoutSessionId: sessionId,
    eventName: "checkout_awaiting_payment",
    entrypoint: v.entrypoint,
    billingCycle: v.billingCycle,
    paymentMethod: v.paymentMethod,
  });

  return {
    ok: true,
    checkoutSessionId: sessionId,
    redirectTo: `/checkout/aguardando/${sessionId}`,
  };
}

export async function recordLegalAcceptance(input: {
  kind: "signup" | "first_acceptance";
  termsVersion: string;
  privacyVersion: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const { error } = await supabase.from("legal_acceptances").insert({
    professor_id: user.id,
    acceptance_kind: input.kind,
    terms_version: input.termsVersion,
    privacy_version: input.privacyVersion,
    accepted_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function recordDailyActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("user_activity_days").upsert(
    { professor_id: user.id, activity_date: today },
    {
      onConflict: "professor_id,activity_date",
      ignoreDuplicates: true,
    }
  );
}

export async function cancelSubscriptionAtPeriodEnd() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const now = new Date().toISOString();
  const { error } = await admin
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      cancel_requested_at: now,
    })
    .eq("professor_id", user.id)
    .eq("plan", "professor")
    .in("status", ["active", "trialing"]);

  if (error) return { ok: false as const, error: error.message };
  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    eventName: "cancel_subscription",
  });
  revalidatePath("/planos");
  return { ok: true as const };
}

export async function requestAccountDeletion() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const now = new Date();
  const scheduled = retentionRunAfter(now, 90);
  const { error: pErr } = await admin
    .from("profiles")
    .update({
      account_status: "pending_deletion",
      account_deletion_requested_at: now.toISOString(),
      account_deletion_scheduled_for: scheduled.toISOString(),
    })
    .eq("id", user.id);
  if (pErr) return { ok: false as const, error: pErr.message };
  await admin.from("retention_jobs").insert({
    professor_id: user.id,
    job_type: "account_delete",
    status: "scheduled",
    run_after: scheduled.toISOString(),
    reason: "user_requested",
  });
  revalidatePath("/planos");
  return { ok: true as const };
}

export async function logRegularizePaymentClicked() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    eventName: "regularize_payment_clicked",
  });
}

const funnelEntrypointSchema = entrypointSchema;

/** Abertura da experiência de planos/checkout (funil). */
export async function recordFunnelViewPlan(raw: unknown) {
  const schema = z.object({
    entrypoint: funnelEntrypointSchema,
    billingCycle: z.enum(["monthly", "annual"]).optional().nullable(),
    surface: z.enum(["planos", "checkout"]).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    eventName: "view_plan",
    entrypoint: parsed.data.entrypoint,
    billingCycle: parsed.data.billingCycle ?? null,
    metadata: parsed.data.surface ? { surface: parsed.data.surface } : null,
  });
}

/** Troca mensal/anual no funil. */
export async function recordFunnelSelectCycle(raw: unknown) {
  const schema = z.object({
    entrypoint: funnelEntrypointSchema,
    billingCycle: z.enum(["monthly", "annual"]),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await insertBillingFunnelEvent(supabase, {
    professorId: user.id,
    eventName: "select_cycle",
    entrypoint: parsed.data.entrypoint,
    billingCycle: parsed.data.billingCycle,
  });
}
