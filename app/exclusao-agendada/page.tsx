import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ExclusaoAgendadaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status, account_deletion_scheduled_for")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_status !== "pending_deletion") {
    redirect("/diario");
  }

  const when = profile.account_deletion_scheduled_for
    ? new Date(profile.account_deletion_scheduled_for).toLocaleString("pt-BR")
    : "data a confirmar";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold" style={{ color: "var(--argila-darkest)" }}>
        Exclusão de conta agendada
      </h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        O seu pedido foi registado. A conta será eliminada após o período de retenção, por volta de{" "}
        <strong>{when}</strong>, salvo obrigações legais em contrário.
      </p>
      <p className="mt-4 text-sm" style={{ color: "var(--color-text-subtle)" }}>
        Se precisar de ajuda, contacte o suporte Argila pelo canal habitual.
      </p>
      <form action={logout} className="mt-8 flex justify-center">
        <button
          type="submit"
          className="text-sm underline underline-offset-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          Terminar sessão
        </button>
      </form>
    </div>
  );
}
