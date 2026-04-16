import { beforeEach, describe, expect, it, vi } from "vitest";

const { afterQueue } = vi.hoisted(() => ({
  afterQueue: [] as Promise<void>[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn((fn: () => void | Promise<void>) => {
    const p = Promise.resolve().then(() => fn()) as Promise<void>;
    afterQueue.push(p);
    return p;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  isProfessorPremium: vi.fn(),
  canManageClasses: vi.fn(),
}));

vi.mock("@/actions/classes", () => ({
  assertClassOwnership: vi.fn(),
}));

vi.mock("@/lib/ai/run-diary-scoring", () => ({
  runDiaryScoringJob: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/run-journey-suggestion", () => ({
  runJourneySuggestionForStudent: vi.fn(),
}));

vi.mock("@/lib/attention/recompute-attention-trend", () => ({
  recomputeAttentionTrendForStudent: vi.fn().mockResolvedValue(undefined),
}));

import { recomputeAttentionTrendForStudent } from "@/lib/attention/recompute-attention-trend";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canManageClasses,
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";
import { assertClassOwnership } from "@/actions/classes";
import { runDiaryScoringJob } from "@/lib/ai/run-diary-scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { runJourneySuggestionForStudent } from "@/lib/ai/run-journey-suggestion";
import { completeDiary } from "@/actions/diary";

const PROFESSOR_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const STUDENT_ID = "dddddddd-0000-4000-8000-000000000001";
const CLASS_ID = "cccccccc-0000-4000-8000-000000000001";

type DiaryActionClientOptions = {
  authUserId?: string | null;
  ownedStudents?: Array<{ id: string }>;
  diaryInsertError?: { message: string } | null;
  diaryStudentsInsertError?: { message: string } | null;
  diaryClassesInsertError?: { message: string } | null;
};

function makeDiaryActionClient(options: DiaryActionClientOptions = {}) {
  const {
    authUserId = PROFESSOR_ID,
    ownedStudents = [{ id: STUDENT_ID }],
    diaryInsertError = null,
    diaryStudentsInsertError = null,
    diaryClassesInsertError = null,
  } = options;

  const ownedStudentsInSpy = vi
    .fn()
    .mockResolvedValue({ data: ownedStudents, error: null });
  const diariesSingleSpy = vi.fn().mockResolvedValue({
    data: diaryInsertError ? null : { id: "diary-1" },
    error: diaryInsertError,
  });
  const diariesInsertSpy = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: diariesSingleSpy,
    }),
  });
  const diaryStudentsInsertSpy = vi
    .fn()
    .mockResolvedValue({ error: diaryStudentsInsertError });
  const diaryClassesInsertSpy = vi
    .fn()
    .mockResolvedValue({ error: diaryClassesInsertError });
  const studentProgressUpsertSpy = vi.fn().mockResolvedValue({ error: null });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUserId ? { id: authUserId } : null },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: ownedStudentsInSpy,
            }),
          }),
        };
      }

      if (table === "diaries") {
        return {
          insert: diariesInsertSpy,
        };
      }

      if (table === "diary_students") {
        return {
          insert: diaryStudentsInsertSpy,
        };
      }

      if (table === "diary_classes") {
        return {
          insert: diaryClassesInsertSpy,
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
      ownedStudentsInSpy,
      diariesInsertSpy,
      diariesSingleSpy,
      diaryStudentsInsertSpy,
      diaryClassesInsertSpy,
      studentProgressUpsertSpy,
    },
  };

  return client;
}

async function flushAfterTasks() {
  await Promise.all(afterQueue.splice(0));
}

