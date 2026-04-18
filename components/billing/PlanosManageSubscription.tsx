"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelSubscriptionAtPeriodEnd,
  requestAccountDeletion,
} from "@/actions/billing";
import type { SubscriptionRow } from "@/lib/entitlement";
import { isCancelScheduled, isProfessorPremium } from "@/lib/entitlement";

export function PlanosManageSubscription({
  sub,
  latest,
}: {
  sub: SubscriptionRow | null;
  latest: SubscriptionRow | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const premium = isProfessorPremium(sub);
  const cancelScheduled = isCancelScheduled(latest);

  async function cancelEnd() {
    if (!window.confirm("Cancelar ao fim do período atual? Você mantém o acesso até a data indicada.")) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await cancelSubscriptionAtPeriodEnd();
    setBusy(false);
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Solicitar exclusão da conta? Seus dados serão removidos após o prazo de retenção, conforme política de privacidade."
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await requestAccountDeletion();
    setBusy(false);
    if (!r.ok) setMsg(r.error);
    else {
      window.location.href = "/exclusao-agendada";
    }
  }

  if (!latest) return null;

  return (
    <div
      className="mt-8 rounded-2xl p-5"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <p className="mb-3 text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
        Gerir assinatura e conta
      </p>
      {cancelScheduled && (
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Cancelamento agendado ao fim do período. O plano voltará a Explorar na data indicada.
        </p>
      )}
      {msg && (
        <p className="mb-3 text-sm" style={{ color: "var(--color-error)" }}>
          {msg}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {premium && !cancelScheduled && (
          <button
            type="button"
            disabled={busy}
            onClick={cancelEnd}
            className="argila-btn argila-btn-ghost text-sm"
          >
            Cancelar ao fim do período
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={deleteAccount}
          className="rounded-lg px-3 py-2 text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--color-error)" }}
        >
          Solicitar exclusão da conta
        </button>
      </div>
    </div>
  );
}
