import { TrendingDown, TrendingUp, Minus } from "lucide-react";

type Trend = "improving" | "declining" | "stable" | string;

const TREND_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; Icon: React.ElementType }
> = {
  improving: {
    label: "Melhorando",
    bg: "rgba(39,176,139,0.11)",
    color: "#27B08B",
    Icon: TrendingUp,
  },
  declining: {
    label: "Atenção",
    bg: "rgba(226,75,75,0.11)",
    color: "#E24B4B",
    Icon: TrendingDown,
  },
  stable: {
    label: "Estável",
    bg: "rgba(79,207,216,0.11)",
    color: "var(--argila-teal-dark)",
    Icon: Minus,
  },
};

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

  const config = TREND_CONFIG[trend as Trend] ?? TREND_CONFIG.stable;
  const { label, bg, color, Icon } = config;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ background: bg, color, border: `1px solid ${color}22` }}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
