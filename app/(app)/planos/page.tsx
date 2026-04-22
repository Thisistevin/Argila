import Link from "next/link";
import { recordFunnelViewPlan } from "@/actions/billing";
import { createClient } from "@/lib/supabase/server";
import { PlanosBillingToggle } from "@/components/billing/PlanosBillingToggle";
import { PlanosManageSubscription } from "@/components/billing/PlanosManageSubscription";
import {
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
  isProfessorPremium,
} from "@/lib/entitlement";
import { Check, Zap } from "lucide-react";

const EXPLORAR_FEATURES = [
  "Até 5 alunos",
  "Diário de aula com IA",
  "Perfil básico do aluno",
  "5 etapas adaptativas por diário",
];

const PROFESSOR_FEATURES = [
  "Até 40 alunos",
  "Turmas organizadas",
  "Relatórios IA por aluno",
  "Compartilhamento por link",
  "Indicador de atenção (AttentionBadge)",
  "Perfil completo com histórico e scores",
];

function statusLabel(status: string) {
  if (status === "trialing") return "trial";
  if (status === "trial_expired") return "trial expirado";
  if (status === "past_due") return "inadimplente";
  return status;
}

function statusStyle(status: string) {
  if (status === "active" || status === "trialing") {
    return {
      background: "rgba(39,176,139,0.12)",
      color: "var(--color-success)",
    };
  }
  if (status === "past_due") {
    return {
      background: "rgba(226,75,75,0.10)",
      color: "var(--color-error)",
    };
  }
  return {
    background: "rgba(120,120,120,0.10)",
    color: "var(--color-text-muted)",
  };
}

