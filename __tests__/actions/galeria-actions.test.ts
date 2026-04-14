import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  isProfessorPremium: vi.fn(),
  maxStudentsForPlan: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
  maxStudentsForPlan,
} from "@/lib/entitlement";
import {
  createStudent,
  deleteStudent,
  deleteStudentForm,
  setStudentClass,
} from "@/actions/students";
import {
  assertClassOwnership,
  createClass,
  deleteClass,
} from "@/actions/classes";

const PROFESSOR_ID = "prof-1";
const CLASS_ID = "class-1";
const STUDENT_ID = "student-1";

type MockClientOptions = {
  authUserId?: string | null;
  studentsCount?: number;
  classesMaybeSingleData?: { id: string } | null;
  studentsInsertError?: { message: string } | null;
  studentsUpdateError?: { message: string } | null;
  studentsDeleteError?: { message: string } | null;
  classesInsertData?: { id: string } | null;
  classesInsertError?: { message: string } | null;
  classesDeleteError?: { message: string } | null;
};

function makeMockClient(options: MockClientOptions = {}) {
  const {
    authUserId = PROFESSOR_ID,
    studentsCount = 0,
    classesMaybeSingleData = { id: CLASS_ID },
    studentsInsertError = null,
    studentsUpdateError = null,
    studentsDeleteError = null,
    classesInsertData = { id: CLASS_ID },
    classesInsertError = null,
    classesDeleteError = null,
  } = options;

  const countEqSpy = vi
    .fn()
    .mockResolvedValue({ count: studentsCount, error: null });

  const classesEqSpy = vi.fn().mockReturnThis();
  const classesMaybeSingleSpy = vi
    .fn()
    .mockResolvedValue({ data: classesMaybeSingleData, error: null });

  const studentsInsertSpy = vi
    .fn()
    .mockResolvedValue({ error: studentsInsertError });

  const studentsUpdateFinalEqSpy = vi
    .fn()
    .mockResolvedValue({ error: studentsUpdateError });
  const studentsUpdateChain = {
    eq: vi.fn().mockReturnValue({
      eq: studentsUpdateFinalEqSpy,
    }),
    in: vi.fn().mockReturnValue({
      eq: studentsUpdateFinalEqSpy,
    }),
  };
  const studentsUpdateSpy = vi.fn().mockReturnValue(studentsUpdateChain);

  const studentsDeleteFinalEqSpy = vi
    .fn()
    .mockResolvedValue({ error: studentsDeleteError });
  const studentsDeleteChain = {
    eq: vi.fn().mockReturnValue({
      eq: studentsDeleteFinalEqSpy,
    }),
  };
  const studentsDeleteSpy = vi.fn().mockReturnValue(studentsDeleteChain);

  const classesInsertSingleSpy = vi
    .fn()
    .mockResolvedValue({ data: classesInsertData, error: classesInsertError });
  const classesInsertSelectSpy = vi.fn().mockReturnValue({
    single: classesInsertSingleSpy,
  });
  const classesInsertSpy = vi.fn().mockReturnValue({
    select: classesInsertSelectSpy,
  });

  const classesDeleteFinalEqSpy = vi
    .fn()
    .mockResolvedValue({ error: classesDeleteError });
  const classesDeleteChain = {
    eq: vi.fn().mockReturnValue({
      eq: classesDeleteFinalEqSpy,
    }),
  };
  const classesDeleteSpy = vi.fn().mockReturnValue(classesDeleteChain);

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
            eq: countEqSpy,
          }),
          insert: studentsInsertSpy,
          update: studentsUpdateSpy,
          delete: studentsDeleteSpy,
        };
      }

      if (table === "classes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: classesEqSpy,
            maybeSingle: classesMaybeSingleSpy,
          }),
          insert: classesInsertSpy,
          delete: classesDeleteSpy,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    _spies: {
      countEqSpy,
      classesEqSpy,
      classesMaybeSingleSpy,
      studentsInsertSpy,
      studentsUpdateSpy,
      studentsUpdateFinalEqSpy,
      studentsDeleteSpy,
      studentsDeleteFinalEqSpy,
      classesInsertSpy,
      classesInsertSelectSpy,
      classesInsertSingleSpy,
      classesDeleteSpy,
      classesDeleteFinalEqSpy,
    },
  };

  return client;
}

