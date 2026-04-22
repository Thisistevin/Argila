"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 md:block">
        {sidebar}
      </div>

      {/* Mobile: backdrop */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.50)" }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile: sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden"
          style={{
            background: "var(--argila-darkest)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? (
              <X className="size-5 text-white" />
            ) : (
              <Menu className="size-5 text-white" />
            )}
          </button>
          <Image
            src="/argila-logotipo-texto-claro.png"
            alt="Argila"
            width={80}
            height={64}
            className="h-auto w-[72px] object-contain object-left"
            priority
          />
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-auto"
          style={{ background: "var(--color-bg)" }}
        >
          <div className="mx-auto max-w-4xl p-4 md:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
