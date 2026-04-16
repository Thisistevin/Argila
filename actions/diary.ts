"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import {
  finalizeDiarySummariesWithNames,
  type FinalizeDiarySummariesInput,
} from "@/lib/ai/finalize-diary-summaries";

const rowSchema = z.object({
  studentId: z.string().uuid(),
  absent: z.boolean(),
  note: z.string().max(500).optional(),
  teacherComprehensionRating: z.number().int().min(0).max(5).optional().nullable(),
  teacherAttentionRating: z.number().int().min(0).max(5).optional().nullable(),
  teacherEngagementRating: z.number().int().min(0).max(5).optional().nullable(),
});

const completeSchema = z.object({
  content: z.string().min(1),
  lessonType: z.enum(["theoretical", "practical", "mixed"]),
  aiSummary: z.string().min(1),
  attachment_storage_path: z.string().nullable().optional(),
  attachment_content_type: z.string().nullable().optional(),
  studentIds: z.array(z.string().uuid()),
  classIds: z.array(z.string().uuid()).optional(),
  rows: z.array(rowSchema),
  studentSummaries: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        summary: z.string().min(1),
      })
    )
    .optional(),
});

const finalizeSchema = z.object({
  content: z.string().min(1),
  lessonType: z.enum(["theoretical", "practical", "mixed"]),
  draftSummary: z.string().min(1),
  students: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
  ),
  notesByStudent: z.record(z.string(), z.string()).optional().default({}),
});

export type CompleteDiaryResult =
  | { ok: true; diaryId: string }
  | { ok: false; error: string };

export async function finalizeDiaryStudentSummariesAction(
  raw: unknown
): Promise<
  | { ok: true; summaries: Record<string, string> }
  | { ok: false; error: string }
> {
  const parsed = finalizeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const v = parsed.data;
  if (v.students.length === 0) {
    return { ok: true, summaries: {} };
  }
  const ids = v.students.map((s) => s.id);
  const { data: owned } = await supabase
    .from("students")
    .select("id")
    .eq("professor_id", user.id)
    .in("id", ids);
  if ((owned?.length ?? 0) !== ids.length) {
    return { ok: false, error: "Alunos inválidos" };
  }

  const input: FinalizeDiarySummariesInput = {
    content: v.content,
    lessonType: v.lessonType,
    draftSummary: v.draftSummary,
    students: v.students,
    notesByStudent: v.notesByStudent,
  };
  const summaries = await finalizeDiarySummariesWithNames(input);
  return { ok: true, summaries };
}

function contentSnippetForAbsent(content: string): string {
  const t = content.replace(/\s+/g, " ").trim();
  return t.slice(0, 100) || "esta aula";
}

