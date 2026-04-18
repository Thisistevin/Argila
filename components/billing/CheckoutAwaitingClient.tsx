"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PollPayload = {
  status: string;
  paidAt: string | null;
  awaitingPaymentPayload: Record<string, unknown> | null;
  redirectTo: string | null;
};

export function CheckoutAwaitingClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PollPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/billing/checkout/${sessionId}`, {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (res.status === 401) {
            setErr("Sessão expirada. Inicie sessão novamente.");
            return;
          }
          setErr("Não foi possível carregar o estado do pagamento.");
          return;
        }
        const json = (await res.json()) as PollPayload;
        if (cancelled) return;
        setData(json);
        if (json.redirectTo) {
          router.replace(json.redirectTo);
        }
      } catch {
        if (!cancelled) setErr("Erro de rede.");
      }
    }
    void poll();
    const id = window.setInterval(poll, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, router]);

  const pix = data?.awaitingPaymentPayload as {
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
    dev?: boolean;
    message?: string;
  } | null;

  return (
    <div
      className="mx-auto max-w-md space-y-4 rounded-2xl p-6"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
      }}
    >
      <h1 className="text-xl font-bold" style={{ color: "var(--argila-darkest)" }}>
        Aguardando pagamento
      </h1>
      {err && (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          {err}
        </p>
      )}
      {!data && !err && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          A carregar…
        </p>
      )}
      {data && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Estado: <strong>{data.status}</strong>
        </p>
      )}
      {pix?.encodedImage && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt="QR Code PIX"
            width={200}
            height={200}
          />
        </div>
      )}
      {pix?.payload && (
        <div>
          <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Copia e cola
          </p>
          <textarea
            readOnly
            className="argila-input w-full font-mono text-xs"
            rows={4}
            value={pix.payload}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
      {pix?.dev && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {String(pix.message ?? "Modo desenvolvimento.")}
        </p>
      )}
    </div>
  );
}
