import { NextResponse } from "next/server";
import { sanitizeTrustedNextUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeTrustedNextUrl(searchParams.get("next"));
  const providerError =
    searchParams.get("error_code") ??
    searchParams.get("error") ??
    searchParams.get("error_description");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = next.startsWith("/") ? new URL(next, origin) : next;
      return NextResponse.redirect(dest);
    }

    const reason =
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string" &&
        error.code) ||
      error.message ||
      "auth";

    console.error("Supabase auth callback failed", {
      reason,
      message: error.message,
      name: error.name,
      status: "status" in error ? error.status : undefined,
    });

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(reason)}`, origin)
    );
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(providerError || "missing_code")}`,
      origin
    )
  );
}
