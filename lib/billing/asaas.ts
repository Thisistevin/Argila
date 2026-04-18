/**
 * Cliente HTTP mínimo para API Asaas v3.
 * @see https://docs.asaas.com/reference/criar-nova-cobranca
 * @see https://docs.asaas.com/reference/criar-novo-cliente
 */

const DEFAULT_ASAAS_BASE_URL = "https://api-sandbox.asaas.com";

export function normalizeAsaasBaseUrl(raw?: string): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_ASAAS_BASE_URL;

  try {
    let url = new URL(value);

    if (url.hostname === "sandbox.asaas.com") {
      url = new URL(DEFAULT_ASAAS_BASE_URL);
    } else if (url.hostname === "asaas.com" || url.hostname === "www.asaas.com") {
      url = new URL("https://api.asaas.com");
    }

    url.pathname = url.pathname.replace(/\/(api\/)?v3\/?$/, "");
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return value
      .replace(/\/(api\/)?v3\/?$/, "")
      .replace(/\/+$/, "");
  }
}

function getAsaasBaseUrl(): string {
  return normalizeAsaasBaseUrl(process.env.ASAAS_API_BASE_URL);
}

function getApiKey(): string {
  const k = process.env.ASAAS_API_KEY?.trim();
  if (!k) throw new Error("ASAAS_API_KEY não configurada.");
  return k;
}

async function asaasFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${getAsaasBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: getApiKey(),
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Asaas resposta não-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "errors" in json
        ? JSON.stringify((json as { errors: unknown }).errors)
        : text.slice(0, 300);
    const hint =
      res.status === 404
        ? " Verifique ASAAS_API_BASE_URL; a base não deve duplicar /v3 nem usar o domínio web do painel."
        : "";
    throw new Error(`Asaas ${res.status} em ${url}${msg ? `: ${msg}` : ""}${hint}`);
  }
  return json as T;
}

export type AsaasCustomerCreate = {
  name: string;
  email: string;
  cpfCnpj?: string;
  externalReference?: string;
};

export type AsaasCustomerResponse = {
  id: string;
  [key: string]: unknown;
};

export async function asaasCreateCustomer(
  body: AsaasCustomerCreate
): Promise<AsaasCustomerResponse> {
  return asaasFetch<AsaasCustomerResponse>("/v3/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function asaasUpdateCustomer(
  id: string,
  body: Partial<AsaasCustomerCreate>
): Promise<AsaasCustomerResponse> {
  return asaasFetch<AsaasCustomerResponse>(`/v3/customers/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type AsaasPaymentCreate = {
  customer: string;
  billingType: "PIX" | "CREDIT_CARD" | "UNDEFINED";
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
};

export type AsaasPaymentResponse = {
  id: string;
  invoiceUrl?: string;
  status?: string;
  [key: string]: unknown;
};

export async function asaasCreatePayment(
  body: AsaasPaymentCreate
): Promise<AsaasPaymentResponse> {
  return asaasFetch<AsaasPaymentResponse>("/v3/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type AsaasPixQrCodeResponse = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
  [key: string]: unknown;
};

export async function asaasGetPixQrCode(
  paymentId: string
): Promise<AsaasPixQrCodeResponse> {
  return asaasFetch<AsaasPixQrCodeResponse>(
    `/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`
  );
}
