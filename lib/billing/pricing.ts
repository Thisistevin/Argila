export const PROFESSOR_MONTHLY_CENTS = 2900;
export const PROFESSOR_ANNUAL_CENTS = 29000;

export type ProfessorBillingCycle = "monthly" | "annual";

export type PromotionSource = "coupon" | "landing_trial";

export type LandingTrialConfig = { enabled: boolean; trialDays: number };

export function baseAmountForProfessorCycle(
  cycle: ProfessorBillingCycle
): number {
  return cycle === "monthly" ? PROFESSOR_MONTHLY_CENTS : PROFESSOR_ANNUAL_CENTS;
}

export type CouponBenefit =
  | { type: "percent_discount"; value: number }
  | { type: "trial_days"; value: number };

export type CheckoutPricingInput = {
  billingCycle: ProfessorBillingCycle;
  /** Cupom válido aplicado — sobrescreve trial da landing. */
  coupon?: CouponBenefit | null;
  /** Trial da landing só aplica com entrypoint da landing (validado fora). */
  landingTrial?: LandingTrialConfig | null;
};

export type CheckoutPricingResult = {
  base_amount_cents: number;
  final_amount_cents: number;
  promotion_source: PromotionSource | null;
  discount_percent: number | null;
  extra_trial_days: number | null;
  trial_days_applied: number;
};

/**
 * Ordem: cupom > trial landing > nada (planos § regras de precedência).
 */
export function computeCheckoutPricing(
  input: CheckoutPricingInput
): CheckoutPricingResult {
  const base = baseAmountForProfessorCycle(input.billingCycle);
  if (input.coupon) {
    if (input.coupon.type === "percent_discount") {
      const pct = input.coupon.value;
      const final = Math.round(base * (1 - pct / 100));
      return {
        base_amount_cents: base,
        final_amount_cents: final,
        promotion_source: "coupon",
        discount_percent: pct,
        extra_trial_days: null,
        trial_days_applied: 0,
      };
    }
    return {
      base_amount_cents: base,
      final_amount_cents: base,
      promotion_source: "coupon",
      discount_percent: null,
      extra_trial_days: input.coupon.value,
      trial_days_applied: input.coupon.value,
    };
  }
  if (
    input.landingTrial?.enabled &&
    input.landingTrial.trialDays > 0
  ) {
    return {
      base_amount_cents: base,
      final_amount_cents: base,
      promotion_source: "landing_trial",
      discount_percent: null,
      extra_trial_days: input.landingTrial.trialDays,
      trial_days_applied: input.landingTrial.trialDays,
    };
  }
  return {
    base_amount_cents: base,
    final_amount_cents: base,
    promotion_source: null,
    discount_percent: null,
    extra_trial_days: null,
    trial_days_applied: 0,
  };
}

/** `period_end` para primeira cobrança pós-pagamento (sem trial). */
export function periodEndAfterPayment(
  start: Date,
  billingCycle: ProfessorBillingCycle
): Date {
  const d = new Date(start.getTime());
  if (billingCycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

/** Período inicial quando há trial (dias corridos a partir de `start`). */
export function periodEndAfterTrial(
  start: Date,
  trialDays: number,
  billingCycle: ProfessorBillingCycle
): Date {
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + trialDays);
  if (billingCycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}
