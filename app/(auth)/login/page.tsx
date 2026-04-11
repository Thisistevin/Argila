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
    <div
      className="w-full max-w-md rounded-2xl border p-8 shadow-md"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <h1
        className="text-xl font-bold mb-1"
        style={{ color: "var(--argila-darkest)" }}
      >
        Entrar na Argila
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
        Magic link ou Google — configure no Supabase Dashboard.
      </p>
      <LoginForm nextPath={next} />
      <p className="mt-6 text-center text-sm">
        <Link
          href="/"
          className="underline"
          style={{ color: "var(--argila-indigo)" }}
        >
          Voltar
        </Link>
      </p>
    </div>
  );
}
