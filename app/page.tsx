import Image from "next/image";
import Link from "next/link";

/** Smoke M1 + landing mínima — tokens do design system aplicados via globals.css */
export default function HomePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <Image
        src="/isotipo.svg"
        alt="Argila"
        width={80}
        height={80}
        priority
      />
      <div className="text-center max-w-md">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ color: "var(--argila-darkest)" }}
        >
          Argila
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Diário de aula com IA, perfil do aluno e relatórios — smoke visual OK.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: "var(--argila-indigo)",
            boxShadow: "var(--shadow-indigo)",
          }}
        >
          Entrar
        </Link>
      </div>
      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        OK
      </p>
    </div>
  );
}
