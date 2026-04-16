import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicApiKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getCookieDomain } from "@/lib/site-url";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicApiKey(), {
    cookieOptions: { domain: getCookieDomain() },
  });
}
