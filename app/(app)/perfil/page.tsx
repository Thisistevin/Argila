import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();

  const hasPassword =
    user.identities?.some((i) => i.provider === "email") ?? false;

  return (
    <div className="animate-fade-up">
      <h1
        className="mb-8 text-2xl font-bold"
        style={{ color: "var(--argila-darkest)" }}
      >
        Meu Perfil
      </h1>
      <ProfileForm
        initialName={profile?.name ?? ""}
        initialPhone={profile?.phone ?? ""}
        currentEmail={user.email ?? ""}
        hasPassword={hasPassword}
      />
    </div>
  );
}
