import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export type ProfessorUpgradeBannerProps = {
  title: string;
  description: string;
  /** Texto do botão (default: Ver planos). */
  cta?: string;
  icon?: LucideIcon;
  className?: string;
  /** Reduz padding e altura do botão em áreas mais apertadas. */
  compact?: boolean;
};

export function ProfessorUpgradeBanner({
  title,
  description,
  cta = "Ver planos",
  icon: Icon = Sparkles,
  className = "",
  compact = false,
}: ProfessorUpgradeBannerProps) {
  const pad = compact ? "var(--space-4)" : "var(--space-6)";
  const gap = compact ? "var(--space-2)" : "var(--space-3)";
  const btnH = compact ? 36 : 40;
  const iconSize = compact ? 18 : 20;

  return (
    <div
      className={`argila-card flex flex-col ${className}`.trim()}
      style={{
        padding: pad,
        gap,
        background: "rgba(62,57,145,0.05)",
        borderColor: "rgba(62,57,145,0.14)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
        <Icon
          className="shrink-0"
          style={{
            width: iconSize,
            height: iconSize,
            color: "var(--argila-indigo)",
          }}
        />
        <p
          className="font-semibold"
          style={{
            color: "var(--argila-navy)",
            fontSize: "var(--text-sm)",
          }}
        >
          {title}
        </p>
      </div>
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        {description}
      </p>
      <Link
        href="/planos"
        className="argila-btn argila-btn-primary w-fit"
        style={{ height: btnH, padding: "0 18px" }}
      >
        {cta}
      </Link>
    </div>
  );
}
