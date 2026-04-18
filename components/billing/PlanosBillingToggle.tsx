"use client";

import Link from "next/link";
import { useState } from "react";
import { recordFunnelSelectCycle } from "@/actions/billing";

type Cycle = "monthly" | "annual";

export function PlanosBillingToggle({ disabled }: { disabled?: boolean }) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const href = `/checkout?billingCycle=${cycle}&entrypoint=studio_plans`;

  return (
    <div className="relative z-10 mt-6 flex flex-col gap-3">
      <div className="flex rounded-full p-1" style={{ background: "rgba(0,0,0,0.2)" }}>
        {(["monthly", "annual"] as const).map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => {
              setCycle(c);
              void recordFunnelSelectCycle({
                entrypoint: "studio_plans",
                billingCycle: c,
              });
            }}
            className="flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition"
            style={
              cycle === c
                ? {
                    background: "rgba(255,255,255,0.95)",
                    color: "var(--argila-indigo)",
                  }
                : { color: "rgba(255,255,255,0.65)" }
            }
          >
            {c === "monthly" ? "Mensal" : "Anual"}
          </button>
        ))}
      </div>
      {!disabled && (
        <Link
          href={href}
          className="argila-btn inline-flex w-full justify-center text-center"
          style={{
            background: "var(--argila-teal)",
            color: "var(--argila-darkest)",
            fontWeight: 600,
          }}
        >
          Assinar Professor
        </Link>
      )}
    </div>
  );
}
