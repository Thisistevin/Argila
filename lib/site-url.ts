const DEFAULT_LOCAL = "http://localhost:3000";

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * Garante esquema http(s) e remove barras finais da base do site.
 * Se vier só hostname (ex.: `studio.argila.app`), assume `https://`.
 */
export function normalizePublicBaseUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return DEFAULT_LOCAL;
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return stripTrailingSlashes(u);
}

/**
 * Aceita apenas destinos internos relativos (`/rota`).
 * Evita open redirect (`//`, `https:`, etc.).
 */
export function sanitizeInternalNextPath(
  next: string | null | undefined,
  fallback = "/diario"
): string {
  if (next == null || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/")) return fallback;
  if (t.startsWith("//")) return fallback;
  if (t.includes("://")) return fallback;
  if (t.includes("\\")) return fallback;
  if (t.includes("\0")) return fallback;
  return t;
}

/**
 * URL pública do app para redirects de auth.
 *
 * Ordem: `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_VERCEL_URL` → `window.location.origin` (cliente)
 * → `http://localhost:3000` (SSR sem env).
 */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalizePublicBaseUrl(explicit);

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    return normalizePublicBaseUrl(
      /^https?:\/\//i.test(vercel) ? vercel : `https://${vercel}`
    );
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return stripTrailingSlashes(window.location.origin);
  }

  return DEFAULT_LOCAL;
}

/**
 * Domínio do cookie de sessão compartilhado entre subdomínios.
 * Em produção: ".argila.app"  |  Em dev/staging: undefined (padrão do browser)
 */
export function getCookieDomain(): string | undefined {
  const d = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  return d || undefined;
}

/**
 * Aceita caminhos internos ("/diario") ou URLs absolutas em domínio confiável
 * (hostname que termina com NEXT_PUBLIC_COOKIE_DOMAIN, ex: "studio.argila.app").
 * Qualquer outro URL absoluto é rejeitado e retorna o fallback.
 */
export function sanitizeTrustedNextUrl(
  next: string | null | undefined,
  fallback = "/diario"
): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();

  if (t.startsWith("/")) return sanitizeInternalNextPath(t, fallback);

  const cookieDomain = getCookieDomain();
  if (!cookieDomain) return fallback;
  try {
    const url = new URL(t);
    const root = cookieDomain.replace(/^\./, "");
    if (
      url.protocol === "https:" &&
      (url.hostname === root || url.hostname.endsWith(cookieDomain))
    ) {
      return url.toString();
    }
  } catch {
    /* URL inválida */
  }
  return fallback;
}

/**
 * URL absoluta do endpoint `/auth/callback` com `next` sanitizado.
 */
export function buildAuthCallbackUrl(next?: string): string {
  const base = getPublicSiteUrl();
  const safeNext = sanitizeInternalNextPath(next ?? "/diario");
  const url = new URL("/auth/callback", `${stripTrailingSlashes(base)}/`);
  url.searchParams.set("next", safeNext);
  return url.toString();
}
