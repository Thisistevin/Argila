import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  getLatestSubscription,
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

export default async function PlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sub = user ? await getActiveSubscription(supabase, user.id) : null;
  const latest = user ? await getLatestSubscription(supabase, user.id) : null;
  const premium = isProfessorPremium(sub);

  return (
    <div>
      {/* Header */}
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
          Escolha o plano ideal para o seu ritmo de ensino.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2" style={{ gap: "var(--space-5)" }}>
        {/* Explorar */}
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
          {/* Plan header */}
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

        {/* Professor */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            background: "var(--gradient-brand)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-xl)",
            padding: "var(--space-6)",
          }}
        >
          {/* Teal bloom */}
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

          {/* Plan header */}
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
            className="relative z-10 flex items-end"
            style={{ gap: "var(--space-2)", marginBottom: "var(--space-1)" }}
          >
            <p
              className="font-bold text-white"
              style={{ fontSize: "var(--text-3xl)" }}
            >
              R$ 29
            </p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "var(--text-sm)", marginBottom: 2 }}>
              /mês
            </p>
          </div>
          <p
            className="relative z-10"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "var(--text-xs)",
              marginBottom: "var(--space-5)",
            }}
          >
            ou R$ 290/ano (2 meses grátis)
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

          {!premium && (
            <div className="relative z-10" style={{ marginTop: "var(--space-6)" }}>
              <p
                className="flex items-center"
                style={{
                  color: "rgba(255,255,255,0.50)",
                  fontSize: "var(--text-xs)",
                  gap: "var(--space-2)",
                }}
              >
                <Zap style={{ color: "var(--argila-teal)", width: 14, height: 14 }} />
                Checkout via Asaas (PIX) ou Abacatepay (early access)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status atual */}
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
          <span
            className="rounded-full font-semibold"
            style={{
              padding: "3px 9px",
              fontSize: "var(--text-xs)",
              background:
                latest.status === "active"
                  ? "rgba(39,176,139,0.12)"
                  : "rgba(226,75,75,0.10)",
              color:
                latest.status === "active"
                  ? "var(--color-success)"
                  : "var(--color-error)",
            }}
          >
            {latest.status}
          </span>
          <span style={{ color: "var(--color-text-subtle)" }}>
            até {new Date(latest.period_end).toLocaleDateString("pt-BR")}
          </span>
          <span style={{ color: "var(--color-text-subtle)" }}>
            via {latest.source}
          </span>
        </div>
      )}
    </div>
  );
}
