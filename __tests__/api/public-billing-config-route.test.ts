import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { GET } from "@/app/api/public/billing-config/route";
import { PROFESSOR_ANNUAL_CENTS, PROFESSOR_MONTHLY_CENTS } from "@/lib/billing/pricing";

describe("GET /api/public/billing-config", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { value: { enabled: true, trialDays: 21 } },
              error: null,
            }),
          })),
        })),
      })),
    } as never);
  });

  it("expõe trial e preços", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.landingProfessorTrialEnabled).toBe(true);
    expect(body.landingProfessorTrialDays).toBe(21);
    expect(body.professorMonthlyPriceCents).toBe(PROFESSOR_MONTHLY_CENTS);
    expect(body.professorAnnualPriceCents).toBe(PROFESSOR_ANNUAL_CENTS);
  });
});
