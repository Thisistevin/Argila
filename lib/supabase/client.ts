import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicApiKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicApiKey());
}
