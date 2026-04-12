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

const completeSchema = z.object({
  content: z.string().min(1),
  lessonType: z.enum(["theoretical", "practical", "mixed"]),
  aiSummary: z.string().min(1),
  attachment_storage_path: z.string().nullable().optional(),
  attachment_content_type: z.string().nullable().optional(),
  studentIds: z.array(z.string().uuid()),
  classIds: z.array(z.string().uuid()).optional(),
  rows: z.array(
    z.object({
      studentId: z.string().uuid(),
      absent: z.boolean(),
      note: z.string().max(500).optional(),
    })
  ),
});

export type CompleteDiaryResult =
  | { ok: true; diaryId: string }
  | { ok: false; error: string };

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

  if (v.studentIds.length === 0) {
    return { ok: false, error: "Selecione ao menos um aluno" };
  }

  const { data: owned } = await supabase
    .from("students")
    .select("id")
    .eq("professor_id", user.id)
    .in("id", v.studentIds);
  if ((owned?.length ?? 0) !== v.studentIds.length) {
    return { ok: false, error: "Alunos inválidos" };
  }

  if (!premium && v.classIds?.length) {
    return { ok: false, error: "Turmas não disponíveis no plano Explorar" };
  }

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
      const owned = await assertClassOwnership(supabase, cid, user.id);
      if (!owned) return { ok: false, error: "Turma inválida" };
      await supabase.from("diary_classes").insert({
        diary_id: diaryId,
        class_id: cid,
      });
    }
  }

  for (const row of v.rows) {
    if (!v.studentIds.includes(row.studentId)) continue;
    await supabase.from("diary_students").insert({
      diary_id: diaryId,
      student_id: row.studentId,
      absent: row.absent,
      note: row.note ?? null,
    });
  }

  revalidatePath("/diario");
  revalidatePath("/galeria");

  after(async () => {
    await runDiaryScoringJob(diaryId, user.id);
  });

  return { ok: true, diaryId };
}
