"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logRegularizePaymentClicked } from "@/actions/billing";

export function PastDueGate({
  pastDue,
  children,
}: {
  pastDue: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const allowWithoutModal =
    pathname.startsWith("/checkout") || pathname.startsWith("/primeiro-aceite");

  return (
    <>
      {children}
      {pastDue && !allowWithoutModal && <PastDueBlockingModal />}
    </>
  );
}

function PastDueBlockingModal() {
  useEffect(() => {
    void logRegularizePaymentClicked();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,18,28,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="past-due-title"
    >
      <div
        className="max-w-md rounded-2xl p-6 shadow-xl"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
        }}
      >
        <h2
          id="past-due-title"
          className="mb-2 text-lg font-bold"
          style={{ color: "var(--argila-darkest)" }}
        >
          Pagamento em atraso
        </h2>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--color-text-sec)" }}>
          Sua assinatura Professor está em <strong>inadimplência</strong>. Regularize o pagamento
          para voltar a usar turmas, relatórios e recursos premium.
        </p>
        <Link
          href="/checkout?billingCycle=monthly&entrypoint=studio_plans"
          className="argila-btn argila-btn-primary inline-flex w-full justify-center"
        >
          Regularizar pagamento
        </Link>
      </div>
    </div>
  );
}
