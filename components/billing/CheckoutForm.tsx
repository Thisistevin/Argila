"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { startCheckout } from "@/actions/billing";

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

type Entrypoint = "studio_plans" | "landing_pricing_professor" | "landing_cta";

export function CheckoutForm({
  billingCycle,
  entrypoint,
}: {
  billingCycle: "monthly" | "annual";
  entrypoint: Entrypoint;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [stateUf, setStateUf] = useState<string>("SP");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (billingCycle === "monthly" ? "Professor — mensal" : "Professor — anual"),
    [billingCycle]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await startCheckout({
      billingCycle,
      entrypoint,
      paymentMethod,
      fullName: fullName.trim(),
      country: "BR",
      state: stateUf,
      couponCode: couponCode.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.externalRedirect && r.redirectTo.startsWith("http")) {
      window.location.href = r.redirectTo;
      return;
    }
    router.push(r.redirectTo);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md space-y-4 rounded-2xl p-6"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
      }}
    >
      <h1 className="text-xl font-bold" style={{ color: "var(--argila-darkest)" }}>
        {title}
      </h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Pagamento processado pela Asaas (PIX ou cartão). Preencha os dados para gerar a cobrança.
      </p>
      <label className="block text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
        Nome completo
        <input
          className="argila-input mt-1 w-full"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
        Estado (UF)
        <select
          className="argila-input mt-1 w-full"
          value={stateUf}
          onChange={(e) => setStateUf(e.target.value)}
        >
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
          Forma de pagamento
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pm"
            checked={paymentMethod === "pix"}
            onChange={() => setPaymentMethod("pix")}
          />
          PIX
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pm"
            checked={paymentMethod === "card"}
            onChange={() => setPaymentMethod("card")}
          />
          Cartão (link seguro Asaas)
        </label>
      </fieldset>
      <label className="block text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
        Cupom (opcional)
        <input
          className="argila-input mt-1 w-full"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="Ex.: ARGILA20"
        />
      </label>
      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(226,75,75,0.08)", color: "var(--color-error)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="argila-btn argila-btn-primary w-full">
        {busy ? "A processar…" : "Continuar"}
      </button>
    </form>
  );
}
