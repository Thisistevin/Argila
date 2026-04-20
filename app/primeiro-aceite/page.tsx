import { redirect } from "next/navigation";
import { LegalFirstAcceptForm } from "@/components/legal/LegalFirstAcceptForm";
import { getLegalVersions } from "@/lib/legal/versions";
import { STUDIO_HOME_URL } from "@/lib/studio-home-url";
import { createClient } from "@/lib/supabase/server";

export default async function PrimeiroAceitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/primeiro-aceite");
  }

  const { count } = await supabase
    .from("legal_acceptances")
    .select("*", { count: "exact", head: true })
    .eq("professor_id", user.id);

  if (count && count > 0) {
    redirect(STUDIO_HOME_URL);
  }

  const versions = await getLegalVersions();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold" style={{ color: "var(--argila-darkest)" }}>
        Antes de continuar
      </h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        Precisamos do seu aceite explícito dos Termos de Uso e da Política de Privacidade da Argila
        (termos v{versions.terms}, privacidade v{versions.privacy}).
      </p>
      <LegalFirstAcceptForm
        termsVersion={versions.terms}
        privacyVersion={versions.privacy}
      />
    </div>
  );
}
