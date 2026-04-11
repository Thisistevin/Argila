import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";

const linkCls =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10";

export function AppSidebar({ premium }: { premium: boolean }) {
  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r py-6"
      style={{
        background: "var(--argila-darkest)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center gap-2 px-4 pb-6 border-b border-white/10">
        <Image src="/isotipo.svg" alt="" width={28} height={28} />
        <span className="font-bold text-white text-sm">Argila</span>
      </div>
      <nav className="flex flex-col gap-1 px-2 mt-4">
        <Link href="/diario" className={`${linkCls} text-white/80`}>
          Diário
        </Link>
        <Link href="/galeria" className={`${linkCls} text-white/80`}>
          Galeria
        </Link>
        <Link href="/planos" className={`${linkCls} text-white/80`}>
          Planos
        </Link>
        <Link href="/privacidade" className={`${linkCls} text-white/50 text-xs`}>
          Privacidade
        </Link>
      </nav>
      <div className="mt-auto px-4 pt-6">
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
          Plano
        </p>
        <p className="text-xs text-teal-300 font-medium">
          {premium ? "Professor" : "Explorar"}
        </p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
