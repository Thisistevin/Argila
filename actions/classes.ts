"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";

export async function assertClassOwnership(
  supabase: SupabaseClient,
  classId: string,
  professorId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("professor_id", professorId)
    .maybeSingle();
  return !!data;
}

export async function createClass(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!isProfessorPremium(sub)) return;

  const { data: newClass, error } = await supabase
    .from("classes")
    .insert({ professor_id: user.id, name })
    .select("id")
    .single();
  if (error || !newClass) return;

  const studentIds = formData.getAll("student_ids").map(String).filter(Boolean);
  if (studentIds.length > 0) {
    await supabase
      .from("students")
      .update({ class_id: newClass.id })
      .in("id", studentIds)
      .eq("professor_id", user.id);
  }

  revalidatePath("/galeria");
  revalidatePath("/diario/novo");
}

export async function deleteClass(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!isProfessorPremium(sub)) return;

  await supabase
    .from("students")
    .update({ class_id: null })
    .eq("class_id", id)
    .eq("professor_id", user.id);

  await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("professor_id", user.id);

  revalidatePath("/galeria");
  revalidatePath("/diario/novo");
}
