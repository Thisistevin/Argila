"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelSubscriptionAtPeriodEnd,
  requestAccountDeletion,
  undoCancelSubscription,
} from "@/actions/billing";
import { PlanDecisionModal } from "@/components/billing/PlanDecisionModal";
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
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const premium = isProfessorPremium(sub);
  const cancelScheduled = isCancelScheduled(latest);

  async function confirmCancelEnd() {
    setModalError(null);
    setBusy(true);
    const r = await cancelSubscriptionAtPeriodEnd();
    setBusy(false);
    if (!r.ok) {
      setModalError(r.error);
      return;
    }
    setCancelModalOpen(false);
    router.refresh();
  }

  async function runUndoCancel() {
    setMsg(null);
    setBusy(true);
    const r = await undoCancelSubscription();
    setBusy(false);
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function confirmDeleteAccount() {
    setModalError(null);
    setBusy(true);
    const r = await requestAccountDeletion();
    setBusy(false);
    if (!r.ok) {
      setModalError(r.error);
      return;
    }
    setDeleteModalOpen(false);
    window.location.href = "/exclusao-agendada";
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
            onClick={() => {
              setModalError(null);
              setCancelModalOpen(true);
            }}
            className="argila-btn argila-btn-ghost text-sm"
          >
            Cancelar ao fim do período
          </button>
        )}
        {premium && cancelScheduled && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runUndoCancel()}
            className="argila-btn argila-btn-primary text-sm"
          >
            Continuar no plano Professor
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setModalError(null);
            setDeleteModalOpen(true);
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--color-error)" }}
        >
          Solicitar exclusão da conta
        </button>
      </div>

      {cancelModalOpen && (
        <PlanDecisionModal
          title="Cancelar plano Professor?"
          description={
            <p>
              Você continuará com os recursos do plano Professor até o fim do período pago. Depois
              disso, ao fazer downgrade para Explorar, turmas, relatórios, jornadas e métricas premium
              serão bloqueados. Dados exclusivos do Professor poderão ser excluídos após 90 dias.
            </p>
          }
          busy={busy}
          error={modalError}
          primary={{
            label: "Continuar no plano Professor",
            onClick: () => setCancelModalOpen(false),
          }}
          secondary={{
            label: "Fazer downgrade ao fim do período",
            destructive: true,
            onClick: () => void confirmCancelEnd(),
          }}
        />
      )}

      {deleteModalOpen && (
        <PlanDecisionModal
          title="Solicitar exclusão da conta?"
          description={
            <p>
              Seus dados serão removidos após o prazo de retenção, conforme a política de privacidade.
            </p>
          }
          busy={busy}
          error={modalError}
          primary={{
            label: "Não, voltar",
            onClick: () => setDeleteModalOpen(false),
          }}
          secondary={{
            label: "Sim, solicitar exclusão",
            destructive: true,
            onClick: () => void confirmDeleteAccount(),
          }}
        />
      )}
    </div>
  );
}