describe("Galeria actions", () => {
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
    vi.mocked(maxStudentsForPlan).mockReturnValue(40);
  });

  describe("createStudent", () => {
    it("cria aluno quando o professor está dentro do limite", async () => {
      const client = makeMockClient({ studentsCount: 1 });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "João Silva");

      await createStudent(fd);

      expect(client._spies.studentsInsertSpy).toHaveBeenCalledWith({
        professor_id: PROFESSOR_ID,
        name: "João Silva",
        class_id: null,
      });
      expect(revalidatePath).toHaveBeenCalledWith("/galeria");
    });

    it("bloqueia criação com turma para plano Explorar", async () => {
      vi.mocked(isProfessorPremium).mockReturnValue(false);
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "João Silva");
      fd.set("class_id", CLASS_ID);

      await createStudent(fd);

      expect(client._spies.studentsInsertSpy).not.toHaveBeenCalled();
    });

    it("bloqueia criação ao atingir o limite de alunos do plano", async () => {
      vi.mocked(maxStudentsForPlan).mockReturnValue(1);
      const client = makeMockClient({ studentsCount: 1 });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "João Silva");

      await createStudent(fd);

      expect(client._spies.studentsInsertSpy).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteStudent / deleteStudentForm", () => {
    it("exclui aluno e revalida a galeria", async () => {
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      await deleteStudent(STUDENT_ID);

      expect(client._spies.studentsDeleteSpy).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/galeria");
    });

    it("deleteStudentForm envia o id correto para a exclusão", async () => {
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("id", STUDENT_ID);

      await deleteStudentForm(fd);

      expect(client._spies.studentsDeleteSpy).toHaveBeenCalled();
      expect(client._spies.studentsDeleteFinalEqSpy).toHaveBeenCalledWith(
        "professor_id",
        PROFESSOR_ID
      );
    });

    it("não revalida quando a exclusão falha", async () => {
      const client = makeMockClient({
        studentsDeleteError: { message: "db down" },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);

      await deleteStudent(STUDENT_ID);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("setStudentClass", () => {
    it("remove o aluno da turma quando class_id vem vazio", async () => {
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("student_id", STUDENT_ID);
      fd.set("class_id", "");

      await setStudentClass(fd);

      expect(client._spies.studentsUpdateSpy).toHaveBeenCalledWith({
        class_id: null,
      });
      expect(revalidatePath).toHaveBeenCalledWith("/galeria");
    });

    it("bloqueia mover para turma no plano Explorar", async () => {
      vi.mocked(isProfessorPremium).mockReturnValue(false);
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("student_id", STUDENT_ID);
      fd.set("class_id", CLASS_ID);

      await setStudentClass(fd);

      expect(client._spies.studentsUpdateSpy).not.toHaveBeenCalled();
    });

    it("não deveria revalidar a galeria quando a atualização da turma falha", async () => {
      const client = makeMockClient({
        studentsUpdateError: { message: "update failed" },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("student_id", STUDENT_ID);
      fd.set("class_id", "");

      await setStudentClass(fd);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("assertClassOwnership", () => {
    it("retorna true quando a turma pertence ao professor", async () => {
      const client = makeMockClient({
        classesMaybeSingleData: { id: CLASS_ID },
      });
      const owned = await assertClassOwnership(
        client as never,
        CLASS_ID,
        PROFESSOR_ID
      );

      expect(owned).toBe(true);
    });

    it("retorna false quando a turma não pertence ao professor", async () => {
      const client = makeMockClient({
        classesMaybeSingleData: null,
      });
      const owned = await assertClassOwnership(
        client as never,
        CLASS_ID,
        PROFESSOR_ID
      );

      expect(owned).toBe(false);
    });
  });

  describe("createClass", () => {
    it("cria turma e associa alunos selecionados", async () => {
      const client = makeMockClient({
        classesInsertData: { id: CLASS_ID },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "Turma A");
      fd.append("student_ids", "student-1");
      fd.append("student_ids", "student-2");

      await createClass(fd);

      expect(client._spies.classesInsertSpy).toHaveBeenCalledWith({
        professor_id: PROFESSOR_ID,
        name: "Turma A",
      });
      expect(client._spies.studentsUpdateSpy).toHaveBeenCalledWith({
        class_id: CLASS_ID,
      });
      expect(revalidatePath).toHaveBeenCalledWith("/galeria");
      expect(revalidatePath).toHaveBeenCalledWith("/diario/novo");
    });

    it("bloqueia criação de turma para plano Explorar", async () => {
      vi.mocked(isProfessorPremium).mockReturnValue(false);
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "Turma A");

      await createClass(fd);

      expect(client._spies.classesInsertSpy).not.toHaveBeenCalled();
    });

    it("deveria tratar falha ao associar alunos sem seguir como se tudo tivesse dado certo", async () => {
      const client = makeMockClient({
        classesInsertData: { id: CLASS_ID },
        studentsUpdateError: { message: "students update failed" },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("name", "Turma A");
      fd.append("student_ids", "student-1");

      await createClass(fd);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteClass", () => {
    it("desvincula alunos, exclui a turma e revalida telas dependentes", async () => {
      const client = makeMockClient();
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("id", CLASS_ID);

      await deleteClass(fd);

      expect(client._spies.studentsUpdateSpy).toHaveBeenCalledWith({
        class_id: null,
      });
      expect(client._spies.classesDeleteSpy).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/galeria");
      expect(revalidatePath).toHaveBeenCalledWith("/diario/novo");
    });

    it("não deveria revalidar quando a exclusão da turma falha", async () => {
      const client = makeMockClient({
        classesDeleteError: { message: "delete failed" },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);

      const fd = new FormData();
      fd.set("id", CLASS_ID);

      await deleteClass(fd);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
