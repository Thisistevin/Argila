import Link from "next/link";
import { CheckoutForm } from "@/components/billing/CheckoutForm";

const entrypoints = new Set([
  "studio_plans",
  "landing_pricing_professor",
  "landing_cta",
]);

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    billingCycle?: string;
    entrypoint?: string;
  }>;
}) {
  const p = await searchParams;
  const bc =
    p.billingCycle === "annual" || p.billingCycle === "monthly"
      ? p.billingCycle
      : "monthly";
  const ep = p.entrypoint && entrypoints.has(p.entrypoint) ? p.entrypoint : "studio_plans";

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center gap-5 py-10">
      <div className="w-full max-w-3xl">
        <Link href="/planos" className="text-sm underline-offset-2 hover:underline" style={{ color: "var(--color-text-muted)" }}>
          ← Voltar aos planos
        </Link>
      </div>
      <CheckoutForm billingCycle={bc} entrypoint={ep as "studio_plans" | "landing_pricing_professor" | "landing_cta"} />
    </div>
  );
}
