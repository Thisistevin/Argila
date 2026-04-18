import Link from "next/link";
import { CheckoutAwaitingClient } from "@/components/billing/CheckoutAwaitingClient";

export default async function CheckoutAguardandoPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <div className="space-y-4">
      <Link href="/planos" className="text-sm underline-offset-2 hover:underline" style={{ color: "var(--color-text-muted)" }}>
        ← Planos
      </Link>
      <CheckoutAwaitingClient sessionId={sessionId} />
    </div>
  );
}
