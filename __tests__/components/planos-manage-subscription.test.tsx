// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { PlanosManageSubscription } from "@/components/billing/PlanosManageSubscription";

const billingMocks = vi.hoisted(() => ({
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  undoCancelSubscription: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));

vi.mock("@/actions/billing", () => ({
  cancelSubscriptionAtPeriodEnd: billingMocks.cancelSubscriptionAtPeriodEnd,
  undoCancelSubscription: billingMocks.undoCancelSubscription,
  requestAccountDeletion: billingMocks.requestAccountDeletion,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("PlanosManageSubscription", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    billingMocks.cancelSubscriptionAtPeriodEnd.mockResolvedValue({
      ok: true as const,
    });
    billingMocks.undoCancelSubscription.mockResolvedValue({ ok: true as const });
    billingMocks.requestAccountDeletion.mockResolvedValue({ ok: true as const });
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  it("abre modal ao clicar em cancelar ao fim do período (sem window.confirm)", async () => {
    const root = createRoot(container);
    const future = new Date(Date.now() + 86400000).toISOString();
    const sub = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: future,
      source: "abacatepay",
    };
    await act(async () => {
      root.render(<PlanosManageSubscription sub={sub} latest={sub} />);
    });
    const btn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Cancelar ao fim do período")
    );
    expect(btn).toBeTruthy();
    await act(async () => {
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Cancelar plano Professor?");
  });

  it("agendar downgrade chama cancelSubscriptionAtPeriodEnd", async () => {
    const root = createRoot(container);
    const future = new Date(Date.now() + 86400000).toISOString();
    const sub = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: future,
      source: "abacatepay",
    };
    await act(async () => {
      root.render(<PlanosManageSubscription sub={sub} latest={sub} />);
    });
    const openBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Cancelar ao fim do período")
    );
    await act(async () => {
      openBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const downgradeBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Fazer downgrade ao fim do período")
    );
    await act(async () => {
      downgradeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(billingMocks.cancelSubscriptionAtPeriodEnd).toHaveBeenCalled();
  });

  it("com cancelamento agendado, Continuar chama undoCancelSubscription", async () => {
    const root = createRoot(container);
    const future = new Date(Date.now() + 86400000).toISOString();
    const latest = {
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: future,
      source: "abacatepay",
      cancel_at_period_end: true,
    };
    await act(async () => {
      root.render(<PlanosManageSubscription sub={latest} latest={latest} />);
    });
    const continueBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Continuar no plano Professor")
    );
    await act(async () => {
      continueBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(billingMocks.undoCancelSubscription).toHaveBeenCalled();
  });
});
