import { describe, expect, it } from "vitest";
import {
  isProfessorPremium,
  isTrialExpired,
  requiresPlanDecision,
} from "@/lib/entitlement";

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

describe("isTrialExpired / requiresPlanDecision", () => {
  it("trialing com period_end futuro: não exige decisão", () => {
    const sub = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "trialing",
      period_end: future,
      source: "system",
    };
    expect(isTrialExpired(sub)).toBe(false);
    expect(requiresPlanDecision(sub)).toBe(false);
    expect(isProfessorPremium(sub)).toBe(true);
  });

  it("trialing com period_end passado: exige decisão e não é premium", () => {
    const sub = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "trialing",
      period_end: past,
      source: "system",
    };
    expect(isTrialExpired(sub)).toBe(true);
    expect(requiresPlanDecision(sub)).toBe(true);
    expect(isProfessorPremium(sub)).toBe(false);
  });

  it("trial_expired: exige decisão", () => {
    const sub = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "trial_expired",
      period_end: past,
      source: "system",
    };
    expect(isTrialExpired(sub)).toBe(true);
    expect(requiresPlanDecision(sub)).toBe(true);
    expect(isProfessorPremium(sub)).toBe(false);
  });
});
