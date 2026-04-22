"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  downgradeToExplore,
  logTrialUpgradeClicked,
} from "@/actions/billing";
import type { SubscriptionRow } from "@/lib/entitlement";
import { requiresPlanDecision } from "@/lib/entitlement";
import { PlanDecisionModal } from "@/components/billing/PlanDecisionModal";

const ALLOWLIST_PREFIXES = [
  "/planos",
  "/checkout",
  "/primeiro-aceite",
  "/privacidade",
  "/termos",
  "/exclusao-agendada",
];

export function PlanDecisionGate({
  pastDue,
  latest,
  children,
}: {
  pastDue: boolean;
  latest: SubscriptionRow | null;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const needsDecision = Boolean(!pastDue && requiresPlanDecision(latest));
  const allowlisted = ALLOWLIST_PREFIXES.some((p) => pathname.startsWith(p));
  const showBlocking = needsDecision && !allowlisted;

  return (
    <>
      {children}
      {showBlocking && (
        <PlanDecisionModal
          blocking
          title="Seu teste do plano Professor terminou"
          description={
            <p>
              Para continuar usando recursos do plano Professor, assine o plano. Se fizer
              downgrade para Explorar, turmas, relatórios, jornadas e métricas premium serão
              bloqueados. Dados exclusivos do Professor poderão ser excluídos após 90 dias.
            </p>
          }
          busy={busy}
          error={err}
          primary={{
            label: "Assinar plano Professor",
            href: "/checkout?billingCycle=monthly&entrypoint=studio_plans",
            onClick: () => {
              void logTrialUpgradeClicked();
            },
          }}
          secondary={{
            label: "Fazer downgrade para Explorar",
            destructive: true,
            onClick: async () => {
              setErr(null);
              setBusy(true);
              const r = await downgradeToExplore({ reason: "trial_expired" });
              setBusy(false);
              if (!r.ok) {
                setErr(r.error);
                return;
              }
              router.refresh();
            },
          }}
        />
      )}
    </>
  );
}
