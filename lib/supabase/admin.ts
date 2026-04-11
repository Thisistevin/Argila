import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretApiKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretApiKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
