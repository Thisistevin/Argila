"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export type PlanDecisionModalProps = {
  title: string;
  description: ReactNode;
  primary: {
    label: string;
    href?: string;
    onClick?: () => void | Promise<void>;
  };
  secondary: {
    label: string;
    onClick: () => void | Promise<void>;
    destructive?: boolean;
  };
  busy?: boolean;
  error?: string | null;
  /** Quando true: overlay sem fechar, foco inicial no primário, Esc não fecha. */
  blocking?: boolean;
};

export function PlanDecisionModal({
  title,
  description,
  primary,
  secondary,
  busy = false,
  error = null,
  blocking = false,
}: PlanDecisionModalProps) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (blocking) {
      primaryRef.current?.focus();
    }
  }, [blocking]);

  useEffect(() => {
    if (!blocking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [blocking]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,18,28,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-decision-title"
      onMouseDown={(e) => {
        if (blocking) e.stopPropagation();
      }}
    >
      <div
        className="max-w-md rounded-2xl p-6 shadow-xl"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="plan-decision-title"
          className="mb-2 text-lg font-bold"
          style={{ color: "var(--argila-darkest)" }}
        >
          {title}
        </h2>
        <div
          className="mb-5 text-sm leading-relaxed"
          style={{ color: "var(--color-text-sec)" }}
        >
          {description}
        </div>
        {error && (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              background: "rgba(226,75,75,0.08)",
              color: "var(--color-error)",
            }}
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
          {primary.href ? (
            <Link
              href={primary.href}
              className="argila-btn argila-btn-primary inline-flex w-full justify-center sm:w-auto"
              onClick={primary.onClick}
            >
              {primary.label}
            </Link>
          ) : (
            <button
              ref={primaryRef}
              type="button"
              disabled={busy}
              className="argila-btn argila-btn-primary w-full sm:w-auto"
              onClick={() => void primary.onClick?.()}
            >
              {primary.label}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            className="argila-btn argila-btn-ghost w-full rounded-xl px-4 py-2.5 text-sm font-medium sm:w-auto"
            style={
              secondary.destructive
                ? { color: "var(--color-error)", borderColor: "var(--color-border)" }
                : undefined
            }
            onClick={() => void secondary.onClick()}
          >
            {secondary.label}
          </button>
        </div>
      </div>
    </div>
  );
}
