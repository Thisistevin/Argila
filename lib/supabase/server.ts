import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicApiKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getCookieDomain } from "@/lib/site-url";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublicApiKey(), {
    cookieOptions: { domain: getCookieDomain() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component */
        }
      },
    },
  });
}
