"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createJourney } from "@/actions/journeys";

export function JourneyCreateForm() {
  const [milestones, setMilestones] = useState(["", "", ""]);

  function addField() {
    setMilestones((m) => [...m, ""]);
  }

  function setAt(i: number, v: string) {
    setMilestones((m) => {
      const next = [...m];
      next[i] = v;
      return next;
    });
  }

  return (
    <form action={createJourney} className="flex flex-col" style={{ gap: "var(--space-4)", maxWidth: 480 }}>
      <input name="name" required placeholder="Nome da jornada" className="argila-input" />
      <textarea
        name="description"
        placeholder="Descrição (opcional)"
        className="argila-input min-h-[72px] resize-y"
        rows={2}
      />
      <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
          Marcos iniciais
        </span>
        {milestones.map((val, i) => (
          <input
            key={i}
            value={val}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={`Marco ${i + 1}`}
            className="argila-input"
          />
        ))}
        <input
          type="hidden"
          name="milestones"
          value={JSON.stringify(
            milestones
              .map((name) => ({ name: name.trim() }))
              .filter((m) => m.name.length > 0)
          )}
        />
        <button
          type="button"
          onClick={addField}
          className="argila-btn argila-btn-ghost w-fit"
          style={{ height: 36, fontSize: "var(--text-xs)" }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Marco
        </button>
      </div>
      <button type="submit" className="argila-btn argila-btn-primary w-fit" style={{ height: 40, padding: "0 18px" }}>
        Criar jornada
      </button>
    </form>
  );
}
