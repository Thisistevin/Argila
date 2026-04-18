import { createAdminClient } from "@/lib/supabase/admin";

export type LegalVersions = { terms: string; privacy: string };

export async function getLegalVersions(): Promise<LegalVersions> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "legal_current_versions")
    .maybeSingle();
  const v = data?.value as Partial<LegalVersions> | null;
  return {
    terms: typeof v?.terms === "string" ? v.terms : "v1",
    privacy: typeof v?.privacy === "string" ? v.privacy : "v1",
  };
}
