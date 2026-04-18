import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROFESSOR_ANNUAL_CENTS,
  PROFESSOR_MONTHLY_CENTS,
} from "@/lib/billing/pricing";

export async function GET() {
  const admin = createAdminClient();
  const { data: trialRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "landing_professor_trial")
    .maybeSingle();
  const trial = (trialRow?.value as { enabled?: boolean; trialDays?: number }) ?? {
    enabled: true,
    trialDays: 14,
  };

  return NextResponse.json({
    landingProfessorTrialEnabled: Boolean(trial.enabled),
    landingProfessorTrialDays: Number(trial.trialDays ?? 14),
    professorMonthlyPriceCents: PROFESSOR_MONTHLY_CENTS,
    professorAnnualPriceCents: PROFESSOR_ANNUAL_CENTS,
  });
}
