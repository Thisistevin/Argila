import { NextResponse } from "next/server";
import { sanitizeTrustedNextUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeTrustedNextUrl(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = next.startsWith("/") ? new URL(next, origin) : next;
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
