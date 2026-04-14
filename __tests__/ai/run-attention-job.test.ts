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
  estimateCostCents: vi.fn(() => 5),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { runAttentionForStudent } from "@/lib/ai/run-attention-job";

function makeAttentionClient({
  diaryIds = [{ id: "d1" }, { id: "d2" }, { id: "d3" }],
  scoredRows = [
    {
      comprehension_score: 8,
      attention_score: 7,
      engagement_score: 7,
      absent: false,
      created_at: "2026-04-14T10:00:00.000Z",
      diary_id: "d1",
    },
    {
      comprehension_score: 7,
      attention_score: 6,
      engagement_score: 7,
      absent: false,
      created_at: "2026-04-13T10:00:00.000Z",
      diary_id: "d2",
    },
    {
      comprehension_score: 6,
      attention_score: 5,
      engagement_score: 6,
      absent: false,
      created_at: "2026-04-12T10:00:00.000Z",
      diary_id: "d3",
    },
  ],
  aiJobInsertData = { id: "job-1" },
  aiJobInsertError = null,
}: {
  diaryIds?: Array<{ id: string }>;
  scoredRows?: Array<Record<string, unknown>>;
  aiJobInsertData?: { id: string } | null;
  aiJobInsertError?: { message: string } | null;
} = {}) {
  const diariesEqSpy = vi.fn().mockResolvedValue({ data: diaryIds });
  const scoredLimitSpy = vi.fn().mockResolvedValue({ data: scoredRows });
  const studentProgressUpsertSpy = vi.fn().mockResolvedValue({ error: null });
  const aiJobsInsertSingleSpy = vi
    .fn()
    .mockResolvedValue({ data: aiJobInsertData, error: aiJobInsertError });
  const aiJobsUpdateFinalEqSpy = vi.fn().mockResolvedValue({ error: null });
  const aiJobsUpdateSpy = vi.fn().mockReturnValue({
    eq: aiJobsUpdateFinalEqSpy,
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "diaries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: diariesEqSpy,
          }),
        };
      }

      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: scoredLimitSpy,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "student_progress") {
        return {
          upsert: studentProgressUpsertSpy,
        };
      }

      if (table === "ai_jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: aiJobsInsertSingleSpy,
            }),
          }),
          update: aiJobsUpdateSpy,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    _spies: {
      diariesEqSpy,
      scoredLimitSpy,
      studentProgressUpsertSpy,
      aiJobsInsertSingleSpy,
      aiJobsUpdateSpy,
      aiJobsUpdateFinalEqSpy,
    },
  };

  return client;
}

describe("lib/ai/run-attention-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("marca insufficient_data quando não há diários suficientes", async () => {
    const client = makeAttentionClient({ scoredRows: [] });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await runAttentionForStudent("student-1", "prof-1");

    expect(client._spies.studentProgressUpsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        attention_trend: "insufficient_data",
        attention_confidence: 0,
      }),
      { onConflict: "student_id" }
    );
    expect(anthropicCreateSpy).not.toHaveBeenCalled();
  });

  it("processa o attention check e conclui o job", async () => {
    const client = makeAttentionClient();
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            attention_trend: "improving",
            confidence: 0.82,
            note: "Evolução consistente",
          }),
        },
      ],
      usage: { input_tokens: 22, output_tokens: 14 },
    });

    await runAttentionForStudent("student-1", "prof-1");

    expect(anthropicCreateSpy).toHaveBeenCalled();
    expect(client._spies.studentProgressUpsertSpy).toHaveBeenCalled();
    expect(client._spies.aiJobsUpdateSpy).toHaveBeenCalled();
  });

  it("não deveria chamar a IA quando falha ao criar o ai_job de observabilidade", async () => {
    const client = makeAttentionClient({
      aiJobInsertData: null,
      aiJobInsertError: { message: "duplicate key" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            attention_trend: "improving",
            confidence: 0.82,
            note: "Evolução consistente",
          }),
        },
      ],
      usage: { input_tokens: 22, output_tokens: 14 },
    });

    await runAttentionForStudent("student-1", "prof-1");

    expect(anthropicCreateSpy).not.toHaveBeenCalled();
  });
});
