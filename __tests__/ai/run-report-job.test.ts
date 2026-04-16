import { beforeEach, describe, expect, it, vi } from "vitest";

const { anthropicCreateSpy } = vi.hoisted(() => ({
  anthropicCreateSpy: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: anthropicCreateSpy,
    };
  }

  return { default: MockAnthropic };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/cost", () => ({
  estimateCostCents: vi.fn(() => 11),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  pickPendingReportJob,
  processOneReportJob,
} from "@/lib/ai/run-report-job";

function makeReportClient({
  missingReportId = false,
  reportUpdateError = null,
}: {
  missingReportId?: boolean;
  reportUpdateError?: { message: string } | null;
} = {}) {
  const jobRow = {
    id: "job-1",
    professor_id: "prof-1",
    type: "report",
    status: "pending",
    attempt_count: 0,
    payload: missingReportId
      ? { student_id: "student-1", period_start: "2026-04-01", period_end: "2026-04-14" }
      : {
          student_id: "student-1",
          report_id: "report-1",
          period_start: "2026-04-01",
          period_end: "2026-04-14",
        },
  };

  const aiJobsMaybeSingleSpy = vi.fn().mockResolvedValue({ data: jobRow, error: null });
  const aiJobsUpdateFinalEqSpy = vi.fn().mockResolvedValue({ error: null });
  const aiJobsUpdateSpy = vi.fn().mockReturnValue({
    eq: aiJobsUpdateFinalEqSpy,
  });

  const reportsMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: {
      id: "report-1",
      status: "generating",
      generation_mode: "automatic",
      generation_focus: null,
      teacher_guidance: null,
      student_id: "student-1",
      professor_id: "prof-1",
    },
    error: null,
  });
  const reportsUpdateFinalEqSpy = vi
    .fn()
    .mockResolvedValue({ error: reportUpdateError });
  const reportsUpdateSpy = vi.fn().mockReturnValue({
    eq: reportsUpdateFinalEqSpy,
  });

  const diariesRangeEndSpy = vi.fn().mockResolvedValue({
    data: [
      {
        id: "diary-1",
        content: "Aula 1",
        ai_summary: "Resumo 1",
        lesson_type: "theoretical",
        created_at: "2026-04-10T10:00:00.000Z",
      },
    ],
  });

  const diaryStudentsInSpy = vi.fn().mockResolvedValue({
    data: [
      {
        diary_id: "diary-1",
        absent: false,
        comprehension_score: 8,
        attention_score: 7,
        engagement_score: 6,
        note: "Boa aula",
        ai_student_summary: "Maria participou com atenção.",
        created_at: "2026-04-10T10:00:00.000Z",
      },
    ],
  });

  const studentsMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: { name: "Maria Aluna" },
    error: null,
  });
  const profilesMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: { name: "Carlos Silva" },
    error: null,
  });

  const studentProgressMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: {
      overall_score: 7,
      attention_trend: "stable",
      attention_confidence: 0.7,
      short_note: "Nota curta",
    },
  });

  const previousReportsLimitSpy = vi.fn().mockResolvedValue({
    data: [
      {
        period_start: "2026-03-01",
        period_end: "2026-03-31",
        title: "Relatório passado",
        highlights: ["Ponto 1"],
        suggestions: ["Sugestão 1"],
        attention_trend: "stable",
      },
    ],
  });

  const pendingPickMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: { id: "job-pending-1" },
  });

  const aiJobsSelectSpy = vi.fn((columns: string) => {
    if (columns === "*") {
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: aiJobsMaybeSingleSpy,
            }),
          }),
        }),
      };
    }

    if (columns === "id") {
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: pendingPickMaybeSingleSpy,
              }),
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected ai_jobs select(${columns})`);
  });

  const reportsSelectSpy = vi.fn((columns: string) => {
    if (
      columns ===
      "id, status, generation_mode, generation_focus, teacher_guidance, student_id, professor_id"
    ) {
      return {
        eq: vi.fn().mockReturnValue({
          maybeSingle: reportsMaybeSingleSpy,
        }),
      };
    }

    if (
      columns ===
      "period_start, period_end, title, highlights, suggestions, attention_trend"
    ) {
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: previousReportsLimitSpy,
                }),
              }),
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected reports select(${columns})`);
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "ai_jobs") {
        return {
          select: aiJobsSelectSpy,
          update: aiJobsUpdateSpy,
        };
      }

      if (table === "reports") {
        return {
          select: reportsSelectSpy,
          update: reportsUpdateSpy,
        };
      }

      if (table === "diaries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: diariesRangeEndSpy,
              }),
            }),
          }),
        };
      }

      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: diaryStudentsInSpy,
            }),
          }),
        };
      }

      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: studentsMaybeSingleSpy,
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: profilesMaybeSingleSpy,
            }),
          }),
        };
      }

      if (table === "student_progress") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: studentProgressMaybeSingleSpy,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    _spies: {
      aiJobsSelectSpy,
      aiJobsMaybeSingleSpy,
      aiJobsUpdateSpy,
      aiJobsUpdateFinalEqSpy,
      reportsSelectSpy,
      reportsMaybeSingleSpy,
      reportsUpdateSpy,
      reportsUpdateFinalEqSpy,
      previousReportsLimitSpy,
      pendingPickMaybeSingleSpy,
    },
  };

  return client;
}

describe("lib/ai/run-report-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("pickPendingReportJob retorna o job mais antigo pendente", async () => {
    const client = makeReportClient();
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const id = await pickPendingReportJob();

    expect(id).toBe("job-pending-1");
  });

  it("processa o relatório e conclui o job", async () => {
    const client = makeReportClient();
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title: "Relatório de Maria Aluna — abril",
            subtitle: "Prof. Carlos Silva",
            body_markdown:
              "Maria Aluna manteve bom ritmo. Os registros destacam Maria Aluna em participação ativa.",
            attention_trend: "stable",
            highlights: ["Ponto 1"],
            suggestions: ["Sugestão 1"],
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const ok = await processOneReportJob("job-1");

    expect(ok).toBe(true);
    expect(client._spies.reportsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Maria/i),
        subtitle: expect.stringMatching(/Carlos|Prof/i),
        content: expect.stringMatching(/Maria/i),
      })
    );
    expect(client._spies.aiJobsUpdateSpy).toHaveBeenCalled();
  });

  it("marca o job como failed quando o payload não tem report_id", async () => {
    const client = makeReportClient({ missingReportId: true });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const ok = await processOneReportJob("job-1");

    expect(ok).toBe(false);
    expect(client._spies.aiJobsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("não deveria marcar o job como done quando falha ao atualizar o report", async () => {
    const client = makeReportClient({
      reportUpdateError: { message: "report update failed" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title: "Relatório de Maria Aluna — abril",
            subtitle: "Prof. Carlos Silva",
            body_markdown:
              "Maria Aluna manteve bom ritmo. Os registros destacam Maria Aluna em participação ativa.",
            attention_trend: "stable",
            highlights: ["Ponto 1"],
            suggestions: ["Sugestão 1"],
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await processOneReportJob("job-1");

    expect(client._spies.aiJobsUpdateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "done" })
    );
  });
});
