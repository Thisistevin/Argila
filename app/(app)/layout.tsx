import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppShell } from "@/components/shell/AppShell";
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
import { WhatsAppButton } from "@/components/WhatsAppButton";

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
    <>
      <AppShell sidebar={<AppSidebar premium={premium} />}>
        <PastDueGate pastDue={pastDue}>
          <PlanDecisionGate pastDue={pastDue} latest={latest}>
            {children}
          </PlanDecisionGate>
        </PastDueGate>
      </AppShell>
      <WhatsAppButton email={user.email ?? ""} />
    </>
  );
}
