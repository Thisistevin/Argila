import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { PastDueGate } from "@/components/billing/PastDueGate";
import { PlanDecisionGate } from "@/components/billing/PlanDecisionGate";
import { recordDailyActivity } from "@/actions/billing";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
  isProfessorPremium,
} from "@/lib/entitlement";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await recordDailyActivity();

  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);
  const pastDue = Boolean(
    latest && latest.plan === "professor" && isPastDue(latest)
  );

  return (
    <div className="flex min-h-screen">
      <AppSidebar premium={premium} />
      <main className="flex-1 overflow-auto" style={{ background: "var(--color-bg)" }}>
        <div className="mx-auto max-w-4xl p-6 md:p-10">
          <PastDueGate pastDue={pastDue}>
            <PlanDecisionGate pastDue={pastDue} latest={latest}>
              {children}
            </PlanDecisionGate>
          </PastDueGate>
        </div>
      </main>
    </div>
  );
}
