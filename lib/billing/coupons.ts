import type { CouponBenefit } from "@/lib/billing/pricing";

export type CouponRow = {
  id: string;
  code: string;
  status: string;
  benefit_type: "percent_discount" | "trial_days";
  benefit_value: number;
  allowed_cycles: string[];
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  redemptions_count: number;
};

export type CouponValidation =
  | { ok: true; benefit: CouponBenefit; row: CouponRow }
  | { ok: false; error: string };

export function validateCouponForCheckout(
  row: CouponRow | null | undefined,
  billingCycle: "monthly" | "annual"
): CouponValidation {
  if (!row) {
    return { ok: false, error: "Cupom não encontrado." };
  }
  if (row.status !== "active") {
    return { ok: false, error: "Cupom inativo ou expirado." };
  }
  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return { ok: false, error: "Cupom ainda não válido." };
  }
  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    return { ok: false, error: "Cupom expirado." };
  }
  if (
    row.max_redemptions != null &&
    row.redemptions_count >= row.max_redemptions
  ) {
    return { ok: false, error: "Cupom esgotado." };
  }
  if (!row.allowed_cycles?.includes(billingCycle)) {
    return { ok: false, error: "Cupom não válido para este ciclo." };
  }
  if (row.benefit_type === "percent_discount") {
    return {
      ok: true,
      benefit: { type: "percent_discount", value: row.benefit_value },
      row,
    };
  }
  if (row.benefit_type === "trial_days") {
    return {
      ok: true,
      benefit: { type: "trial_days", value: row.benefit_value },
      row,
    };
  }
  return { ok: false, error: "Tipo de cupom não suportado." };
}
