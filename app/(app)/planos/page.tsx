import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  getLatestSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";

export default async function PlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sub = user ? await getActiveSubscription(supabase, user.id) : null;
  const latest = user ? await getLatestSubscription(supabase, user.id) : null;
  const premium = isProfessorPremium(sub);

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: "var(--argila-darkest)" }}
      >
        Planos
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-semibold mb-2">Explorar</h2>
          <p className="text-2xl font-bold mb-4">R$ 0</p>
          <ul className="text-sm space-y-2" style={{ color: "var(--color-text-muted)" }}>
            <li>Até 5 alunos</li>
            <li>Diário com IA</li>
            <li>Perfil básico</li>
          </ul>
        </div>
        <div
          className="rounded-2xl border p-6 argila-gradient-brand text-white"
          style={{ borderColor: "transparent" }}
        >
          <h2 className="font-semibold mb-2">Professor</h2>
          <p className="text-2xl font-bold mb-4">R$ 29/mês ou R$ 290/ano</p>
          <ul className="text-sm space-y-2 opacity-90">
            <li>Até 40 alunos</li>
            <li>Turmas</li>
            <li>Relatórios IA e compartilhamento</li>
            <li>Indicador de atenção</li>
          </ul>
          {!premium && (
            <p className="mt-6 text-xs opacity-80">
              Checkout Asaas (PIX recorrente) e early access Abacatepay — configurar
              variáveis e webhooks (ver GUIA_CONFIGURACOES_EXTERNAS_ARGILA na raiz do
              repositório).
            </p>
          )}
        </div>
      </div>

      {latest && (
        <p className="mt-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Situação atual: <strong>{latest.plan}</strong> · {latest.status} · até{" "}
          {new Date(latest.period_end).toLocaleDateString("pt-BR")} · origem{" "}
          {latest.source}
        </p>
      )}
    </div>
  );
}
