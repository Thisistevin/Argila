import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/webhooks/abacatepay/route";

/** Cria um objeto encadeável que suporta .eq().eq().in().maybeSingle() etc. */
function chain(resolved: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self: any = {
    eq: vi.fn(() => self),
    in: vi.fn(() => self),
    neq: vi.fn(() => self),
    lt: vi.fn(() => self),
    lte: vi.fn(() => self),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolved, error: null }),
    single: vi.fn().mockResolvedValue({ data: resolved, error: null }),
    then: undefined, // não é uma Promise
  };
  return self;
}

function makeAdminClient(overrides?: {
  checkoutRow?: Record<string, unknown> | null;
  profileId?: string | null;
}) {
  const checkoutRow = overrides?.checkoutRow ?? {
    id: "cs-1",
    professor_id: "prof-1",
    billing_cycle: "monthly",
    trial_days_applied: 0,
    coupon_code: null as string | null,
    promotion_source: null as string | null,
  };
  const profileId = overrides?.profileId ?? "prof-1";

  // updateSpy retorna um chain encadeável e também é uma Promise
  const updateSpy = vi.fn(() => {
    const c = chain({ error: null });
    // Supabase update é também thenable
    c.then = (resolve: (v: unknown) => void) => Promise.resolve({ error: null }).then(resolve);
    return c;
  });
  const insertSpy = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => chain(profileId ? { id: profileId } : null)),
        };
      }
      if (table === "checkout_sessions") {
        return {
          select: vi.fn(() => chain(checkoutRow)),
          update: updateSpy,
        };
      }
      if (table === "billing_transactions") {
        return { update: updateSpy, insert: insertSpy };
      }
      if (table === "billing_funnel_events") {
        return { insert: insertSpy };
      }
      if (table === "coupons") {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => chain(null)),
          })),
          update: updateSpy,
        };
      }
      if (table === "coupon_redemptions") {
        return { insert: insertSpy };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn(() =>
            chain({ billing_cycle: "monthly", period_end: new Date().toISOString() })
          ),
          update: updateSpy,
        };
      }
      return {
        select: vi.fn(() => chain(null)),
        update: updateSpy,
        insert: insertSpy,
      };
    }),
    _spies: { updateSpy, insertSpy },
  } as unknown as ReturnType<typeof createAdminClient>;
}

function makeRequest(
  body: unknown,
  signature = "abacate-secret",
  signatureHeader = "x-webhook-signature"
) {
  return new Request("https://argila.app/api/webhooks/abacatepay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [signatureHeader]: signature,
    },
    body: JSON.stringify(body),
  }) as never;
}

describe("app/api/webhooks/abacatepay/route", () => {
  const originalSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABACATEPAY_WEBHOOK_SECRET = "abacate-secret";
  });

  afterAll(() => {
    process.env.ABACATEPAY_WEBHOOK_SECRET = originalSecret;
  });

  it("rejeita com 401 quando a assinatura do webhook é inválida", async () => {
    const response = await POST(makeRequest({ event: "checkout.completed" }, "wrong-secret"));
    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("checkout.completed ativa a assinatura com source abacatepay", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      makeRequest({
        event: "checkout.completed",
        data: {
          id: "bill_1",
          externalId: "cs-1",
          customerId: "cust_123",
          status: "PAID",
          amount: 2900,
        },
      })
    );

    expect(response.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith("subscriptions");

    const subTable = client.from("subscriptions") as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(subTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "professor",
        status: "active",
        source: "abacatepay",
      })
    );
  });

  it("checkout.completed v2 com payload aninhado ativa a assinatura", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      makeRequest(
        {
          event: "checkout.completed",
          apiVersion: 2,
          data: {
            checkout: {
              id: "bill_1",
              externalId: "cs-1",
              customerId: "cust_123",
              status: "PAID",
              amount: 2900,
              methods: ["PIX"],
            },
            customer: {
              id: "cust_123",
            },
          },
        },
        "abacate-secret",
        "x-abacate-signature"
      )
    );

    expect(response.status).toBe(200);
    const subTable = client.from("subscriptions") as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(subTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        source: "abacatepay",
      })
    );
  });

  it("subscription.renewed estende o period_end e insere billing_transaction", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      makeRequest({
        event: "subscription.renewed",
        data: {
          id: "bill_renewed",
          customerId: "cust_123",
          status: "PAID",
          amount: 2900,
        },
      })
    );

    expect(response.status).toBe(200);

    const txTable = client.from("billing_transactions") as unknown as {
      insert: ReturnType<typeof vi.fn>;
    };
    expect(txTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_event: "subscription.renewed",
        professor_id: "prof-1",
      })
    );
  });

  it("subscription.cancelled define cancel_at_period_end = true", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      makeRequest({
        event: "subscription.cancelled",
        data: { id: "bill_1", customerId: "cust_123" },
      })
    );

    expect(response.status).toBe(200);

    const subTable = client.from("subscriptions") as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(subTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ cancel_at_period_end: true })
    );
  });

  it("eventos desconhecidos retornam 200 sem lançar erro", async () => {
    const client = makeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const response = await POST(
      makeRequest({ event: "transfer.completed", data: {} })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
