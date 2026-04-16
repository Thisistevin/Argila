import type { SuggestionItem } from "@/lib/diario/build-daily-suggestions";

type Props = {
  sourceKind: "critical_students" | "class_activity";
  items: SuggestionItem[];
};

export function DailySuggestionsCard({ sourceKind, items }: Props) {
  const isClass = sourceKind === "class_activity";

  return (
    <ul className="space-y-3" style={{ fontSize: "var(--text-sm)" }}>
      {items.map((item, idx) => (
        <li
          key={`${item.kind}-${idx}-${item.text.slice(0, 24)}`}
          className="rounded-lg border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            padding: "10px 12px",
          }}
        >
          {isClass && item.kind === "class_activity" ? (
            <p className="font-semibold" style={{ color: "var(--argila-purple)" }}>
              Ideia do dia
              {item.class_name ? ` · ${item.class_name}` : ""}
            </p>
          ) : null}
          {!isClass && item.kind === "student" ? (
            <p className="mb-0.5 font-semibold" style={{ color: "var(--argila-teal-dark)" }}>
              {item.student_name}
            </p>
          ) : null}
          <p style={{ color: "var(--color-text-sec)", marginTop: isClass ? 4 : 0 }}>
            {item.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
