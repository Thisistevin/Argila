// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { PlanDecisionGate } from "@/components/billing/PlanDecisionGate";

const mockPathname = vi.fn(() => "/diario");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/billing", () => ({
  downgradeToExplore: vi.fn(async () => ({ ok: true as const })),
  logTrialUpgradeClicked: vi.fn(async () => {}),
}));

describe("PlanDecisionGate", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/diario");
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  it("não mostra modal com trialing válido", async () => {
    const root = createRoot(container);
    const future = new Date(Date.now() + 86400000).toISOString();
    await act(async () => {
      root.render(
        <PlanDecisionGate
          pastDue={false}
          latest={{
            plan: "professor",
            billing_cycle: "monthly",
            status: "trialing",
            period_end: future,
            source: "system",
          }}
        >
          <div>Conteúdo</div>
        </PlanDecisionGate>
      );
    });
    expect(container.textContent).toContain("Conteúdo");
    expect(container.textContent).not.toContain("Seu teste do plano Professor terminou");
  });

  it("mostra modal com trialing expirado por data em rota bloqueada", async () => {
    const root = createRoot(container);
    const past = new Date(Date.now() - 86400000).toISOString();
    await act(async () => {
      root.render(
        <PlanDecisionGate
          pastDue={false}
          latest={{
            plan: "professor",
            billing_cycle: "monthly",
            status: "trialing",
            period_end: past,
            source: "system",
          }}
        >
          <div>Conteúdo</div>
        </PlanDecisionGate>
      );
    });
    expect(container.textContent).toContain("Seu teste do plano Professor terminou");
  });

  it("mostra modal com trial_expired em rota bloqueada", async () => {
    const root = createRoot(container);
    const past = new Date(Date.now() - 86400000).toISOString();
    await act(async () => {
      root.render(
        <PlanDecisionGate
          pastDue={false}
          latest={{
            plan: "professor",
            billing_cycle: "monthly",
            status: "trial_expired",
            period_end: past,
            source: "system",
          }}
        >
          <div>Conteúdo</div>
        </PlanDecisionGate>
      );
    });
    expect(container.textContent).toContain("Seu teste do plano Professor terminou");
  });

  it("não mostra modal em /checkout", async () => {
    mockPathname.mockReturnValue("/checkout");
    const root = createRoot(container);
    const past = new Date(Date.now() - 86400000).toISOString();
    await act(async () => {
      root.render(
        <PlanDecisionGate
          pastDue={false}
          latest={{
            plan: "professor",
            billing_cycle: "monthly",
            status: "trial_expired",
            period_end: past,
            source: "system",
          }}
        >
          <div>Conteúdo</div>
        </PlanDecisionGate>
      );
    });
    expect(container.textContent).not.toContain("Seu teste do plano Professor terminou");
  });

  it("não mostra modal em /planos", async () => {
    mockPathname.mockReturnValue("/planos");
    const root = createRoot(container);
    const past = new Date(Date.now() - 86400000).toISOString();
    await act(async () => {
      root.render(
        <PlanDecisionGate
          pastDue={false}
          latest={{
            plan: "professor",
            billing_cycle: "monthly",
            status: "trial_expired",
            period_end: past,
            source: "system",
          }}
        >
          <div>Conteúdo</div>
        </PlanDecisionGate>
      );
    });
    expect(container.textContent).not.toContain("Seu teste do plano Professor terminou");
  });
});