export default async function PlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sub = user ? await getActiveSubscription(supabase, user.id) : null;
  const latest = user ? await getLatestSubscription(supabase, user.id) : null;
  if (user) {
    void recordFunnelViewPlan({
      entrypoint: "studio_plans",
      surface: "planos",
    });
  }
  const premium = isProfessorPremium(sub);
  const pastDue = Boolean(latest && latest.plan === "professor" && isPastDue(latest));

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          className="font-bold"
          style={{
            color: "var(--argila-darkest)",
            fontSize: "var(--text-2xl)",
            letterSpacing: "-0.02em",
            marginBottom: "var(--space-1)",
          }}
        >
          Planos
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
          Escolha o plano ideal para o seu ritmo de ensino. Pagamentos via Abacatepay (PIX ou cartão).
        </p>
      </div>

      {pastDue && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(226,75,75,0.08)",
            border: "1px solid rgba(226,75,75,0.22)",
            color: "var(--color-error)",
          }}
        >
          Sua assinatura está <strong>inadimplente</strong>.{" "}
          <Link
            href="/checkout?billingCycle=monthly&entrypoint=studio_plans"
            className="font-semibold underline underline-offset-2"
          >
            Regularizar pagamento
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2" style={{ gap: "var(--space-5)" }}>
        <div
          className="flex flex-col"
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            border: premium
              ? "1px solid var(--color-border)"
              : "1.5px solid var(--argila-indigo)",
            boxShadow: premium ? "var(--shadow-sm)" : "var(--shadow-indigo)",
            padding: "var(--space-6)",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: "var(--space-1)" }}
          >
            <p
              className="font-semibold uppercase"
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
              }}
            >
              Explorar
            </p>
            {!premium && (
              <span
                className="rounded-full font-semibold uppercase"
                style={{
                  background: "rgba(62,57,145,0.10)",
                  color: "var(--argila-indigo)",
                  fontSize: "var(--text-xs)",
                  padding: "3px 9px",
                  letterSpacing: "0.06em",
                }}
              >
                Plano atual
              </span>
            )}
          </div>
          <p
            className="font-bold"
            style={{
              color: "var(--argila-darkest)",
              fontSize: "var(--text-3xl)",
              marginBottom: "var(--space-5)",
            }}
          >
            R$ 0
          </p>
          <ul className="flex flex-col" style={{ gap: "var(--space-3)" }}>
            {EXPLORAR_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start"
                style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}
              >
                <Check
                  className="shrink-0"
                  style={{
                    color: "var(--color-success)",
                    width: 16,
                    height: 16,
                    marginTop: 2,
                  }}
                />
                <span style={{ color: "var(--color-text-sec)" }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            background: "var(--gradient-brand)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-xl)",
            padding: "var(--space-6)",
          }}
        >
          <div
            className="pointer-events-none absolute"
            style={{
              right: -20,
              bottom: -20,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(79,207,216,0.20) 0%, transparent 70%)",
            }}
          />

          <div
            className="relative z-10 flex items-center justify-between"
            style={{ marginBottom: "var(--space-1)" }}
          >
            <p
              className="font-semibold uppercase"
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
              }}
            >
              Professor
            </p>
            {premium && (
              <span
                className="rounded-full font-semibold uppercase"
                style={{
                  background: "rgba(79,207,216,0.18)",
                  color: "var(--argila-teal)",
                  border: "1px solid rgba(79,207,216,0.30)",
                  fontSize: "var(--text-xs)",
                  padding: "3px 9px",
                  letterSpacing: "0.06em",
                }}
              >
                Plano atual
              </span>
            )}
          </div>

          <div
            className="relative z-10 flex flex-wrap items-end gap-4"
            style={{ marginBottom: "var(--space-1)" }}
          >
            <div className="flex items-end" style={{ gap: "var(--space-2)" }}>
              <p className="font-bold text-white" style={{ fontSize: "var(--text-3xl)" }}>
                R$ 29
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "var(--text-sm)",
                  marginBottom: 2,
                }}
              >
                /mês
              </p>
            </div>
            <p className="text-sm font-medium text-white/80">ou R$ 290/ano (2 meses grátis)</p>
          </div>
          <p
            className="relative z-10"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "var(--text-xs)",
              marginBottom: "var(--space-5)",
            }}
          >
            Cobrança segura via Abacatepay
          </p>

          <ul className="relative z-10 flex flex-col" style={{ gap: "var(--space-3)" }}>
            {PROFESSOR_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start"
                style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}
              >
                <Check
                  className="shrink-0"
                  style={{
                    color: "var(--argila-teal)",
                    width: 16,
                    height: 16,
                    marginTop: 2,
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.82)" }}>{f}</span>
              </li>
            ))}
          </ul>

          {!premium && !pastDue && <PlanosBillingToggle />}
          {pastDue && (
            <div className="relative z-10 mt-6">
              <Link
                href="/checkout?billingCycle=monthly&entrypoint=studio_plans"
                className="argila-btn inline-flex w-full justify-center text-center"
                style={{
                  background: "var(--argila-teal)",
                  color: "var(--argila-darkest)",
                  fontWeight: 600,
                }}
              >
                Regularizar pagamento
              </Link>
            </div>
          )}
          {!premium && (
            <p
              className="relative z-10 mt-3 flex items-center justify-center"
              style={{
                color: "rgba(255,255,255,0.50)",
                fontSize: "var(--text-xs)",
                gap: "var(--space-2)",
              }}
            >
              <Zap style={{ color: "var(--argila-teal)", width: 14, height: 14 }} />
              Trial na landing conforme configuração atual
            </p>
          )}
        </div>
      </div>

      {latest && (
        <div
          className="flex flex-wrap items-center"
          style={{
            marginTop: "var(--space-6)",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-3) var(--space-5)",
            fontSize: "var(--text-sm)",
            gap: "var(--space-3)",
          }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>Assinatura atual:</span>
          <span className="font-semibold" style={{ color: "var(--argila-darkest)" }}>
            {latest.plan}
          </span>
          <span className="rounded-full font-semibold" style={{ padding: "3px 9px", fontSize: "var(--text-xs)", ...statusStyle(latest.status) }}>
            {statusLabel(latest.status)}
          </span>
          <span style={{ color: "var(--color-text-subtle)" }}>
            até {new Date(latest.period_end).toLocaleDateString("pt-BR")}
          </span>
          <span style={{ color: "var(--color-text-subtle)" }}>via {latest.source}</span>
        </div>
      )}

      {user && <PlanosManageSubscription sub={sub} latest={latest} />}
    </div>
  );
}
