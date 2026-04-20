/**
 * Cliente HTTP mínimo para API Abacatepay.
 * @see https://docs.abacatepay.com/api-reference/criar-um-novo-cliente
 * @see https://docs.abacatepay.com/api-reference/criar-uma-nova-cobrança
 */

const ABACATEPAY_BASE_URL = "https://api.abacatepay.com/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringifyProviderError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (isRecord(error)) {
    const message = error.message ?? error.description ?? error.code;
    if (message) return String(message);
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

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
      isRecord(json) && "error" in json
        ? stringifyProviderError(json.error)
        : text.slice(0, 300);
    throw new Error(`Abacatepay ${res.status} em ${url}${msg ? `: ${msg}` : ""}`);
  }
  if (isRecord(json) && "error" in json) {
    const msg = stringifyProviderError(json.error);
    if (msg) throw new Error(`Abacatepay em ${url}: ${msg}`);
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
  data: { id: string; metadata?: unknown } | null;
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
  if (!res.data?.id) {
    throw new Error("Abacatepay não retornou dados do cliente.");
  }
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
  methods: ("PIX" | "CARD")[];
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
  customerId?: string | null;
  customer?: { id?: string; metadata?: unknown } | null;
  devMode: boolean;
  [key: string]: unknown;
};

type AbacateBillingApiResponse = {
  data: AbacateBillingData | null;
  error: null | string;
};

/** Cria uma cobrança no Abacatepay e retorna os dados da cobrança. */
export async function abacateCreateBilling(
  body: AbacateBillingCreate
): Promise<AbacateBillingData> {
  const { items, ...rest } = body;
  const res = await abacateFetch<AbacateBillingApiResponse>(
    "/billing/create",
    { method: "POST", body: JSON.stringify({ ...rest, products: items }) }
  );
  if (!res.data?.id || !res.data.url) {
    throw new Error("Abacatepay não retornou dados da cobrança.");
  }
  return res.data;
}

export function getAbacateBillingCustomerId(
  billing: AbacateBillingData
): string | null {
  return billing.customerId ?? billing.customer?.id ?? null;
}

/**
 * Extrai o base64 puro do QR code PIX (sem o prefixo data URI).
 * A UI do CheckoutAwaitingClient prefixia "data:image/png;base64," ao renderizar.
 */
export function extractPixBase64(brCodeBase64?: string): string | undefined {
  if (!brCodeBase64) return undefined;
  return brCodeBase64.replace(/^data:image\/\w+;base64,/, "");
}
