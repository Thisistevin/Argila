import { createAdminClient } from "@/lib/supabase/admin";

/** Linhas já ordenadas do mais recente para o mais antigo (máx. 5). */
export type DiaryAttentionInputRow = {
  absent: boolean;
  attention_score: number | null;
};

export function resolveAttentionChangedAt(params: {
  oldTrend: string | null;
  newTrend: string;
  previousChangedAt: string | null;
  nowIso: string;
}): string | null {
  if (params.newTrend !== params.oldTrend) return params.nowIso;
  return params.previousChangedAt ?? null;
}

export function computeAttentionFromRecentDiaryRows(
  rows: DiaryAttentionInputRow[]
): {
  attention_trend: "declining" | "improving" | "stable" | "insufficient_data";
  attention_confidence: number;
  consecutive_absences: number;
} {
  let consecutive_absences = 0;
  for (const r of rows) {
    if (r.absent) consecutive_absences += 1;
    else break;
  }

  if (consecutive_absences >= 2) {
    return {
      attention_trend: "declining",
      attention_confidence: 1,
      consecutive_absences,
    };
  }

  const presentWithScore = rows.filter(
    (r) => !r.absent && r.attention_score != null
  );
  if (presentWithScore.length < 3) {
    return {
      attention_trend: "insufficient_data",
      attention_confidence: 0,
      consecutive_absences,
    };
  }

  const scores = presentWithScore.map((r) => r.attention_score as number);
  const recentSlice = scores.slice(0, 2);
  const previousSlice = scores.slice(2, 4);
  const recentAvg =
    recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
  const previousAvg =
    previousSlice.reduce((a, b) => a + b, 0) / previousSlice.length;
  const delta = recentAvg - previousAvg;

  let attention_trend: "declining" | "improving" | "stable";
  if (delta <= -1.5) attention_trend = "declining";
  else if (delta >= 1.5) attention_trend = "improving";
  else attention_trend = "stable";

  return {
    attention_trend,
    attention_confidence: 0.85,
    consecutive_absences,
  };
}

/**
 * Recalcula e persiste `attention_trend` (e campos associados) para um aluno,
 * com base nos últimos 5 `diary_students` ligados a diários do professor.
 */
export async function recomputeAttentionTrendForStudent(
  studentId: string,
  professorId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: rawRows, error: histErr } = await admin
    .from("diary_students")
    .select(
      `
      absent,
      attention_score,
      created_at,
      diary_id,
      diaries!inner ( professor_id )
    `
    )
    .eq("student_id", studentId)
    .eq("diaries.professor_id", professorId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (histErr) {
    console.error("recomputeAttentionTrendForStudent: histórico", histErr);
    return;
  }

  const inputRows: DiaryAttentionInputRow[] = (rawRows ?? []).map((r) => ({
    absent: Boolean(r.absent),
    attention_score:
      r.attention_score === null || r.attention_score === undefined
        ? null
        : Number(r.attention_score),
  }));

  const computed = computeAttentionFromRecentDiaryRows(inputRows);

  const { data: existing } = await admin
    .from("student_progress")
    .select(
      "attention_trend, attention_changed_at, overall_score, short_note, last_diary_at, professor_id"
    )
    .eq("student_id", studentId)
    .maybeSingle();

  const oldTrend = existing?.attention_trend ?? null;
  const attention_changed_at = resolveAttentionChangedAt({
    oldTrend,
    newTrend: computed.attention_trend,
    previousChangedAt: existing?.attention_changed_at ?? null,
    nowIso: new Date().toISOString(),
  });

  const { error: upErr } = await admin.from("student_progress").upsert(
    {
      student_id: studentId,
      professor_id: professorId,
      overall_score: existing?.overall_score ?? null,
      short_note: existing?.short_note ?? null,
      last_diary_at: existing?.last_diary_at ?? null,
      attention_trend: computed.attention_trend,
      attention_confidence: computed.attention_confidence,
      attention_prev_trend: oldTrend,
      attention_changed_at,
      consecutive_absences: computed.consecutive_absences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );

  if (upErr) {
    console.error("recomputeAttentionTrendForStudent: upsert", upErr);
  }
}
