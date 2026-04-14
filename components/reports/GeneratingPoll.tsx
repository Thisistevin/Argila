"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a página a cada 5s enquanto o relatório está em geração. */
export function GeneratingPoll() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
