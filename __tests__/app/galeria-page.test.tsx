import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  isProfessorPremium: vi.fn(),
}));

vi.mock("@/actions/students", () => ({
  createStudent: vi.fn(),
  deleteStudentForm: vi.fn(),
  setStudentClass: vi.fn(),
}));

vi.mock("@/actions/classes", () => ({
  createClass: vi.fn(),
  deleteClass: vi.fn(),
}));

vi.mock("@/components/galeria/StudentCard", () => ({
  StudentCard: ({ id, name }: { id: string; name: string }) => (
    <div data-student-card={id}>{name}</div>
  ),
}));

vi.mock("@/components/galeria/StudentActionsMenu", () => ({
  StudentActionsMenu: ({ student }: { student: { id: string } }) => (
    <div data-student-menu={student.id} />
  ),
}));

vi.mock("@/components/galeria/CollapsibleSection", () => ({
  CollapsibleSection: ({
    header,
    children,
  }: {
    header: ReactNode;
    children: ReactNode;
  }) => (
    <section data-collapsible="true">
      <div>{header}</div>
      <div>{children}</div>
    </section>
  ),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";
import GaleriaPage from "@/app/(app)/galeria/page";

type PageClientOptions = {
  userId?: string | null;
  students?: Array<{ id: string; name: string; class_id: string | null }>;
  classes?: Array<{ id: string; name: string }>;
  progress?: Array<{
    student_id: string;
    attention_trend: string | null;
    attention_confidence: number | null;
  }>;
  diaryLinks?: Array<{ student_id: string }>;
};

function makePageClient(options: PageClientOptions = {}) {
  const {
    userId = "prof-1",
    students = [],
    classes = [],
    progress = [],
    diaryLinks = [],
  } = options;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: students }),
            }),
          }),
        };
      }

      if (table === "classes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: classes }),
            }),
          }),
        };
      }

      if (table === "student_progress") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: progress }),
          }),
        };
      }

      if (table === "diary_students") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: diaryLinks }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe("GaleriaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
  });

  it("retorna null quando não há usuário autenticado", async () => {
    const client = makePageClient({ userId: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(isProfessorPremium).mockReturnValue(false);

    const result = await GaleriaPage();

    expect(result).toBeNull();
  });

  it("renderiza a versão Explorar sem seção de turma", async () => {
    const client = makePageClient({
      students: [
        { id: "s1", name: "Ana", class_id: null },
        { id: "s2", name: "Bruno", class_id: null },
      ],
      diaryLinks: [{ student_id: "s1" }],
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(isProfessorPremium).mockReturnValue(false);

    const html = renderToStaticMarkup(await GaleriaPage());

    expect(html).toContain("Galeria");
    expect(html).toContain("Novo aluno");
    expect(html).not.toContain("Nova turma");
    expect(html).toContain("data-student-card=\"s1\"");
    expect(html).toContain("data-student-card=\"s2\"");
  });

  it("renderiza a versão premium agrupada por turma e seção Sem turma", async () => {
    const client = makePageClient({
      students: [
        { id: "s1", name: "Ana", class_id: "c1" },
        { id: "s2", name: "Bruno", class_id: null },
      ],
      classes: [{ id: "c1", name: "Turma A" }],
      diaryLinks: [{ student_id: "s1" }, { student_id: "s2" }],
      progress: [
        {
          student_id: "s1",
          attention_trend: "stable",
          attention_confidence: 0.8,
        },
      ],
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(isProfessorPremium).mockReturnValue(true);

    const html = renderToStaticMarkup(await GaleriaPage());

    expect(html).toContain("Nova turma");
    expect(html).toContain("Novo aluno");
    expect(html).toContain("Turma A");
    expect(html).toContain("Sem turma");
    expect(html).toContain("Selecionar aluno sem turma…");
    expect(html).toContain("data-student-menu=\"s1\"");
    expect(html).toContain("data-student-menu=\"s2\"");
  });
});
