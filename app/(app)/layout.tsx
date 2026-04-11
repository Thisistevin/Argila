import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
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

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);

  return (
    <div className="flex min-h-screen">
      <AppSidebar premium={premium} />
      <main className="flex-1 overflow-auto" style={{ background: "var(--color-bg)" }}>
        <div className="mx-auto max-w-4xl p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
