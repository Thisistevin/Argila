import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EXPLORE_STUDENT_LIMIT,
  PROFESSOR_STUDENT_LIMIT,
} from "@/lib/ai/config";

export type SubscriptionRow = {
  plan: string;
  billing_cycle: string;
  status: string;
  period_end: string;
  source: string;
};

export async function getActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, billing_cycle, status, period_end, source")
    .eq("professor_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as SubscriptionRow;
}

/** Última linha de assinatura (inclui past_due) — para gates e UI */
export async function getLatestSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, billing_cycle, status, period_end, source")
    .eq("professor_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as SubscriptionRow;
}

/** Professor pago: plan professor, ativo, período válido, não gratuito sistema */
export function isProfessorPremium(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (sub.plan !== "professor") return false;
  if (sub.status !== "active") return false;
  if (sub.billing_cycle === "free" && sub.source === "system") return false;
  const end = new Date(sub.period_end);
  if (end.getTime() <= Date.now()) return false;
  return true;
}

export function isPastDue(sub: SubscriptionRow | null): boolean {
  return sub?.status === "past_due";
}

export function canUseExploreAi(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  return sub.plan === "explorar" && sub.status === "active";
}

export function maxStudentsForPlan(sub: SubscriptionRow | null): number {
  if (isProfessorPremium(sub)) return PROFESSOR_STUDENT_LIMIT;
  return EXPLORE_STUDENT_LIMIT;
}

export function canManageClasses(sub: SubscriptionRow | null): boolean {
  return isProfessorPremium(sub);
}

export function canUseReports(sub: SubscriptionRow | null): boolean {
  return isProfessorPremium(sub);
}

export function canUseAttentionIndicator(sub: SubscriptionRow | null): boolean {
  return isProfessorPremium(sub);
}
