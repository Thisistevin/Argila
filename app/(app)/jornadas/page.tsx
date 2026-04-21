import { createClient } from "@/lib/supabase/server";
import { ProfessorUpgradeBanner } from "@/components/billing/ProfessorUpgradeBanner";
import {
  canUseJourneys,
  getActiveSubscription,
} from "@/lib/entitlement";
import { CollapsibleSection } from "@/components/galeria/CollapsibleSection";
import { JourneyCreateForm } from "@/components/jornadas/JourneyCreateForm";
import { JourneyCard } from "@/components/jornadas/JourneyCard";
import { Route, Sparkles } from "lucide-react";

export default async function JornadasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = canUseJourneys(sub);

  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, name, description, created_at")
    .eq("professor_id", user.id)
    .order("created_at", { ascending: false });

  const journeyIds = (journeys ?? []).map((j) => j.id);
  const { data: allMilestones } = journeyIds.length
    ? await supabase
        .from("milestones")
        .select("id, journey_id, name, position")
        .in("journey_id", journeyIds)
        .order("position", { ascending: true })
    : { data: [] as { id: string; journey_id: string; name: string; position: number }[] };

  const { data: sjRows } =
    premium && journeyIds.length
      ? await supabase.from("student_journeys").select("journey_id").in("journey_id", journeyIds)
      : { data: [] as { journey_id: string }[] };

  const countByJourney = new Map<string, number>();
  for (const row of sjRows ?? []) {
    countByJourney.set(row.journey_id, (countByJourney.get(row.journey_id) ?? 0) + 1);
  }

  const msByJourney = new Map<string, { id: string; journey_id: string; name: string; position: number }[]>();
  for (const m of allMilestones ?? []) {
    const list = msByJourney.get(m.journey_id) ?? [];
    list.push(m);
    msByJourney.set(m.journey_id, list);
  }

  const n = (journeys ?? []).length;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-8)" }}>
      <div>
        <h1
          className="font-bold"
          style={{
            color: "var(--argila-darkest)",
            fontSize: "var(--text-2xl)",
            letterSpacing: "-0.02em",
            marginBottom: "var(--space-1)",
          }}
        >
          Jornadas
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
          {n} jornada{n !== 1 ? "s" : ""} · marcos ordenados e posição do aluno
        </p>
      </div>

      {!premium && (
        <ProfessorUpgradeBanner
          icon={Sparkles}
          title="Jornadas de aprendizado fazem parte do plano Professor"
          description="Crie trilhas com marcos, acompanhe cada aluno e receba sugestões de etapa com base nos diários."
          cta="Ver planos"
        />
      )}

      {premium && (
        <CollapsibleSection
          defaultOpen={false}
          header={
            <>
              <Route className="shrink-0" style={{ color: "var(--argila-purple)", width: 18, height: 18 }} />
              <h2 className="font-bold" style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}>
                Criar jornada
              </h2>
            </>
          }
          className="argila-card"
          style={{ padding: "var(--space-6)" }}
        >
          <JourneyCreateForm />
        </CollapsibleSection>
      )}

      {premium && n > 0 && (
        <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
          {(journeys ?? []).map((j) => (
            <JourneyCard
              key={j.id}
              journey={j}
              milestones={msByJourney.get(j.id) ?? []}
              studentCount={countByJourney.get(j.id) ?? 0}
            />
          ))}
        </div>
      )}

      {premium && n === 0 && (
        <div
          className="text-center"
          style={{
            borderRadius: "var(--radius-xl)",
            border: "2px dashed var(--color-border)",
            padding: "var(--space-12) var(--space-6)",
          }}
        >
          <Route className="mx-auto" style={{ color: "var(--color-text-subtle)", width: 28, height: 28, marginBottom: "var(--space-3)" }} />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhuma jornada ainda. Use &quot;Criar jornada&quot; acima para começar.
          </p>
        </div>
      )}
    </div>
  );
}
