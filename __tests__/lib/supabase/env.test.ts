import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSupabaseUrl,
  getSupabasePublicApiKey,
  getSupabaseSecretApiKey,
  getSupabaseTestUrl,
  getSupabaseTestPublicApiKey,
  getSupabaseTestSecretApiKey,
} from "@/lib/supabase/env";

describe("lib/supabase/env", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_TEST_URL", "");
    vi.stubEnv("SUPABASE_TEST_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_TEST_ANON_KEY", "");
    vi.stubEnv("SUPABASE_TEST_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_TEST_SERVICE_ROLE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getSupabaseUrl", () => {
    it("usa NEXT_PUBLIC_SUPABASE_URL com prioridade sobre SUPABASE_URL", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://a.supabase.co");
      vi.stubEnv("SUPABASE_URL", "https://b.supabase.co");
      expect(getSupabaseUrl()).toBe("https://a.supabase.co");
    });

    it("cai em SUPABASE_URL se NEXT_PUBLIC vazio", () => {
      vi.stubEnv("SUPABASE_URL", "https://only.server.supabase.co");
      expect(getSupabaseUrl()).toBe("https://only.server.supabase.co");
    });

    it("ignora URL só com espaços", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
      vi.stubEnv("SUPABASE_URL", "https://fallback.supabase.co");
      expect(getSupabaseUrl()).toBe("https://fallback.supabase.co");
    });

    it("erro claro sem URL", () => {
      expect(() => getSupabaseUrl()).toThrow(
        /NEXT_PUBLIC_SUPABASE_URL \(ou SUPABASE_URL/
      );
    });
  });

  describe("getSupabasePublicApiKey", () => {
    it("prioriza NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sobre ANON", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(getSupabasePublicApiKey()).toBe("sb_publishable_x");
    });

    it("usa anon se publishable ausente", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(getSupabasePublicApiKey()).toBe(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      );
    });

    it("erro claro sem chave pública", () => {
      expect(() => getSupabasePublicApiKey()).toThrow(
        /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });
  });

  describe("getSupabaseSecretApiKey", () => {
    it("prioriza SUPABASE_SECRET_KEY sobre SERVICE_ROLE", () => {
      vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_x");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJservice");
      expect(getSupabaseSecretApiKey()).toBe("sb_secret_x");
    });

    it("usa service_role se secret ausente", () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJservice");
      expect(getSupabaseSecretApiKey()).toBe("eyJservice");
    });

    it("erro claro sem chave secreta", () => {
      expect(() => getSupabaseSecretApiKey()).toThrow(
        /SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY/
      );
    });
  });

  describe("getSupabaseTestUrl", () => {
    it("retorna SUPABASE_TEST_URL", () => {
      vi.stubEnv("SUPABASE_TEST_URL", "https://test.supabase.co");
      expect(getSupabaseTestUrl()).toBe("https://test.supabase.co");
    });

    it("erro claro sem URL de teste", () => {
      expect(() => getSupabaseTestUrl()).toThrow(/SUPABASE_TEST_URL/);
    });
  });

  describe("getSupabaseTestPublicApiKey", () => {
    it("prioriza SUPABASE_TEST_PUBLISHABLE_KEY sobre ANON", () => {
      vi.stubEnv("SUPABASE_TEST_PUBLISHABLE_KEY", "sb_publishable_test");
      vi.stubEnv("SUPABASE_TEST_ANON_KEY", "anon_test");
      expect(getSupabaseTestPublicApiKey()).toBe("sb_publishable_test");
    });

    it("usa SUPABASE_TEST_ANON_KEY se publishable ausente", () => {
      vi.stubEnv("SUPABASE_TEST_ANON_KEY", "anon_only");
      expect(getSupabaseTestPublicApiKey()).toBe("anon_only");
    });

    it("erro claro sem chave pública de teste", () => {
      expect(() => getSupabaseTestPublicApiKey()).toThrow(
        /SUPABASE_TEST_PUBLISHABLE_KEY ou SUPABASE_TEST_ANON_KEY/
      );
    });
  });

  describe("getSupabaseTestSecretApiKey", () => {
    it("prioriza SUPABASE_TEST_SECRET_KEY sobre SERVICE_ROLE", () => {
      vi.stubEnv("SUPABASE_TEST_SECRET_KEY", "sb_secret_test");
      vi.stubEnv("SUPABASE_TEST_SERVICE_ROLE_KEY", "sr_test");
      expect(getSupabaseTestSecretApiKey()).toBe("sb_secret_test");
    });

    it("usa SUPABASE_TEST_SERVICE_ROLE_KEY se secret ausente", () => {
      vi.stubEnv("SUPABASE_TEST_SERVICE_ROLE_KEY", "sr_only");
      expect(getSupabaseTestSecretApiKey()).toBe("sr_only");
    });

    it("erro claro sem chave secreta de teste", () => {
      expect(() => getSupabaseTestSecretApiKey()).toThrow(
        /SUPABASE_TEST_SECRET_KEY ou SUPABASE_TEST_SERVICE_ROLE_KEY/
      );
    });
  });
});
