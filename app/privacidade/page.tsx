import Link from "next/link";

/** LGPD — texto mínimo M7; revisar com jurídico antes do go-live. */
export default function PrivacidadePage() {
  return (
    <div
      className="min-h-screen p-8 max-w-2xl mx-auto text-sm"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <h1 className="text-xl font-bold mb-4">Privacidade e dados</h1>
      <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
        A Argila processa dados de professores e alunos para prestação do serviço
        (diários, progresso e relatórios). Dados são armazenados em infraestrutura
        contratada (Supabase/Vercel) com acesso restrito. Você pode solicitar
        exclusão ou exportação entrando em contato com o suporte do produto.
      </p>
      <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
        Anexos enviados ficam em armazenamento privado; URLs de leitura são
        temporárias (assinadas). Não utilize a plataforma para dados sensíveis
        além do necessário à atividade pedagógica.
      </p>
      <Link href="/" className="underline" style={{ color: "var(--argila-indigo)" }}>
        Voltar
      </Link>
    </div>
  );
}
