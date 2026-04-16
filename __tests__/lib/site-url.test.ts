import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthCallbackUrl,
  getPublicSiteUrl,
  normalizePublicBaseUrl,
  sanitizeInternalNextPath,
} from "@/lib/site-url";

describe("lib/site-url", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { window?: unknown }).window;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { window?: unknown }).window;
  });

  describe("normalizePublicBaseUrl", () => {
    it("remove barras finais e aceita host sem esquema", () => {
      expect(normalizePublicBaseUrl("https://studio.argila.app/")).toBe(
        "https://studio.argila.app"
      );
      expect(normalizePublicBaseUrl("staging.argila.app")).toBe(
        "https://staging.argila.app"
      );
    });
  });

  describe("sanitizeInternalNextPath", () => {
    it("aceita path relativo interno", () => {
      expect(sanitizeInternalNextPath("/diario")).toBe("/diario");
      expect(sanitizeInternalNextPath("/aluno/uuid-here")).toBe(
        "/aluno/uuid-here"
      );
    });

    it("ignora next externo ou protocol-relative", () => {
      expect(sanitizeInternalNextPath("https://evil.com")).toBe("/diario");
      expect(sanitizeInternalNextPath("//evil.com")).toBe("/diario");
      expect(sanitizeInternalNextPath("evil")).toBe("/diario");
    });
  });

  describe("getPublicSiteUrl", () => {
    it("usa NEXT_PUBLIC_SITE_URL quando definido", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studio.argila.app/");
      vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "https://ignored.vercel.app");
      expect(getPublicSiteUrl()).toBe("https://studio.argila.app");
    });

    it("usa window.location.origin antes de NEXT_PUBLIC_VERCEL_URL no cliente", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      (globalThis as { window?: { location: { origin: string } } }).window = {
        location: { origin: "https://studio.argila.app" },
      };
      vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "studio-argila.vercel.app");
      expect(getPublicSiteUrl()).toBe("https://studio.argila.app");
    });

    it("usa NEXT_PUBLIC_VERCEL_URL com https quando não há site explícito nem window", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "my-proj.vercel.app");
      expect(getPublicSiteUrl()).toBe("https://my-proj.vercel.app");
    });

    it("mantém esquema quando VERCEL_URL já traz https", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "https://preview.vercel.app/");
      expect(getPublicSiteUrl()).toBe("https://preview.vercel.app");
    });

    it("cai em localhost quando não há env nem window", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
      expect(getPublicSiteUrl()).toBe("http://localhost:3000");
    });
  });

  describe("buildAuthCallbackUrl", () => {
    it("monta /auth/callback?next= com next sanitizado", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.argila.app");
      const u = new URL(buildAuthCallbackUrl("/galeria"));
      expect(u.origin).toBe("https://staging.argila.app");
      expect(u.pathname).toBe("/auth/callback");
      expect(u.searchParams.get("next")).toBe("/galeria");
    });

    it("não gera URL com barra dupla antes de auth", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://x.app/");
      const u = buildAuthCallbackUrl("/d");
      expect(u).not.toContain("//auth");
      expect(u).toMatch(/^https:\/\/x\.app\/auth\/callback\?/);
    });
  });
});
