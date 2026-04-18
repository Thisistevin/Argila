import { NextResponse } from "next/server";
import { sanitizeInternalNextPath, sanitizeTrustedNextUrl } from "@/lib/site-url";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from("legal_acceptances")
          .select("*", { count: "exact", head: true })
          .eq("professor_id", user.id);
        if (!count) {
          const legalUrl = new URL("/primeiro-aceite", origin);
          const nextForParam = next.startsWith("/")
            ? sanitizeInternalNextPath(next)
            : sanitizeInternalNextPath(
                (() => {
                  try {
                    const u = new URL(next);
                    return `${u.pathname}${u.search}`;
                  } catch {
                    return "/diario";
                  }
                })()
              );
          legalUrl.searchParams.set("next", nextForParam);
          return NextResponse.redirect(legalUrl);
        }
      }
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
