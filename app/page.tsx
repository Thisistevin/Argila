import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--argila-darkest)" }}
    >
      {/* Radial glow centro */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 38%, rgba(62,57,145,0.55) 0%, transparent 70%)",
        }}
      />
      {/* Teal bloom atrás do isotipo */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 340,
          height: 340,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -68%)",
          background:
            "radial-gradient(circle, rgba(79,207,216,0.13) 0%, transparent 70%)",
        }}
      />

      {/* Conteúdo principal */}
      <div className="animate-fade-up relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative mb-7">
          <Image
            src="/isotipo.svg"
            alt="Argila"
            width={68}
            height={68}
            priority
            style={{ filter: "drop-shadow(0 0 22px rgba(79,207,216,0.55))" }}
          />
        </div>

        <h1
          className="mb-3 text-5xl font-bold text-white"
          style={{
            fontFamily: "var(--font-logo)",
            letterSpacing: "var(--logo-tracking)",
          }}
        >
          Argila
        </h1>

        <p
          className="mb-9 leading-relaxed"
          style={{
            fontFamily: "var(--font-secondary)",
            color: "rgba(255,255,255,0.58)",
            fontSize: "var(--text-base)",
            maxWidth: "34ch",
          }}
        >
          Diário de aula com IA, perfil do aluno
          <br />e relatórios compartilháveis.
        </p>

        <Link
          href="/login"
          className="argila-btn argila-btn-teal animate-fade-up delay-200 px-8"
          style={{ fontSize: "var(--text-sm)" }}
        >
          Entrar
        </Link>
      </div>

      {/* Feature chips */}
      <div className="animate-fade-in delay-300 relative z-10 mt-16 flex flex-wrap justify-center gap-2 px-6">
        {["Diário com IA", "Perfil do aluno", "Relatórios"].map((f) => (
          <span
            key={f}
            className="rounded-full px-3 py-1.5 text-xs"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.42)",
              border: "1px solid rgba(255,255,255,0.09)",
              fontFamily: "var(--font-secondary)",
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
