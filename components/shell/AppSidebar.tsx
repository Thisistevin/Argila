import Image from "next/image";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logout } from "@/actions/auth";
import { NavLinks } from "@/components/shell/NavLinks";

export function AppSidebar({ premium }: { premium: boolean }) {
  return (
    <aside
      className="flex h-full shrink-0 flex-col overflow-y-auto border-r py-6"
      style={{
        width: 216,
        background: "var(--argila-darkest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Brand */}
      <div
        className="mb-4 border-b px-5 pb-6"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center">
          <Image
            src="/argila-logotipo-texto-claro.png"
            alt="Argila"
            width={120}
            height={96}
            className="h-auto w-[112px] max-w-full shrink-0 object-contain object-left"
            priority
            sizes="112px"
          />
        </div>
      </div>

      {/* Nav links (client — active state) */}
      <NavLinks />

      {/* Bottom */}
      <div
        className="mt-auto border-t px-5 pt-4"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="pb-2 text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          Conta
        </div>

        {/* Plan badge */}
        <div className="mb-3.5 flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            Plano
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={
              premium
                ? {
                    background: "rgba(79,207,216,0.14)",
                    color: "var(--argila-teal)",
                    border: "1px solid rgba(79,207,216,0.22)",
                  }
                : {
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.48)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }
            }
          >
            {premium ? "Professor" : "Explorar"}
          </span>
        </div>

        <Link
          href="/perfil"
          className="flex w-full items-center gap-3 px-0 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white/85"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <User className="size-[14px] shrink-0" />
          Meu perfil
        </Link>

        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-0 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white/85"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <LogOut className="size-[14px] shrink-0" />
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  );
}
