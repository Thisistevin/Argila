"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface Props {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function CollapsibleSection({
  header,
  children,
  defaultOpen = false,
  className,
  style,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className} style={style}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
        style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
          {header}
        </div>
        {open ? (
          <ChevronDown style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronRight style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }} />
        )}
      </button>

      {open && (
        <div style={{ marginTop: "var(--space-4)" }}>
          {children}
        </div>
      )}
    </section>
  );
}
