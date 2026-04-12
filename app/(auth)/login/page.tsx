import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const next = p.next ?? "/diario";

  return (
    <div className="w-full max-w-sm">
      {/* Logo mobile-only */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <Image src="/isotipo.svg" alt="Argila" width={30} height={30} />
        <span
          className="font-bold"
          style={{
            fontFamily: "var(--font-logo)",
            letterSpacing: "var(--logo-tracking)",
            color: "var(--argila-darkest)",
            fontSize: "var(--text-lg)",
          }}
        >
          Argila
        </span>
      </div>

      <h1
        className="mb-1 text-xl font-bold"
        style={{ color: "var(--argila-darkest)" }}
      >
        Bem-vindo de volta
      </h1>
      <p
        className="mb-7 text-sm"
        style={{
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-secondary)",
        }}
      >
        Entre com magic link ou conta Google.
      </p>

      <LoginForm nextPath={next} />

      {p.error && (
        <p
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(226,75,75,0.08)",
            color: "var(--color-error)",
            border: "1px solid rgba(226,75,75,0.18)",
          }}
        >
          {p.error}
        </p>
      )}

      <p className="mt-6 text-center text-xs" style={{ color: "var(--color-text-subtle)" }}>
        <Link
          href="/"
          className="underline underline-offset-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          Voltar para o início
        </Link>
      </p>
    </div>
  );
}
