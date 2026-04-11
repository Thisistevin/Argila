import Link from "next/link";
import { Plus } from "lucide-react";

export default function DiarioHomePage() {
  return (
    <div>
      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--argila-darkest)" }}
      >
        O que você trabalhou em classe hoje?
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Registre a aula com apoio da IA e atualize o progresso dos alunos.
      </p>
      <Link
        href="/diario/novo"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
        style={{ background: "var(--argila-teal)", boxShadow: "var(--shadow-teal)" }}
      >
        <Plus className="size-5" />
        Novo diário
      </Link>
    </div>
  );
}
