import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  getLatestSubscription: vi.fn(),
  isProfessorPremium: vi.fn(),
  isPastDue: vi.fn(),
  canUseJourneys: vi.fn(),
  canUseReports: vi.fn(),
}));

vi.mock("@/actions/journeys", () => ({
  acceptAiSuggestion: vi.fn(),
  setStudentMilestone: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  canUseJourneys,
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
  isProfessorPremium,
} from "@/lib/entitlement";
import AlunoPage from "@/app/(app)/aluno/[id]/page";

function exploreClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "prof-1" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "st1",
                    name: "Aluno Explorar",
                    created_at: "2024-01-15T12:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    absent: false,
                    note: null,
                    comprehension_score: 7,
                    attention_score: 6,
                    engagement_score: 8,
                    ai_student_summary: "Resumo",
                    created_at: "2024-06-01T10:00:00Z",
                    diaries: {
                      content: "Conteúdo",
                      ai_summary: null,
                      lesson_type: "theoretical",
                      created_at: "2024-06-01T10:00:00Z",
                    },
                  },
                ],
              }),
            }),
          }),
        };
      }
      if (table === "student_progress") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

function professorClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "prof-1" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "st1",
                    name: "Aluno Premium",
                    created_at: "2024-01-15T12:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === "student_progress") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    overall_score: 8,
                    attention_score: 7,
                    comprehension_score: 8,
                    engagement_score: 7,
                    attention_trend: "stable",
                    short_note: "Nota",
                    last_diary_at: "2024-06-01T10:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "reports") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        };
      }
      if (table === "student_journeys") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("AlunoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPastDue).mockReturnValue(false);
    vi.mocked(getLatestSubscription).mockResolvedValue({
      plan: "explorar",
      billing_cycle: "free",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "system",
    });
  });

  it("Explorar: banners de upgrade, histórico sem scores nem Gerar relatório", async () => {
    vi.mocked(createClient).mockResolvedValue(exploreClient() as never);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "explorar",
      billing_cycle: "free",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "system",
    });
    vi.mocked(isProfessorPremium).mockReturnValue(false);
    vi.mocked(canUseJourneys).mockImplementation((s) => vi.mocked(isProfessorPremium)(s));
    vi.mocked(canUseReports).mockImplementation((s) => vi.mocked(isProfessorPremium)(s));

    const html = renderToStaticMarkup(
      await AlunoPage({ params: Promise.resolve({ id: "st1" }) })
    );

    expect(html).toContain("Aluno Explorar");
    expect(html).toContain("Obtenha métricas desse aluno no plano Professor");
    expect(html).toContain("Acompanhe jornadas de aprendizado no plano Professor");
    expect(html).toContain("Gere relatórios com IA no plano Professor");
    expect(html).toContain("href=\"/planos\"");
    expect(html).toContain("Histórico de diários");
    expect(html).not.toContain("Gerar relatório");
    expect(html).not.toContain(">Comp.<");
  });

  it("Professor: mostra progresso e não mostra banners de upsell", async () => {
    vi.mocked(createClient).mockResolvedValue(professorClient() as never);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
    vi.mocked(getLatestSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
    vi.mocked(isProfessorPremium).mockReturnValue(true);
    vi.mocked(canUseJourneys).mockReturnValue(true);
    vi.mocked(canUseReports).mockReturnValue(true);

    const html = renderToStaticMarkup(
      await AlunoPage({ params: Promise.resolve({ id: "st1" }) })
    );

    expect(html).toContain("Aluno Premium");
    expect(html).toContain("Progresso geral");
    expect(html).not.toContain("Obtenha métricas desse aluno no plano Professor");
    expect(html).not.toContain("Acompanhe jornadas de aprendizado no plano Professor");
  });
});
