import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDateKeyInAppTz } from "@/lib/diario/app-timezone";
import {
  buildClassActivitySuggestions,
  buildCriticalStudentsSuggestions,
  filterStudentsDecliningChangedToday,
  type DailySuggestionsPayload,
} from "@/lib/diario/build-daily-suggestions";

export type DailyTeacherSuggestionsRow = {
  id: string;
  professor_id: string;
  day: string;
  source_kind: "critical_students" | "class_activity";
  items: unknown;
  created_at: string;
  updated_at: string;
};

export async function ensureDailySuggestionsForProfessor(
  supabase: SupabaseClient,
  professorId: string
): Promise<DailyTeacherSuggestionsRow> {
  const day = calendarDateKeyInAppTz();

  const { data: existing, error: selErr } = await supabase
    .from("daily_teacher_suggestions")
    .select("*")
    .eq("professor_id", professorId)
    .eq("day", day)
    .maybeSingle();

  if (selErr) {
    console.error("ensureDailySuggestionsForProfessor: select", selErr);
    throw new Error(selErr.message);
  }

  if (existing) {
    return existing as DailyTeacherSuggestionsRow;
  }

  const { data: studentsRaw, error: stErr } = await supabase
    .from("students")
    .select(
      `
      id,
      name,
      student_progress (
        attention_trend,
        attention_changed_at,
        consecutive_absences,
        overall_score
      )
    `
    )
    .eq("professor_id", professorId);

  if (stErr) {
    console.error("ensureDailySuggestionsForProfessor: students", stErr);
    throw new Error(stErr.message);
  }

  const rows =
    (studentsRaw ?? []) as Array<{
      id: string;
      name: string;
      student_progress:
        | {
            attention_trend: string | null;
            attention_changed_at: string | null;
            consecutive_absences: number | null;
            overall_score: number | null;
          }
        | Array<{
            attention_trend: string | null;
            attention_changed_at: string | null;
            consecutive_absences: number | null;
            overall_score: number | null;
          }>
        | null;
    }>;

  const normalized = rows.map((r) => {
    const sp = r.student_progress;
    const flat = Array.isArray(sp) ? sp[0] ?? null : sp;
    return {
      id: r.id,
      name: r.name,
      student_progress: flat,
    };
  });

  const critical = filterStudentsDecliningChangedToday(normalized, day);

  let payload: DailySuggestionsPayload;
  if (critical.length > 0) {
    payload = buildCriticalStudentsSuggestions(critical);
  } else {
    const { data: classes, error: clErr } = await supabase
      .from("classes")
      .select("id, name")
      .eq("professor_id", professorId)
      .order("name", { ascending: true });

    if (clErr) {
      console.error("ensureDailySuggestionsForProfessor: classes", clErr);
      throw new Error(clErr.message);
    }

    payload = buildClassActivitySuggestions({
      professorId,
      day,
      classes: classes ?? [],
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("daily_teacher_suggestions")
    .insert({
      professor_id: professorId,
      day,
      source_kind: payload.source_kind,
      items: payload.items,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    console.error("ensureDailySuggestionsForProfessor: insert", insErr);
    throw new Error(insErr?.message ?? "insert failed");
  }

  return inserted as DailyTeacherSuggestionsRow;
}
