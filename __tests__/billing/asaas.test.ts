import { describe, expect, it } from "vitest";
import { normalizeAsaasBaseUrl } from "@/lib/billing/asaas";

describe("normalizeAsaasBaseUrl", () => {
  it("usa sandbox da API quando a env estiver vazia", () => {
    expect(normalizeAsaasBaseUrl()).toBe("https://api-sandbox.asaas.com");
  });

  it("remove /v3 de uma base já correta", () => {
    expect(normalizeAsaasBaseUrl("https://api-sandbox.asaas.com/v3")).toBe(
      "https://api-sandbox.asaas.com"
    );
  });

  it("corrige a URL web do sandbox para a URL da API", () => {
    expect(normalizeAsaasBaseUrl("https://sandbox.asaas.com/api/v3")).toBe(
      "https://api-sandbox.asaas.com"
    );
  });

  it("corrige a URL web de produção para a URL da API", () => {
    expect(normalizeAsaasBaseUrl("https://www.asaas.com/api/v3")).toBe(
      "https://api.asaas.com"
    );
  });
});
