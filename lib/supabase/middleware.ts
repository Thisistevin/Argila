import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicApiKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getCookieDomain } from "@/lib/site-url";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublicApiKey(),
    {
      cookieOptions: { domain: getCookieDomain() },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (user && pathname !== "/exclusao-agendada") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.account_status === "pending_deletion") {
      const url = request.nextUrl.clone();
      url.pathname = "/exclusao-agendada";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
