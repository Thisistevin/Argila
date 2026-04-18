import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/webhooks/asaas/route";

function makeAdminClient() {
  const checkoutRow = {
    id: "cs-1",
    professor_id: "prof-1",
    billing_cycle: "monthly",
    trial_days_applied: 0,
    coupon_code: null as string | null,
    promotion_source: null as string | null,
  };

  const updateFinalEq = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn(() => ({ eq: updateFinalEq }));
  const updateSpy = vi.fn(() => ({ eq: updateEq }));

  const maybeCheckout = vi
    .fn()
    .mockResolvedValue({ data: checkoutRow, error: null });

  const insertSpy = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "prof-1" },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "checkout_sessions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: maybeCheckout })),
          })),
          update: updateSpy,
        };
      }
      if (table === "billing_transactions") {
        return { update: updateSpy };
      }
      if (table === "billing_funnel_events") {
        return { insert: insertSpy };
      }
      if (table === "coupons") {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
          update: updateSpy,
        };
      }
      if (table === "coupon_redemptions") {
        return { insert: insertSpy };
      }
      if (table === "subscriptions") {
        return { update: updateSpy };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
        update: updateSpy,
        insert: insertSpy,
      };
    }),
    _spies: { updateSpy, insertSpy, maybeCheckout },
  } as unknown as ReturnType<typeof createAdminClient>;
}

describe("app/api/webhooks/asaas/route", () => {
  const originalSecret = process.env.ASAAS_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASAAS_WEBHOOK_SECRET = "asaas-secret";
  });

  afterAll(() => {
    process.env.ASAAS_WEBHOOK_SECRET = originalSecret;
  });

  it("autoriza pelo header asaas-access-token e ativa assinatura em PAYMENT_RECEIVED", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      new Request("https://argila.app/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "asaas-access-token": "asaas-secret",
        },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: {
            id: "pay_1",
            customer: "cus_123",
            externalReference: "cs-1",
          },
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith("checkout_sessions");
    expect(client.from).toHaveBeenCalledWith("subscriptions");

    const subscriptionsTable = client.from("subscriptions") as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(subscriptionsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "professor",
        billing_cycle: "monthly",
        status: "active",
        source: "asaas",
      })
    );
  });

  it("marca assinatura como past_due em PAYMENT_OVERDUE", async () => {
    const updateFinalEq = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn(() => ({ eq: updateFinalEq }));
    const updateSpy = vi.fn(() => ({ eq: updateEq }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "prof-1" },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "subscriptions") {
          return { update: updateSpy };
        }
        if (table === "billing_transactions") {
          return { update: updateSpy };
        }
        if (table === "billing_funnel_events") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { update: updateSpy };
      }),
    } as unknown as ReturnType<typeof createAdminClient>;

    vi.mocked(createAdminClient).mockReturnValue(client);

    await POST(
      new Request("https://argila.app/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-asaas-token": "asaas-secret",
        },
        body: JSON.stringify({
          event: "PAYMENT_OVERDUE",
          payment: { id: "pay_9", customer: "cus_123" },
        }),
      }) as never
    );

    const subscriptionsTable = client.from("subscriptions") as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(subscriptionsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "past_due",
      })
    );
  });

  it("rejeita quando o token do webhook é inválido", async () => {
    const response = await POST(
      new Request("https://argila.app/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "asaas-access-token": "wrong-secret",
        },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: { customer: "cus_123" },
        }),
      }) as never
    );

    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
