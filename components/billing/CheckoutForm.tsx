"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { recordFunnelSelectCycle, startCheckout } from "@/actions/billing";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
] as const;

type Entrypoint = "studio_plans" | "landing_pricing_professor" | "landing_cta";

function maskCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const PLAN_OPTIONS = [
  {
    cycle: "monthly" as const,
    label: "Mensal",
    price: "R$\u202f29",
    sub: "por mês",
    badge: null,
  },
  {
    cycle: "annual" as const,
    label: "Anual",
    price: "R$\u202f290",
    sub: "por ano",
    badge: "Economize 17%",
  },
];

export function CheckoutForm({
  billingCycle: initialBillingCycle,
  entrypoint,
}: {
  billingCycle: "monthly" | "annual";
  entrypoint: Entrypoint;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [stateUf, setStateUf] = useState("SP");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBillingCycle);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("card");
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void recordFunnelSelectCycle({
      entrypoint,
      billingCycle: initialBillingCycle,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só montagem: ciclo inicial da URL
  }, []);

  const selected = PLAN_OPTIONS.find((p) => p.cycle === billingCycle)!;

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
      cpfCnpj: cpfCnpj.trim() || null,
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
      className="w-full max-w-3xl rounded-2xl p-8"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
      }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--argila-darkest)" }}>
          Plano Professor
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Pagamento processado com segurança pela Abacatepay.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_272px]">
        {/* ── Coluna esquerda: dados do comprador ── */}
        <div className="space-y-4">
          <div>
            <span
              className="mb-2 block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Dados de cobrança
            </span>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
                  Nome completo
                </span>
                <input
                  className="argila-input mt-1 w-full"
                  placeholder="Seu nome completo"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
                  CPF ou CNPJ
                </span>
                <input
                  className="argila-input mt-1 w-full"
                  placeholder="000.000.000-00"
                  required
                  inputMode="numeric"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
                  Estado (UF)
                </span>
                <select
                  className="argila-input mt-1 w-full"
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value)}
                >
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <span
              className="mb-2 block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Forma de pagamento
            </span>
            <div
              className="flex overflow-hidden rounded-xl"
              style={{ border: "1.5px solid var(--color-border)" }}
            >
              {(["card", "pix"] as const).map((pm) => {
                const disabled = pm === "pix";
                return (
                  <button
                    key={pm}
                    type="button"
                    disabled={disabled}
                    aria-disabled={disabled}
                    onClick={() => {
                      if (!disabled) setPaymentMethod(pm);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    style={
                      paymentMethod === pm
                        ? { background: "var(--argila-darkest)", color: "#fff" }
                        : disabled
                          ? { background: "rgba(0,0,0,0.03)", color: "var(--color-text-muted)" }
                          : { background: "transparent", color: "var(--color-text-muted)" }
                    }
                  >
                    {pm === "pix" ? "PIX em breve" : "Cartão"}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Você será redirecionado para o link seguro da Abacatepay para inserir os dados do cartão.
              PIX será liberado em breve.
            </p>
          </div>
        </div>

        {/* ── Coluna direita: plano + resumo ── */}
        <div className="space-y-5 md:border-l md:pl-8" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <span
              className="mb-3 block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Plano
            </span>
            <div className="space-y-2">
              {PLAN_OPTIONS.map((opt) => {
                const active = billingCycle === opt.cycle;
                return (
                  <button
                    key={opt.cycle}
                    type="button"
                    onClick={() => {
                      setBillingCycle(opt.cycle);
                      void recordFunnelSelectCycle({
                        entrypoint,
                        billingCycle: opt.cycle,
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      border: `2px solid ${active ? "var(--argila-darkest)" : "var(--color-border)"}`,
                      background: active ? "rgba(0,0,0,0.03)" : "transparent",
                    }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        border: `2px solid ${active ? "var(--argila-darkest)" : "var(--color-border)"}`,
                        background: active ? "var(--argila-darkest)" : "transparent",
                      }}
                    >
                      {active && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-sm font-semibold"
                        style={{ color: "var(--argila-darkest)" }}
                      >
                        {opt.label}
                      </span>
                      <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {opt.price} {opt.sub}
                      </span>
                    </span>
                    {opt.badge && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
              Cupom{" "}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                (opcional)
              </span>
            </span>
            <input
              className="argila-input mt-1 w-full"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Ex.: ARGILA20"
            />
          </label>

          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Total
              </span>
              <span className="text-lg font-bold" style={{ color: "var(--argila-darkest)" }}>
                {selected.price}
                <span
                  className="ml-1 text-sm font-normal"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  /{billingCycle === "monthly" ? "mês" : "ano"}
                </span>
              </span>
            </div>
          </div>

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "rgba(226,75,75,0.08)",
                color: "var(--color-error)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="argila-btn argila-btn-primary w-full"
          >
            {busy ? "A processar…" : "Continuar"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline underline-offset-2">
              Termos de Uso
            </a>
            .
          </p>
        </div>
      </div>
    </form>
  );
}
