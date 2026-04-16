import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyActivityChart } from "@/components/diario/WeeklyActivityChart";
import { DailySuggestionsCard } from "@/components/diario/DailySuggestionsCard";

const sevenPoints = Array.from({ length: 7 }, (_, i) => ({
  dateKey: `2026-04-${String(9 + i).padStart(2, "0")}`,
  dayLabel: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][i] ?? "dom",
  diaries: i % 2,
  reports: (i + 1) % 3,
}));

describe("Diário mini dashboard", () => {
  it("WeeklyActivityChart mostra as duas legendas", () => {
    const html = renderToStaticMarkup(
      <WeeklyActivityChart points={sevenPoints} />
    );
    expect(html).toContain("Diários");
    expect(html).toContain("Relatórios");
  });

  it("DailySuggestionsCard lista textos persistidos", () => {
    const html = renderToStaticMarkup(
      <DailySuggestionsCard
        sourceKind="critical_students"
        items={[
          {
            kind: "student",
            student_id: "u1",
            student_name: "Maria",
            text: "Retome instruções com Maria em passos curtos e confirme foco no meio.",
          },
        ]}
      />
    );
    expect(html).toContain("Maria");
    expect(html).toContain("Retome instruções");
  });

  it("DailySuggestionsCard class_activity mostra Ideia do dia", () => {
    const html = renderToStaticMarkup(
      <DailySuggestionsCard
        sourceKind="class_activity"
        items={[
          {
            kind: "class_activity",
            class_id: "c1",
            class_name: "Inglês B1",
            text: "Roda-relâmpago de perguntas em pares por 8 min.",
          },
        ]}
      />
    );
    expect(html).toContain("Ideia do dia");
    expect(html).toContain("Inglês B1");
  });
});
