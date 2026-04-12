import Link from "next/link";
import { BookOpen } from "lucide-react";
import { AttentionBadge } from "@/components/galeria/AttentionBadge";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

const AVATAR_GRADIENTS = [
  "var(--gradient-indigo)",
  "var(--gradient-purple)",
  "var(--gradient-warm)",
];

function avatarGradient(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

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
      className="group flex items-start transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-5)",
        gap: "var(--space-3)",
      }}
    >
      {/* Avatar — avatar-md: 40px, 13px font */}
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
        style={{
          width: 40,
          height: 40,
          fontSize: 13,
          background: avatarGradient(name),
          fontFamily: "var(--font-primary)",
        }}
      >
        {getInitials(name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between" style={{ gap: "var(--space-2)" }}>
          <h3
            className="truncate font-semibold"
            style={{
              color: "var(--argila-darkest)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.4,
            }}
          >
            {name}
          </h3>
          <AttentionBadge trend={attentionTrend} confidence={attentionConfidence} />
        </div>

        <div
          className="flex items-center"
          style={{ marginTop: "var(--space-2)", gap: "var(--space-2)" }}
        >
          <BookOpen
            className="shrink-0"
            style={{ color: "var(--color-text-subtle)", width: 14, height: 14 }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {diaryCount > 0
              ? `${diaryCount} diário${diaryCount > 1 ? "s" : ""}`
              : "Nenhum diário ainda"}
          </span>
        </div>
      </div>
    </Link>
  );
}