describe("AI actions", () => {
  beforeEach(() => {
    afterQueue.length = 0;
    vi.clearAllMocks();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "student_journeys") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }
        throw new Error(`Unexpected admin table ${table}`);
      }),
    } as unknown as ReturnType<typeof createAdminClient>);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
    vi.mocked(isProfessorPremium).mockReturnValue(true);
    vi.mocked(canManageClasses).mockReturnValue(true);
    vi.mocked(assertClassOwnership).mockResolvedValue(true);
  });

  it("salva o diário com avaliação manual e não dispara scoring quando todos os presentes têm notas", async () => {
    const client = makeDiaryActionClient();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await completeDiary({
      content: "Aula sobre profissões",
      lessonType: "theoretical",
      aiSummary: "Resumo curto",
      studentIds: [STUDENT_ID],
      rows: [
        {
          studentId: STUDENT_ID,
          absent: false,
          note: "Participou bem",
          teacherComprehensionRating: 4,
          teacherAttentionRating: 4,
          teacherEngagementRating: 4,
        },
      ],
      studentSummaries: [
        {
          studentId: STUDENT_ID,
          summary: "Resumo individual do aluno na aula de profissões.",
        },
      ],
    });

    expect(result).toEqual({ ok: true, diaryId: "diary-1" });
    expect(client._spies.diariesInsertSpy).toHaveBeenCalled();
    expect(client._spies.diaryStudentsInsertSpy).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/diario");
    expect(revalidatePath).toHaveBeenCalledWith("/galeria");
    await flushAfterTasks();
    expect(runDiaryScoringJob).not.toHaveBeenCalled();
    expect(runJourneySuggestionForStudent).not.toHaveBeenCalled();
    expect(recomputeAttentionTrendForStudent).toHaveBeenCalledWith(
      STUDENT_ID,
      PROFESSOR_ID
    );
  });

  it("após o diário, dispara sugestão de jornada para cada jornada do aluno", async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "student_journeys") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ journey_id: "jj-1" }, { journey_id: "jj-2" }],
              }),
            }),
          };
        }
        throw new Error(`Unexpected admin table ${table}`);
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const client = makeDiaryActionClient();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await completeDiary({
      content: "Aula",
      lessonType: "theoretical",
      aiSummary: "Resumo",
      studentIds: [STUDENT_ID],
      rows: [{ studentId: STUDENT_ID, absent: false }],
    });

    expect(result.ok).toBe(true);
    await flushAfterTasks();
    expect(runJourneySuggestionForStudent).toHaveBeenCalledTimes(2);
    expect(runJourneySuggestionForStudent).toHaveBeenCalledWith(
      STUDENT_ID,
      PROFESSOR_ID,
      "jj-1"
    );
    expect(runJourneySuggestionForStudent).toHaveBeenCalledWith(
      STUDENT_ID,
      PROFESSOR_ID,
      "jj-2"
    );
    expect(recomputeAttentionTrendForStudent).toHaveBeenCalledWith(
      STUDENT_ID,
      PROFESSOR_ID
    );
  });

  it("deveria validar ownership das turmas antes de criar o diário", async () => {
    const client = makeDiaryActionClient();
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(assertClassOwnership).mockResolvedValue(false);

    const result = await completeDiary({
      content: "Aula de revisão",
      lessonType: "theoretical",
      aiSummary: "Resumo curto",
      studentIds: [STUDENT_ID],
      classIds: [CLASS_ID],
      rows: [{ studentId: STUDENT_ID, absent: false }],
    });

    expect(result).toEqual({ ok: false, error: "Turma inválida" });
    expect(client._spies.diariesInsertSpy).not.toHaveBeenCalled();
    await flushAfterTasks();
    expect(runDiaryScoringJob).not.toHaveBeenCalled();
    expect(recomputeAttentionTrendForStudent).not.toHaveBeenCalled();
  });

  it("deveria falhar quando não consegue persistir diary_students", async () => {
    const client = makeDiaryActionClient({
      diaryStudentsInsertError: { message: "insert failed" },
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await completeDiary({
      content: "Aula prática",
      lessonType: "practical",
      aiSummary: "Resumo curto",
      studentIds: [STUDENT_ID],
      rows: [{ studentId: STUDENT_ID, absent: false }],
    });

    expect(result.ok).toBe(false);
    await flushAfterTasks();
    expect(runDiaryScoringJob).not.toHaveBeenCalled();
  });
});
