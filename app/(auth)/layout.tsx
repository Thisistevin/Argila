import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — oculto no mobile */}
      <div
        className="relative hidden lg:flex lg:w-[460px] shrink-0 flex-col items-center justify-center overflow-hidden p-12"
        style={{ background: "var(--gradient-brand)" }}
      >
        {/* Teal bloom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 60% at 50% 20%, rgba(79,207,216,0.16) 0%, transparent 60%)",
          }}
        />
        {/* Decorative ring */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4"
          style={{
            width: 360,
            height: 360,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3"
          style={{
            width: 240,
            height: 240,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src="/isotipo.svg"
            alt="Argila"
            width={56}
            height={56}
            className="mb-5"
            style={{ filter: "drop-shadow(0 0 18px rgba(79,207,216,0.5))" }}
          />
          <h1
            className="mb-2 text-3xl font-bold text-white"
            style={{
              fontFamily: "var(--font-logo)",
              letterSpacing: "var(--logo-tracking)",
            }}
          >
            Argila
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{
              fontFamily: "var(--font-secondary)",
              color: "rgba(255,255,255,0.55)",
              maxWidth: "26ch",
            }}
          >
            Escreva, reflita, evolua.
            <br />
            IA para registrar cada aula.
          </p>
        </div>
      </div>

      {/* Painel do formulário */}
      <div
        className="flex flex-1 items-center justify-center p-6"
        style={{ background: "var(--color-bg)" }}
      >
        {children}
      </div>
    </div>
  );
}
