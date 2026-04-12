import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  isProfessorPremium: vi.fn(),
  maxStudentsForPlan: vi.fn(),
  canManageClasses: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
  maxStudentsForPlan,
  canManageClasses,
} from "@/lib/entitlement";
import { setStudentClass, createStudent } from "@/actions/students";
import { completeDiary } from "@/actions/diary";

// ── Helpers ────────────────────────────────────────────────────────────────

const PROF_A = "aaaaaaaa-0000-0000-0000-000000000001";
const CLASS_A = "cccccccc-0000-0000-0000-000000000001"; // pertence ao prof A
const STUDENT_A = "dddddddd-0000-0000-0000-000000000001";

/**
 * Cria um mock de client Supabase com chaining por tabela.
 *
 * `classesRow`: o que `classes.maybeSingle()` retorna (null = turma não pertence ao professor)
 * `studentsUpdateSpy`: spy para verificar se .update() foi chamado em students
 * `studentsInsertSpy`: spy para verificar se .insert() foi chamado em students
 * `diaryInsertSpy`: spy para verificar se .insert() foi chamado em diary_classes
 */
function makeMockClient({
  classesRow,
  studentsCount = 0,
}: {
  classesRow: object | null;
  studentsCount?: number;
}) {
  const studentsUpdateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
  });
  const studentsInsertSpy = vi.fn().mockReturnValue({ error: null });
  const diaryInsertSpy = vi.fn().mockReturnValue({ error: null });

  const diariesInsertSpy = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "diary-1" }, error: null }),
    }),
  });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROF_A } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "classes") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: classesRow }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            count: studentsCount,
            // Para a query de count
            head: true,
          }),
          insert: studentsInsertSpy,
          update: studentsUpdateSpy,
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
        };
      }
      if (table === "diaries") {
        return { insert: diariesInsertSpy };
      }
      if (table === "diary_classes") {
        return { insert: diaryInsertSpy };
      }
      if (table === "diary_students") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
      };
    }),
    _spies: { studentsUpdateSpy, studentsInsertSpy, diaryInsertSpy },
  };

  return client;
}

// ── Testes ─────────────────────────────────────────────────────────────────

describe("Contrato de isolamento: ownership de turmas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // defaults para premium
    vi.mocked(isProfessorPremium).mockReturnValue(true);
    vi.mocked(canManageClasses).mockReturnValue(true);
    vi.mocked(maxStudentsForPlan).mockReturnValue(40);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
  });

  it("professor A não consegue vincular aluno à turma do professor B", async () => {
    // classes.maybeSingle retorna null → turma não pertence ao professor A
    const client = makeMockClient({ classesRow: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const fd = new FormData();
    fd.set("student_id", STUDENT_A);
    fd.set("class_id", "turma-do-professor-B");
    await setStudentClass(fd);

    expect(client._spies.studentsUpdateSpy).not.toHaveBeenCalled();
  });

  it("professor A não consegue criar aluno apontando para turma do professor B", async () => {
    const client = makeMockClient({ classesRow: null, studentsCount: 0 });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const fd = new FormData();
    fd.set("name", "João");
    fd.set("class_id", "turma-do-professor-B");
    await createStudent(fd);

    expect(client._spies.studentsInsertSpy).not.toHaveBeenCalled();
  });

  it("professor A não consegue registrar diário com classId de outro professor", async () => {
    const client = makeMockClient({ classesRow: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    // A query de owned students precisa retornar os alunos corretos
    vi.mocked(client.from).mockImplementation((table: string) => {
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [{ id: STUDENT_A }] }),
          }),
          insert: client._spies.studentsInsertSpy,
          update: client._spies.studentsUpdateSpy,
        } as never;
      }
      if (table === "classes") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      if (table === "diaries") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "diary-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "diary_classes") {
        return { insert: client._spies.diaryInsertSpy };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const result = await completeDiary({
      content: "Aula de teste",
      lessonType: "theoretical",
      aiSummary: "resumo",
      studentIds: [STUDENT_A],
      classIds: ["turma-do-professor-B"],
      rows: [{ studentId: STUDENT_A, absent: false }],
    });

    expect(result.ok).toBe(false);
    expect(client._spies.diaryInsertSpy).not.toHaveBeenCalled();
  });

  it("professor premium consegue vincular aluno à própria turma", async () => {
    const client = makeMockClient({ classesRow: { id: CLASS_A } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    // mock do update em students precisa suportar .eq().eq()
    const eqChain = { eq: vi.fn().mockReturnThis() };
    client._spies.studentsUpdateSpy.mockReturnValue(eqChain);

    const fd = new FormData();
    fd.set("student_id", STUDENT_A);
    fd.set("class_id", CLASS_A);
    await setStudentClass(fd);

    expect(client._spies.studentsUpdateSpy).toHaveBeenCalled();
  });

  it("usuário Explorar não consegue usar turmas mesmo com class_id válido", async () => {
    vi.mocked(isProfessorPremium).mockReturnValue(false);

    const client = makeMockClient({ classesRow: { id: CLASS_A } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const fd = new FormData();
    fd.set("student_id", STUDENT_A);
    fd.set("class_id", CLASS_A);
    await setStudentClass(fd);

    expect(client._spies.studentsUpdateSpy).not.toHaveBeenCalled();
  });
});
