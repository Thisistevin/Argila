import Link from "next/link";
import { AttentionBadge } from "@/components/galeria/AttentionBadge";

export function StudentCard({
  id,
  name,
  attentionTrend,
  attentionConfidence,
  diaryCount,
}: {
  id: string;
  name: string;
  attentionTrend: string | null;
  attentionConfidence: number | null;
  diaryCount: number;
}) {
  return (
    <Link
      href={`/aluno/${id}`}
      className="block rounded-2xl border p-5 transition-shadow hover:shadow-md"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold" style={{ color: "var(--argila-darkest)" }}>
          {name}
        </h3>
        <AttentionBadge trend={attentionTrend} confidence={attentionConfidence} />
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
        {diaryCount} diário(s) registrado(s)
      </p>
    </Link>
  );
}