async function upsertProgressFromDiary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  professorId: string,
  studentId: string,
  comp: number,
  att: number,
  eng: number
): Promise<void> {
  const overall = (comp + att + eng) / 3;
  await supabase.from("student_progress").upsert(
    {
      student_id: studentId,
      professor_id: professorId,
      overall_score: overall,
      last_diary_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );
}

export async function completeDiary(
  raw: z.infer<typeof completeSchema>
): Promise<CompleteDiaryResult> {
  const parsed = completeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);
  const v = parsed.data;

  if (!premium && v.classIds?.length) {
    return { ok: false, error: "Turmas não disponíveis no plano Explorar" };
  }

  if (premium && v.classIds?.length && canManageClasses(sub)) {
    for (const cid of v.classIds) {
      const classOwned = await assertClassOwnership(supabase, cid, user.id);
      if (!classOwned) return { ok: false, error: "Turma inválida" };
    }
  }

  const fromClasses = new Set<string>();
  if (premium && v.classIds?.length && canManageClasses(sub)) {
    for (const cid of v.classIds) {
      const { data: studs } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", cid)
        .eq("professor_id", user.id);
      for (const s of studs ?? []) fromClasses.add(s.id);
    }
  }

  const merged = new Set<string>([...fromClasses, ...v.studentIds]);
  const finalTargetIds = [...merged];

  if (finalTargetIds.length === 0) {
    return { ok: false, error: "Selecione ao menos um aluno" };
  }

  const { data: ownedAll } = await supabase
    .from("students")
    .select("id")
    .eq("professor_id", user.id)
    .in("id", finalTargetIds);
  if ((ownedAll?.length ?? 0) !== finalTargetIds.length) {
    return { ok: false, error: "Alunos inválidos" };
  }

  const rowByStudent = new Map(v.rows.map((r) => [r.studentId, r]));
  for (const sid of finalTargetIds) {
    if (!rowByStudent.has(sid)) {
      return { ok: false, error: "Dados de presença incompletos" };
    }
  }

  const summaryByStudent = new Map(
    (v.studentSummaries ?? []).map((s) => [s.studentId, s.summary])
  );

  const absentSnippet = contentSnippetForAbsent(v.content);

  const { data: diary, error: dErr } = await supabase
    .from("diaries")
    .insert({
      professor_id: user.id,
      content: v.content,
      lesson_type: v.lessonType,
      ai_summary: v.aiSummary,
      attachment_storage_path: v.attachment_storage_path ?? null,
      attachment_content_type: v.attachment_content_type ?? null,
    })
    .select("id")
    .single();

  if (dErr || !diary) {
    return { ok: false, error: dErr?.message ?? "Erro ao salvar diário" };
  }

  const diaryId = diary.id;

  if (premium && v.classIds?.length && canManageClasses(sub)) {
    for (const cid of v.classIds) {
      const { error: dcErr } = await supabase.from("diary_classes").insert({
        diary_id: diaryId,
        class_id: cid,
      });
      if (dcErr) return { ok: false, error: "Erro ao vincular turma" };
    }
  }

  for (const sid of finalTargetIds) {
    const row = rowByStudent.get(sid)!;
    const absent = row.absent;
    let ai_student_summary: string | null = null;
    let comprehension_score: number | null = null;
    let attention_score: number | null = null;
    let engagement_score: number | null = null;
    let teacher_comprehension_rating: number | null = null;
    let teacher_attention_rating: number | null = null;
    let teacher_engagement_rating: number | null = null;
    let assessment_source: string | null = null;

    if (absent) {
      ai_student_summary = `Faltou à aula de ${absentSnippet}.`;
    } else {
      ai_student_summary =
        summaryByStudent.get(sid) ?? v.aiSummary.slice(0, 800);
      const tc = row.teacherComprehensionRating;
      const ta = row.teacherAttentionRating;
      const te = row.teacherEngagementRating;
      if (
        tc !== null &&
        tc !== undefined &&
        ta !== null &&
        ta !== undefined &&
        te !== null &&
        te !== undefined
      ) {
        teacher_comprehension_rating = tc;
        teacher_attention_rating = ta;
        teacher_engagement_rating = te;
        comprehension_score = tc * 2;
        attention_score = ta * 2;
        engagement_score = te * 2;
        assessment_source = "teacher";
      }
    }

    const { error: dsErr } = await supabase.from("diary_students").insert({
      diary_id: diaryId,
      student_id: sid,
      absent,
      note: row.note ?? null,
      ai_student_summary,
      comprehension_score,
      attention_score,
      engagement_score,
      teacher_comprehension_rating,
      teacher_attention_rating,
      teacher_engagement_rating,
      assessment_source,
    });
    if (dsErr) return { ok: false, error: "Erro ao vincular aluno ao diário" };

    if (!absent && assessment_source === "teacher" && comprehension_score !== null) {
      await upsertProgressFromDiary(
        supabase,
        user.id,
        sid,
        comprehension_score,
        attention_score!,
        engagement_score!
      );
    }
  }

  revalidatePath("/diario");
  revalidatePath("/galeria");

  after(async () => {
    const presentRows = finalTargetIds
      .map((id) => rowByStudent.get(id)!)
      .filter((r) => !r.absent);
    const skipAiScoring =
      presentRows.length > 0 &&
      presentRows.every(
        (r) =>
          r.teacherComprehensionRating != null &&
          r.teacherAttentionRating != null &&
          r.teacherEngagementRating != null
      );
    if (!skipAiScoring) {
      await runDiaryScoringJob(diaryId, user.id);
    }
    if (premium) {
      const adminClient = createAdminClient();
      for (const studentId of finalTargetIds) {
        const { data: sJourneys } = await adminClient
          .from("student_journeys")
          .select("journey_id")
          .eq("student_id", studentId);
        for (const sj of sJourneys ?? []) {
          await runJourneySuggestionForStudent(
            studentId,
            user.id,
            sj.journey_id
          );
        }
      }
    }
  });

  return { ok: true, diaryId };
}
