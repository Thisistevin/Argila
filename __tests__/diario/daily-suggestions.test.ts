import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as appTz from "@/lib/diario/app-timezone";
import {
  buildClassActivitySuggestions,
  buildCriticalStudentsSuggestions,
  filterStudentsDecliningChangedToday,
  sortCriticalStudents,
} from "@/lib/diario/build-daily-suggestions";
import { ensureDailySuggestionsForProfessor } from "@/lib/diario/ensure-daily-suggestions";

describe("build-daily-suggestions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ordena por faltas consecutivas, depois menor overall_score", () => {
    const sorted = sortCriticalStudents([
      {
        id: "a",
        name: "A",
        consecutive_absences: 1,
        overall_score: 5,
        attention_changed_at: "2026-04-15T10:00:00.000Z",
      },
      {
        id: "b",
        name: "B",
        consecutive_absences: 2,
        overall_score: 8,
        attention_changed_at: "2026-04-15T09:00:00.000Z",
      },
      {
        id: "c",
        name: "C",
        consecutive_absences: 2,
        overall_score: 4,
        attention_changed_at: "2026-04-15T11:00:00.000Z",
      },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["c", "b", "a"]);
  });

  it("limita a 5 sugestões de alunos", () => {
    const students = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      name: `Aluno ${i}`,
      consecutive_absences: i >= 6 ? 2 : 1,
      overall_score: 5,
      attention_changed_at: "2026-04-15T12:00:00.000Z",
    }));
    const { items } = buildCriticalStudentsSuggestions(students);
    expect(items).toHaveLength(5);
  });

  it("dupla falta usa template de retomada", () => {
    const { items } = buildCriticalStudentsSuggestions([
      {
        id: "1",
        name: "João",
        consecutive_absences: 2,
        overall_score: 6,
        attention_changed_at: "2026-04-15T12:00:00.000Z",
      },
    ]);
    expect(items[0]?.text).toContain("João");
    expect(items[0]?.text).toMatch(/retomada/i);
  });

  it("fallback de turma sem classes retorna ideia genérica", () => {
    const { source_kind, items } = buildClassActivitySuggestions({
      professorId: "p1",
      day: "2026-04-15",
      classes: [],
    });
    expect(source_kind).toBe("class_activity");
    expect(items).toHaveLength(1);
    expect(items[0]?.text.length).toBeGreaterThan(10);
  });

  it("filtra declining com mudança hoje no fuso do app", () => {
    const today = "2026-04-15";
    vi.spyOn(appTz, "calendarDateKeyForInstantInAppTz").mockImplementation(
      (iso: string) => (iso.startsWith("2026-04-15") ? "2026-04-15" : "2026-04-14")
    );
    const rows = filterStudentsDecliningChangedToday(
      [
        {
          id: "1",
          name: "Ana",
          student_progress: {
            attention_trend: "declining",
            attention_changed_at: "2026-04-15T03:00:00.000Z",
            consecutive_absences: 1,
            overall_score: 6,
          },
        },
        {
          id: "2",
          name: "Bob",
          student_progress: {
            attention_trend: "declining",
            attention_changed_at: "2026-04-14T03:00:00.000Z",
            consecutive_absences: 2,
            overall_score: 4,
          },
        },
      ],
      today
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("1");
  });
});

describe("ensureDailySuggestionsForProfessor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(appTz, "calendarDateKeyInAppTz").mockReturnValue("2030-06-15");
  });

  it("segundo acesso no mesmo dia reutiliza a linha existente", async () => {
    const existing = {
      id: "row-1",
      professor_id: "prof-1",
      day: "2030-06-15",
      source_kind: "class_activity" as const,
      items: [{ kind: "class_activity", text: "cached", class_id: null, class_name: null }],
      created_at: "2030-06-15T08:00:00.000Z",
      updated_at: "2030-06-15T08:00:00.000Z",
    };
    const insertSpy = vi.fn();
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "daily_teacher_suggestions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: existing,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: insertSpy,
          };
        }
        throw new Error(`unexpected ${table}`);
      }),
    };

    const out = await ensureDailySuggestionsForProfessor(
      supabase as never,
      "prof-1"
    );
    expect(out.id).toBe("row-1");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("primeiro acesso no dia cria linha com sugestões", async () => {
    const inserted = {
      id: "new",
      professor_id: "prof-1",
      day: "2030-06-15",
      source_kind: "critical_students" as const,
      items: [
        {
          kind: "student",
          student_id: "s1",
          student_name: "Lu",
          text: "Faça com Lu uma tarefa curta com checagem no meio da aula.",
        },
      ],
      created_at: "2030-06-15T10:00:00.000Z",
      updated_at: "2030-06-15T10:00:00.000Z",
    };
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "daily_teacher_suggestions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: insertSpy,
          };
        }
        if (table === "students") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "s1",
                    name: "Lu",
                    student_progress: {
                      attention_trend: "declining",
                      attention_changed_at: "2030-06-15T12:00:00.000Z",
                      consecutive_absences: 1,
                      overall_score: 5,
                    },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      }),
    };

    const out = await ensureDailySuggestionsForProfessor(
      supabase as never,
      "prof-1"
    );
    expect(insertSpy).toHaveBeenCalled();
    expect(out.source_kind).toBe("critical_students");
    expect(Array.isArray(out.items)).toBe(true);
  });
});
