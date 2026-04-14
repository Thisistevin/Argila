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
  estimateCostCents: vi.fn(() => 7),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { runDiaryScoringJob } from "@/lib/ai/run-diary-scoring";

function makeDiaryScoringClient({
  duplicateStatus = null,
  diaryExists = true,
  diaryStudents = [
    { id: "ds-1", student_id: "student-1", absent: false },
    { id: "ds-2", student_id: "student-2", absent: false },
  ],
  diaryStudentUpdateError = null,
}: {
  duplicateStatus?: string | null;
  diaryExists?: boolean;
  diaryStudents?: Array<{ id: string; student_id: string; absent: boolean }>;
  diaryStudentUpdateError?: { message: string } | null;
} = {}) {
  const aiJobSelectMaybeSingleSpy = vi.fn().mockResolvedValue({
    data: duplicateStatus ? { id: "job-dup", status: duplicateStatus } : null,
  });

  const diariesSingleSpy = vi.fn().mockResolvedValue({
    data: diaryExists
      ? {
          id: "diary-1",
          content: "Conteúdo da aula",
          lesson_type: "theoretical",
          professor_id: "prof-1",
        }
      : null,
    error: diaryExists ? null : { message: "not found" },
  });

  const diaryStudentsSelectEqSpy = vi
    .fn()
    .mockResolvedValue({ data: diaryStudents, error: null });

  const aiJobUpsertSingleSpy = vi
    .fn()
    .mockResolvedValue({ data: { id: "job-1" }, error: null });

  const diaryStudentUpdateFinalEqSpy = vi
    .fn()
    .mockResolvedValue({ error: diaryStudentUpdateError });
  const diaryStudentUpdateEqSpy = vi.fn().mockReturnValue({
    eq: diaryStudentUpdateFinalEqSpy,
  });
  const diaryStudentUpdateSpy = vi.fn().mockReturnValue({
    eq: diaryStudentUpdateEqSpy,
  });

  const studentProgressUpsertSpy = vi
    .fn()
    .mockResolvedValue({ error: null });

  const aiJobFinalEqSpy = vi.fn().mockResolvedValue({ error: null });
  const aiJobUpdateSpy = vi.fn().mockReturnValue({
    eq: aiJobFinalEqSpy,
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "ai_jobs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: aiJobSelectMaybeSingleSpy,
            }),
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: aiJobUpsertSingleSpy,
            }),
          }),
          update: aiJobUpdateSpy,
        };
      }

      if (table === "diaries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: diariesSingleSpy,
              }),
            }),
          }),
        };
      }

      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: diaryStudentsSelectEqSpy,
          }),
          update: diaryStudentUpdateSpy,
        };
      }

      if (table === "student_progress") {
        return {
          upsert: studentProgressUpsertSpy,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    _spies: {
      aiJobSelectMaybeSingleSpy,
      diariesSingleSpy,
      diaryStudentsSelectEqSpy,
      aiJobUpsertSingleSpy,
      diaryStudentUpdateSpy,
      diaryStudentUpdateEqSpy,
      diaryStudentUpdateFinalEqSpy,
      studentProgressUpsertSpy,
      aiJobUpdateSpy,
      aiJobFinalEqSpy,
    },
  };

  return client;
}

describe("lib/ai/run-diary-scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("não roda de novo quando já existe job concluído com a mesma idempotência", async () => {
    const client = makeDiaryScoringClient({ duplicateStatus: "done" });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await runDiaryScoringJob("diary-1", "prof-1");

    expect(anthropicCreateSpy).not.toHaveBeenCalled();
    expect(client._spies.aiJobUpsertSingleSpy).not.toHaveBeenCalled();
  });

  it("processa scoring, atualiza notas e conclui o job", async () => {
    const client = makeDiaryScoringClient();
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            students: [
              {
                diary_student_id: "ds-1",
                student_id: "student-1",
                comprehension_score: 8,
                engagement_score: 7,
                attention_score: 6,
                flags: [],
                short_note: "Bom progresso",
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    await runDiaryScoringJob("diary-1", "prof-1");

    expect(client._spies.diaryStudentUpdateSpy).toHaveBeenCalled();
    expect(client._spies.studentProgressUpsertSpy).toHaveBeenCalled();
    expect(client._spies.aiJobUpdateSpy).toHaveBeenCalled();
    expect(client._spies.aiJobFinalEqSpy).toHaveBeenCalledWith("id", "job-1");
  });

  it("deveria falhar o job quando persistir scores do aluno falha", async () => {
    const client = makeDiaryScoringClient({
      diaryStudentUpdateError: { message: "update failed" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            students: [
              {
                diary_student_id: "ds-1",
                student_id: "student-1",
                comprehension_score: 8,
                engagement_score: 7,
                attention_score: 6,
                flags: [],
                short_note: "Bom progresso",
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    await runDiaryScoringJob("diary-1", "prof-1");

    expect(client._spies.aiJobUpdateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "done" })
    );
  });
});
