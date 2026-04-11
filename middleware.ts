import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Atualiza cookies de sessão Supabase em todas as rotas. Auth em rotas protegidas: `(app)/layout.tsx`. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
