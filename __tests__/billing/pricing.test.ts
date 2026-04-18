import { describe, expect, it } from "vitest";
import { computeCheckoutPricing, PROFESSOR_ANNUAL_CENTS, PROFESSOR_MONTHLY_CENTS } from "@/lib/billing/pricing";

describe("computeCheckoutPricing", () => {
  it("aplica desconto percentual do cupom", () => {
    const r = computeCheckoutPricing({
      billingCycle: "monthly",
      coupon: { type: "percent_discount", value: 20 },
      landingTrial: { enabled: true, trialDays: 14 },
    });
    expect(r.promotion_source).toBe("coupon");
    expect(r.final_amount_cents).toBe(Math.round(PROFESSOR_MONTHLY_CENTS * 0.8));
    expect(r.trial_days_applied).toBe(0);
  });

  it("cupom trial dias prevalece sobre trial da landing", () => {
    const r = computeCheckoutPricing({
      billingCycle: "annual",
      coupon: { type: "trial_days", value: 30 },
      landingTrial: { enabled: true, trialDays: 14 },
    });
    expect(r.promotion_source).toBe("coupon");
    expect(r.final_amount_cents).toBe(PROFESSOR_ANNUAL_CENTS);
    expect(r.trial_days_applied).toBe(30);
  });

  it("usa trial da landing sem cupom", () => {
    const r = computeCheckoutPricing({
      billingCycle: "monthly",
      coupon: null,
      landingTrial: { enabled: true, trialDays: 14 },
    });
    expect(r.promotion_source).toBe("landing_trial");
    expect(r.trial_days_applied).toBe(14);
  });

  it("sem promoções mantém preço base", () => {
    const r = computeCheckoutPricing({
      billingCycle: "monthly",
      coupon: null,
      landingTrial: { enabled: false, trialDays: 0 },
    });
    expect(r.promotion_source).toBeNull();
    expect(r.final_amount_cents).toBe(PROFESSOR_MONTHLY_CENTS);
  });
});
