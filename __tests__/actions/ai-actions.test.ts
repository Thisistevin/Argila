import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn(async (fn: () => Promise<void> | void) => {
    await fn();
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

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canManageClasses,
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";
import { assertClassOwnership } from "@/actions/classes";
import { runDiaryScoringJob } from "@/lib/ai/run-diary-scoring";
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

      throw new Error(`Unexpected table ${table}`);
    }),
    _spies: {
      ownedStudentsInSpy,
      diariesInsertSpy,
      diariesSingleSpy,
      diaryStudentsInsertSpy,
      diaryClassesInsertSpy,
    },
  };

  return client;
}

describe("AI actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("salva o diário e dispara scoring quando o payload é válido", async () => {
    const client = makeDiaryActionClient();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await completeDiary({
      content: "Aula sobre profissões",
      lessonType: "theoretical",
      aiSummary: "Resumo curto",
      studentIds: [STUDENT_ID],
      rows: [{ studentId: STUDENT_ID, absent: false, note: "Participou bem" }],
    });

    expect(result).toEqual({ ok: true, diaryId: "diary-1" });
    expect(client._spies.diariesInsertSpy).toHaveBeenCalled();
    expect(client._spies.diaryStudentsInsertSpy).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/diario");
    expect(revalidatePath).toHaveBeenCalledWith("/galeria");
    expect(runDiaryScoringJob).toHaveBeenCalledWith("diary-1", PROFESSOR_ID);
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
    expect(runDiaryScoringJob).not.toHaveBeenCalled();
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
    expect(runDiaryScoringJob).not.toHaveBeenCalled();
  });
});
