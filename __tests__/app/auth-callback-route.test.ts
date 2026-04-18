import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/auth/callback/route";

describe("app/auth/callback/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClientWithLegalAccepted() {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === "legal_acceptances") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn() })) };
      }),
    } as never);
  }

  it("troca código e redireciona para origin + next interno", async () => {
    mockClientWithLegalAccepted();

    const req = new Request(
      "https://staging.argila.app/auth/callback?code=abc&next=%2Fdiario"
    );
    const res = await GET(req);

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe(
      "https://staging.argila.app/diario"
    );
  });

  it("ignora next externo e usa /diario", async () => {
    mockClientWithLegalAccepted();

    const evil = encodeURIComponent("https://evil.com/phish");
    const req = new Request(
      `https://studio.argila.app/auth/callback?code=ok&next=${evil}`
    );
    const res = await GET(req);

    expect(res.headers.get("location")).toBe("https://studio.argila.app/diario");
  });

  it("redireciona para /login?error=<code> quando a troca do código falha", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi
          .fn()
          .mockResolvedValue({
            error: { message: "invalid", code: "pkce_code_verifier_not_found" },
          }),
      },
    } as never);

    const req = new Request(
      "https://staging.argila.app/auth/callback?code=bad&next=/diario"
    );
    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "https://staging.argila.app/login?error=pkce_code_verifier_not_found"
    );
  });

  it("sem código vai para login com erro descritivo", async () => {
    const req = new Request("https://localhost:3000/auth/callback");
    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "https://localhost:3000/login?error=missing_code"
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
