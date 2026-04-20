/**
 * Cliente HTTP mínimo para API Abacatepay v2.
 * @see https://docs.abacatepay.com/api-reference/criar-um-novo-cliente
 * @see https://docs.abacatepay.com/api-reference/criar-uma-nova-cobrança
 */

const ABACATEPAY_BASE_URL = "https://api.abacatepay.com";

function getApiKey(): string {
  const k = process.env.ABACATEPAY_API_KEY?.trim();
  if (!k) throw new Error("ABACATEPAY_API_KEY não configurada.");
  return k;
}

async function abacateFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ABACATEPAY_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Abacatepay resposta não-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? String((json as { error: unknown }).error)
        : text.slice(0, 300);
    throw new Error(`Abacatepay ${res.status} em ${url}${msg ? `: ${msg}` : ""}`);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export type AbacateCustomerCreate = {
  name: string;
  email: string;
  cellphone?: string;
  taxId?: string;
};

type AbacateCustomerApiResponse = {
  data: { id: string; metadata?: unknown };
  error: null | string;
};

/** Cria um cliente no Abacatepay e retorna o ID ("cust_..."). */
export async function abacateCreateCustomer(
  body: AbacateCustomerCreate
): Promise<string> {
  const res = await abacateFetch<AbacateCustomerApiResponse>(
    "/customer/create",
    { method: "POST", body: JSON.stringify(body) }
  );
  return res.data.id;
}

// ---------------------------------------------------------------------------
// Billing / Checkout
// ---------------------------------------------------------------------------

export type AbacateBillingItem = {
  externalId: string;
  name: string;
  quantity: number;
  price: number; // centavos
};

export type AbacateBillingCreate = {
  items: AbacateBillingItem[];
  frequency: "ONE_TIME" | "MULTIPLE_PAYMENTS";
  methods: ("PIX" | "CREDIT_CARD")[];
  /** ID de cliente já existente. Use este OU `customer` (inline). */
  customerId?: string;
  /** Customer inline — usado quando ainda não existe ID salvo. */
  customer?: AbacateCustomerCreate;
  externalId: string; // nosso checkout_session UUID
  returnUrl: string;
  completionUrl: string;
};

export type AbacateBillingData = {
  id: string;
  url: string;
  status: string;
  brCode?: string;
  brCodeBase64?: string;
  customerId?: string;
  devMode: boolean;
  [key: string]: unknown;
};

type AbacateBillingApiResponse = {
  data: AbacateBillingData;
  error: null | string;
};

/** Cria uma cobrança no Abacatepay e retorna os dados da cobrança. */
export async function abacateCreateBilling(
  body: AbacateBillingCreate
): Promise<AbacateBillingData> {
  const res = await abacateFetch<AbacateBillingApiResponse>(
    "/billing/create",
    { method: "POST", body: JSON.stringify(body) }
  );
  return res.data;
}

/**
 * Extrai o base64 puro do QR code PIX (sem o prefixo data URI).
 * A UI do CheckoutAwaitingClient prefixia "data:image/png;base64," ao renderizar.
 */
export function extractPixBase64(brCodeBase64?: string): string | undefined {
  if (!brCodeBase64) return undefined;
  return brCodeBase64.replace(/^data:image\/\w+;base64,/, "");
}
