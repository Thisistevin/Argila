import { calendarDateKeyForInstantInAppTz } from "@/lib/diario/app-timezone";

export type CriticalStudentInput = {
  id: string;
  name: string;
  consecutive_absences: number;
  overall_score: number | null;
  attention_changed_at: string;
};

export type SuggestionItem =
  | {
      kind: "student";
      student_id: string;
      student_name: string;
      text: string;
    }
  | {
      kind: "class_activity";
      class_id: string | null;
      class_name: string | null;
      text: string;
    };

export type DailySuggestionsPayload = {
  source_kind: "critical_students" | "class_activity";
  items: SuggestionItem[];
};

const DOUBLE_ABSENCE =
  "Chame {name} para uma retomada curta da última aula.";

const SINGLE_ATTENTION_TEMPLATES = [
  "Faça com {name} uma tarefa curta com checagem no meio da aula.",
  "Retome instruções com {name} em passos curtos e confirme foco no meio.",
];

const CLASS_ACTIVITY_POOL = [
  "Roda-relâmpago de perguntas em pares por 8 min.",
  "Mini-brigada de correção em voz alta (3 min por grupo).",
  "Revisão oral em círculo: cada aluno resume um ponto em 20 seg.",
];

const GENERIC_CLASS_ACTIVITY =
  "Planeje 5 minutos de revisão oral com a turma toda.";

function substituteName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

export function sortCriticalStudents(
  students: CriticalStudentInput[]
): CriticalStudentInput[] {
  return [...students].sort((a, b) => {
    if (b.consecutive_absences !== a.consecutive_absences) {
      return b.consecutive_absences - a.consecutive_absences;
    }
    const ao = a.overall_score ?? 999;
    const bo = b.overall_score ?? 999;
    if (ao !== bo) return ao - bo;
    return (
      new Date(b.attention_changed_at).getTime() -
      new Date(a.attention_changed_at).getTime()
    );
  });
}

export function buildCriticalStudentsSuggestions(
  students: CriticalStudentInput[]
): DailySuggestionsPayload {
  const top = sortCriticalStudents(students).slice(0, 5);
  const items: SuggestionItem[] = top.map((s, idx) => {
    let text: string;
    if (s.consecutive_absences >= 2) {
      text = substituteName(DOUBLE_ABSENCE, s.name);
    } else {
      const tpl =
        SINGLE_ATTENTION_TEMPLATES[idx % SINGLE_ATTENTION_TEMPLATES.length];
      text = substituteName(tpl, s.name);
    }
    return {
      kind: "student" as const,
      student_id: s.id,
      student_name: s.name,
      text,
    };
  });
  return { source_kind: "critical_students", items };
}

function hashPickIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return modulo === 0 ? 0 : h % modulo;
}

export function buildClassActivitySuggestions(params: {
  professorId: string;
  day: string;
  classes: Array<{ id: string; name: string }>;
}): DailySuggestionsPayload {
  const { professorId, day, classes } = params;
  if (!classes.length) {
    return {
      source_kind: "class_activity",
      items: [
        {
          kind: "class_activity",
          class_id: null,
          class_name: null,
          text: GENERIC_CLASS_ACTIVITY,
        },
      ],
    };
  }
  const idx = hashPickIndex(`${professorId}:${day}`, classes.length);
  const cls = classes[idx];
  const actIdx = hashPickIndex(`${professorId}:${day}:act`, CLASS_ACTIVITY_POOL.length);
  const text = CLASS_ACTIVITY_POOL[actIdx];
  return {
    source_kind: "class_activity",
    items: [
      {
        kind: "class_activity",
        class_id: cls.id,
        class_name: cls.name,
        text,
      },
    ],
  };
}

export function filterStudentsDecliningChangedToday(
  rows: Array<{
    id: string;
    name: string;
    student_progress: {
      attention_trend: string | null;
      attention_changed_at: string | null;
      consecutive_absences: number | null;
      overall_score: number | null;
    } | null;
  }>,
  todayKey: string
): CriticalStudentInput[] {
  const out: CriticalStudentInput[] = [];
  for (const r of rows) {
    const sp = r.student_progress;
    if (!sp || sp.attention_trend !== "declining" || !sp.attention_changed_at) {
      continue;
    }
    if (calendarDateKeyForInstantInAppTz(sp.attention_changed_at) !== todayKey) {
      continue;
    }
    out.push({
      id: r.id,
      name: r.name,
      consecutive_absences: sp.consecutive_absences ?? 0,
      overall_score: sp.overall_score,
      attention_changed_at: sp.attention_changed_at,
    });
  }
  return out;
}
