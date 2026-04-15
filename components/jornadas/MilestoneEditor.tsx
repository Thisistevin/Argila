"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { updateMilestone } from "@/actions/journeys";

export type MilestoneRow = { id: string; name: string; position: number };

export function MilestoneEditor({
  journeyId: _journeyId,
  milestones,
  rowIndex,
}: {
  journeyId: string;
  milestones: MilestoneRow[];
  rowIndex: number;
}) {
  const sorted = [...milestones].sort((a, b) => a.position - b.position);
  const m = sorted[rowIndex];
  if (!m) return null;

  async function swapPositions(a: MilestoneRow, b: MilestoneRow) {
    const fd1 = new FormData();
    fd1.set("id", a.id);
    fd1.set("position", String(b.position));
    await updateMilestone(fd1);
    const fd2 = new FormData();
    fd2.set("id", b.id);
    fd2.set("position", String(a.position));
    await updateMilestone(fd2);
  }

  const idx = rowIndex;
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <button
        type="button"
        aria-label="Subir marco"
        disabled={!prev}
        onClick={() => {
          if (prev) void swapPositions(m, prev);
        }}
        style={{
          opacity: !prev ? 0.35 : 1,
          padding: 2,
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          background: "var(--color-surface)",
          cursor: !prev ? "not-allowed" : "pointer",
        }}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        aria-label="Descer marco"
        disabled={!next}
        onClick={() => {
          if (next) void swapPositions(m, next);
        }}
        style={{
          opacity: !next ? 0.35 : 1,
          padding: 2,
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          background: "var(--color-surface)",
          cursor: !next ? "not-allowed" : "pointer",
        }}
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
