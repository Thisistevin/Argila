import type { WeeklyPoint } from "@/lib/diario/get-weekly-activity";

type Props = {
  points: WeeklyPoint[];
};

export function WeeklyActivityChart({ points }: Props) {
  const w = 320;
  const h = 100;
  const pad = 8;
  const maxVal = Math.max(
    1,
    ...points.flatMap((p) => [p.diaries, p.reports])
  );
  const n = Math.max(points.length, 1);
  const xAt = (i: number) => pad + (i * (w - pad * 2)) / Math.max(n - 1, 1);
  const yAt = (v: number) => h - pad - ((v / maxVal) * (h - pad * 2));

  const linePath = (getter: (p: WeeklyPoint) => number) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(getter(p))}`)
      .join(" ");

  const areaPath = (getter: (p: WeeklyPoint) => number) => {
    if (!points.length) return "";
    const top = linePath(getter);
    const lastX = xAt(points.length - 1);
    const firstX = xAt(0);
    return `${top} L ${lastX} ${h - pad} L ${firstX} ${h - pad} Z`;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: "var(--argila-teal)" }}
          />
          Diários
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: "var(--argila-purple)" }}
          />
          Relatórios
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-full"
        role="img"
        aria-label="Gráfico de diários e relatórios nos últimos sete dias"
      >
        <defs>
          <linearGradient id="fillTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--argila-teal)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--argila-teal)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fillPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--argila-purple)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--argila-purple)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 0 && (
          <>
            <path d={areaPath((p) => p.diaries)} fill="url(#fillTeal)" />
            <path d={areaPath((p) => p.reports)} fill="url(#fillPurple)" />
            <path
              d={linePath((p) => p.diaries)}
              fill="none"
              stroke="var(--argila-teal)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <path
              d={linePath((p) => p.reports)}
              fill="none"
              stroke="var(--argila-purple)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
      <div
        className="mt-1 flex justify-between gap-1 text-center"
        style={{ fontSize: "10px", color: "var(--color-text-muted)" }}
      >
        {points.map((p) => (
          <span key={p.dateKey} className="min-w-0 flex-1 truncate capitalize">
            {p.dayLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
