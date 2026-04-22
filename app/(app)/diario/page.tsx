import Link from "next/link";
import { Plus, Sparkles, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WeeklyActivityChart } from "@/components/diario/WeeklyActivityChart";
import { DailySuggestionsCard } from "@/components/diario/DailySuggestionsCard";
import { ensureDailySuggestionsForProfessor } from "@/lib/diario/ensure-daily-suggestions";
import { getWeeklyActivityForProfessor } from "@/lib/diario/get-weekly-activity";
import type { SuggestionItem } from "@/lib/diario/build-daily-suggestions";
import type { WeeklyPoint } from "@/lib/diario/get-weekly-activity";

export default async function DiarioHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let weekly: WeeklyPoint[] = [];
  let suggestionRow: {
    source_kind: "critical_students" | "class_activity";
    items: unknown;
  } | null = null;
  let items: SuggestionItem[] = [];

  if (user) {
    const [w, s] = await Promise.all([
      getWeeklyActivityForProfessor(supabase, user.id),
      ensureDailySuggestionsForProfessor(supabase, user.id),
    ]);
    weekly = w;
    suggestionRow = s;
    items = Array.isArray(s.items) ? (s.items as SuggestionItem[]) : [];
  }

  return (
    <div>
      <div
        className="relative mb-8 overflow-hidden"
        style={{ background: "var(--gradient-brand)", borderRadius: "var(--radius-2xl)" }}
      >
        <div
          className="pointer-events-none absolute"
          style={{
            right: -60,
            top: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(79,207,216,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            left: "30%",
            bottom: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(125,99,175,0.25) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 p-6 md:py-10 md:px-12">
          <div
            className="inline-flex items-center gap-2 rounded-full font-bold uppercase"
            style={{
              background: "rgba(79,207,216,0.15)",
              border: "1px solid rgba(79,207,216,0.30)",
              color: "var(--argila-teal)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.08em",
              padding: "4px 10px",
              marginBottom: "var(--space-3)",
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: "var(--argila-teal)" }}
            />
            Registro de aula
          </div>
          <h1
            className="font-bold text-white"
            style={{
              fontSize: "var(--text-4xl)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              maxWidth: "22ch",
              marginBottom: "var(--space-2)",
            }}
          >
            O que você trabalhou hoje?
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.60)",
              fontFamily: "var(--font-secondary)",
              fontSize: "var(--text-base)",
              maxWidth: "44ch",
              marginBottom: "var(--space-6)",
              marginTop: "var(--space-2)",
            }}
          >
            A IA conduz 5 perguntas adaptativas, resume a aula e atualiza o
            progresso de cada aluno automaticamente.
          </p>
          <Link
            href="/diario/novo"
            className="argila-btn argila-btn-teal"
            style={{ fontSize: "var(--text-sm)", height: 40, padding: "0 18px" }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Novo diário
          </Link>
        </div>
      </div>

      {user && suggestionRow ? (
        <div
          className="mb-8 grid gap-4 md:grid-cols-2"
          style={{ gap: "var(--space-4)" }}
        >
          <section
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-xs)",
              padding: "var(--space-5)",
            }}
          >
            <h2
              className="mb-4 font-bold"
              style={{ fontSize: "var(--text-lg)", color: "var(--color-text)" }}
            >
              Atividade da semana
            </h2>
            <WeeklyActivityChart points={weekly} />
          </section>
          <section
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-xs)",
              padding: "var(--space-5)",
            }}
          >
            <h2
              className="mb-4 font-bold"
              style={{ fontSize: "var(--text-lg)", color: "var(--color-text)" }}
            >
              Sugestões
            </h2>
            <DailySuggestionsCard
              sourceKind={suggestionRow.source_kind}
              items={items}
            />
          </section>
        </div>
      ) : null}

      <div className="flex flex-wrap" style={{ gap: "var(--space-3)" }}>
        {[
          { Icon: Sparkles, label: "5 perguntas adaptativas com IA" },
          { Icon: BookOpen, label: "Resumo automático da aula" },
        ].map(({ Icon, label }) => (
          <div
            key={label}
            className="flex items-center"
            style={{
              gap: "var(--space-2)",
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              boxShadow: "var(--shadow-xs)",
              borderRadius: "var(--radius-lg)",
              padding: "5px 12px",
            }}
          >
            <Icon
              className="shrink-0"
              style={{ color: "var(--argila-purple)", width: 16, height: 16 }}
            />
            <span
              className="font-semibold"
              style={{ color: "var(--color-text-sec)", fontSize: "var(--text-xs)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
