"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordLegalAcceptance } from "@/actions/billing";
import { sanitizeInternalNextPath } from "@/lib/site-url";
import Link from "next/link";

export function LegalFirstAcceptForm({
  termsVersion,
  privacyVersion,
  nextPath,
}: {
  termsVersion: string;
  privacyVersion: string;
  nextPath: string;
}) {
  const router = useRouter();
  const next = sanitizeInternalNextPath(nextPath || "/diario");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError("Marque a caixa para continuar.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await recordLegalAcceptance({
      kind: "first_acceptance",
      termsVersion,
      privacyVersion,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm" style={{ color: "var(--color-text-sec)" }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" className="underline underline-offset-2" target="_blank">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="underline underline-offset-2" target="_blank">
            Política de Privacidade
          </Link>{" "}
          (versões atuais).
        </span>
      </label>
      {error && (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="argila-btn argila-btn-primary w-full">
        {busy ? "A guardar…" : "Continuar"}
      </button>
    </form>
  );
}
