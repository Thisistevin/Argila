import { Trash2 } from "lucide-react";
import {
  addMilestone,
  deleteJourney,
  deleteMilestone,
} from "@/actions/journeys";
import { MilestoneEditor, type MilestoneRow } from "@/components/jornadas/MilestoneEditor";

export function JourneyCard({
  journey,
  milestones,
  studentCount,
}: {
  journey: { id: string; name: string; description: string | null };
  milestones: MilestoneRow[];
  studentCount: number;
}) {
  const sorted = [...milestones].sort((a, b) => a.position - b.position);

  return (
    <article
      className="argila-card flex flex-col"
      style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            className="font-bold"
            style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}
          >
            {journey.name}
          </h3>
          {journey.description && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              {journey.description}
            </p>
          )}
        </div>
        <span
          className="rounded-full font-semibold shrink-0"
          style={{
            background: "rgba(125,99,175,0.10)",
            color: "var(--argila-purple)",
            fontSize: "var(--text-xs)",
            padding: "3px 10px",
          }}
        >
          {studentCount} aluno{studentCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
        {sorted.map((m, idx) => (
          <div
            key={m.id}
            className="flex items-center"
            style={{ gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}
          >
            <MilestoneEditor journeyId={journey.id} milestones={milestones} rowIndex={idx} />
            <div
              className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
              style={{
                width: 28,
                height: 28,
                fontSize: 12,
                background: "var(--argila-teal)",
              }}
            >
              {idx + 1}
            </div>
            <span className="min-w-0 flex-1 font-medium" style={{ fontSize: "var(--text-sm)", color: "var(--argila-darkest)" }}>
              {m.name}
            </span>
            <form action={deleteMilestone}>
              <input type="hidden" name="id" value={m.id} />
              <button
                type="submit"
                className="flex items-center justify-center shrink-0"
                title="Excluir marco"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(226,75,75,0.2)",
                  color: "var(--color-error)",
                  background: "rgba(226,75,75,0.06)",
                }}
              >
                <Trash2 size={12} />
              </button>
            </form>
          </div>
        ))}
      </div>

      <form action={addMilestone} className="flex flex-wrap items-end gap-2" style={{ paddingTop: "var(--space-2)" }}>
        <input type="hidden" name="journey_id" value={journey.id} />
        <input name="name" required placeholder="Novo marco" className="argila-input flex-1 min-w-[160px]" style={{ fontSize: "var(--text-sm)" }} />
        <button type="submit" className="argila-btn argila-btn-primary" style={{ height: 36, fontSize: "var(--text-xs)" }}>
          Adicionar marco
        </button>
      </form>

      <form action={deleteJourney} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
        <input type="hidden" name="id" value={journey.id} />
        <button
          type="submit"
          className="flex items-center font-semibold"
          style={{
            background: "rgba(226,75,75,0.06)",
            color: "var(--color-error)",
            border: "1px solid rgba(226,75,75,0.14)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--text-xs)",
            gap: "var(--space-1)",
          }}
        >
          <Trash2 style={{ width: 12, height: 12 }} />
          Excluir jornada
        </button>
      </form>
    </article>
  );
}
