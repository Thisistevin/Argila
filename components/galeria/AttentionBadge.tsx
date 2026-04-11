import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

export function AttentionBadge({
  trend,
  confidence,
}: {
  trend: string | null;
  confidence: number | null;
}) {
  if (
    !trend ||
    trend === "insufficient_data" ||
    confidence === null ||
    confidence < 0.5
  ) {
    return null;
  }
  const Icon =
    trend === "declining"
      ? TrendingDown
      : trend === "improving"
        ? TrendingUp
        : AlertTriangle;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: "rgba(79,207,216,0.15)",
        color: "var(--argila-teal-dark)",
      }}
    >
      <Icon className="size-3" />
      {trend}
    </span>
  );
}
