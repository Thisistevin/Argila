import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  abacateCreateCustomer,
  abacateCreateBilling,
  extractPixBase64,
} from "@/lib/billing/abacatepay";

const originalEnv = process.env.ABACATEPAY_API_KEY;

describe("abacateCreateCustomer", () => {
  beforeEach(() => {
    process.env.ABACATEPAY_API_KEY = "abc_dev_test";
  });

  afterEach(() => {
    process.env.ABACATEPAY_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("retorna o id do cliente criado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({ data: { id: "cust_abc123", metadata: {} }, error: null }),
      })
    );

    const id = await abacateCreateCustomer({
      name: "João Silva",
      email: "joao@example.com",
      taxId: "12345678901",
      cellphone: "(11) 99999-9999",
    });

    expect(id).toBe("cust_abc123");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/customer/create");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer abc_dev_test"
    );
  });

  it("lança erro quando ABACATEPAY_API_KEY não está configurada", async () => {
    delete process.env.ABACATEPAY_API_KEY;
    await expect(
      abacateCreateCustomer({ name: "X", email: "x@x.com" })
    ).rejects.toThrow("ABACATEPAY_API_KEY");
  });

  it("lança erro com status e URL em resposta não-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ error: "taxId inválido" }),
      })
    );

    await expect(
      abacateCreateCustomer({ name: "X", email: "x@x.com", taxId: "000" })
    ).rejects.toThrow("422");
  });
});

describe("abacateCreateBilling", () => {
  beforeEach(() => {
    process.env.ABACATEPAY_API_KEY = "abc_dev_test";
  });

  afterEach(() => {
    process.env.ABACATEPAY_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("retorna os dados da cobrança criada", async () => {
    const billingData = {
      id: "bill_xyz",
      url: "https://pay.abacatepay.com/bill_xyz",
      status: "PENDING",
      brCode: "00020101...",
      brCodeBase64: "data:image/png;base64,iVBORw0KGgo=",
      devMode: true,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ data: billingData, error: null }),
      })
    );

    const result = await abacateCreateBilling({
      items: [
        { externalId: "professor-monthly", name: "Argila - Professor", quantity: 1, price: 2900 },
      ],
      frequency: "ONE_TIME",
      methods: ["PIX"],
      customerId: "cust_abc",
      externalId: "session-uuid",
      returnUrl: "https://studio.argila.app/checkout/aguardando/session-uuid",
      completionUrl: "https://studio.argila.app/planos",
    });

    expect(result.id).toBe("bill_xyz");
    expect(result.brCode).toBe("00020101...");

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/billing/create");
  });
});

describe("extractPixBase64", () => {
  it("remove o prefixo data URI do base64", () => {
    const raw = "data:image/png;base64,iVBORw0KGgo=";
    expect(extractPixBase64(raw)).toBe("iVBORw0KGgo=");
  });

  it("retorna undefined quando não há valor", () => {
    expect(extractPixBase64(undefined)).toBeUndefined();
    expect(extractPixBase64("")).toBeUndefined();
  });

  it("retorna o valor intacto se não tiver prefixo data URI", () => {
    expect(extractPixBase64("iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });
});
