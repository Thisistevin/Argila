"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, CreditCard, Shield, Route } from "lucide-react";

const NAV = [
  { href: "/diario", label: "Diário", Icon: BookOpen },
  { href: "/galeria", label: "Galeria", Icon: Users },
  { href: "/jornadas", label: "Jornadas", Icon: Route },
  { href: "/planos", label: "Planos", Icon: CreditCard },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col">
      <div
        className="px-5 pb-2 text-[9px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.28)" }}
      >
        Principal
      </div>

      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="group relative flex items-center gap-3 px-5 py-2 font-medium transition-colors hover:bg-white/5 hover:text-white/85 focus-visible:outline-none"
            style={{
              fontSize: "var(--text-sm)",
              ...(active
                ? {
                    background: "rgba(79,207,216,0.10)",
                    color: "#fff",
                    boxShadow: "inset 3px 0 0 var(--argila-teal)",
                  }
                : { color: "rgba(255,255,255,0.50)" }),
            }}
          >
            <Icon
              className="shrink-0 transition-colors"
              style={{
                color: active ? "var(--argila-teal)" : "rgba(255,255,255,0.35)",
                width: 18,
                height: 18,
              }}
            />
            {label}
          </Link>
        );
      })}

      <div
        className="px-5 pb-2 pt-4 text-[9px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.28)" }}
      >
        Sistema
      </div>

      <Link
        href="/privacidade"
        className="flex items-center gap-3 px-5 py-2 font-medium transition-colors hover:bg-white/5 hover:text-white/85"
        style={{ color: "rgba(255,255,255,0.50)", fontSize: "var(--text-sm)" }}
      >
        <Shield
          className="shrink-0"
          style={{ color: "rgba(255,255,255,0.35)", width: 14, height: 14 }}
        />
        Privacidade
      </Link>
    </nav>
  );
}
