"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
  maxStudentsForPlan,
} from "@/lib/entitlement";

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const classIdRaw = formData.get("class_id");
  const classId =
    classIdRaw && String(classIdRaw) !== ""
      ? String(classIdRaw)
      : null;

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);

  if (classId && !premium) return;

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("professor_id", user.id);

  const max = maxStudentsForPlan(sub);
  if ((count ?? 0) >= max) return;

  const { error } = await supabase.from("students").insert({
    professor_id: user.id,
    name,
    class_id: classId,
  });
  if (error) return;

  revalidatePath("/galeria");
}

export async function updateStudent(
  id: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const classIdRaw = formData.get("class_id");
  const classId =
    classIdRaw && String(classIdRaw) !== ""
      ? String(classIdRaw)
      : null;

  if (!name) return { ok: false as const, error: "Nome obrigatório" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const sub = await getActiveSubscription(supabase, user.id);
  if (classId && !isProfessorPremium(sub)) {
    return { ok: false as const, error: "Turmas apenas no plano Professor" };
  }

  const { error } = await supabase
    .from("students")
    .update({ name, class_id: classId })
    .eq("id", id)
    .eq("professor_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/galeria");
  revalidatePath(`/aluno/${id}`);
  return { ok: true as const };
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("professor_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/galeria");
  return { ok: true as const };
}

export async function deleteStudentForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteStudent(id);
}
