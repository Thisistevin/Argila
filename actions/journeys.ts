"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  canUseJourneys,
  getActiveSubscription,
} from "@/lib/entitlement";

export async function assertJourneyOwnership(
  supabase: SupabaseClient,
  journeyId: string,
  professorId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journeyId)
    .eq("professor_id", professorId)
    .maybeSingle();
  return !!data;
}

async function assertStudentOwnership(
  supabase: SupabaseClient,
  studentId: string,
  professorId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("professor_id", professorId)
    .maybeSingle();
  return !!data;
}

export async function createJourney(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const milestonesRaw = String(formData.get("milestones") ?? "[]");

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  let initial: { name: string }[];
  try {
    initial = JSON.parse(milestonesRaw) as { name: string }[];
  } catch {
    return;
  }
  const names = initial
    .map((m) => String(m.name ?? "").trim())
    .filter(Boolean);
  if (names.length === 0) return;

  const { data: journey, error: jErr } = await supabase
    .from("journeys")
    .insert({
      professor_id: user.id,
      name,
      description,
    })
    .select("id")
    .single();
  if (jErr || !journey) return;

  const rows = names.map((n, i) => ({
    journey_id: journey.id,
    name: n,
    position: (i + 1) * 10,
  }));
  const { error: mErr } = await supabase.from("milestones").insert(rows);
  if (mErr) {
    await supabase.from("journeys").delete().eq("id", journey.id);
    return;
  }

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
}

export async function updateJourney(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = formData.get("description");
  const description =
    descriptionRaw === null || descriptionRaw === undefined
      ? undefined
      : String(descriptionRaw).trim() || null;

  if (!id || !name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const owned = await assertJourneyOwnership(supabase, id, user.id);
  if (!owned) return;

  const { error } = await supabase
    .from("journeys")
    .update({
      name,
      ...(description !== undefined ? { description } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("professor_id", user.id);
  if (error) return;

  revalidatePath("/jornadas");
}

export async function deleteJourney(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const owned = await assertJourneyOwnership(supabase, id, user.id);
  if (!owned) return;

  const { error } = await supabase.from("journeys").delete().eq("id", id);
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
}

export async function addMilestone(formData: FormData) {
  const journey_id = String(formData.get("journey_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!journey_id || !name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const owned = await assertJourneyOwnership(supabase, journey_id, user.id);
  if (!owned) return;

  const { data: maxRow } = await supabase
    .from("milestones")
    .select("position")
    .eq("journey_id", journey_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (maxRow?.position ?? 0) + 10;

  const { error } = await supabase.from("milestones").insert({
    journey_id,
    name,
    description,
    position: nextPos,
  });
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
}

export async function updateMilestone(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const nameRaw = formData.get("name");
  const descRaw = formData.get("description");
  const posRaw = formData.get("position");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const { data: ms } = await supabase
    .from("milestones")
    .select("id, journey_id")
    .eq("id", id)
    .maybeSingle();
  if (!ms) return;

  const owned = await assertJourneyOwnership(supabase, ms.journey_id, user.id);
  if (!owned) return;

  const patch: Record<string, unknown> = {};
  if (nameRaw !== null && nameRaw !== undefined) {
    const n = String(nameRaw).trim();
    if (n) patch.name = n;
  }
  if (descRaw !== null && descRaw !== undefined) {
    patch.description = String(descRaw).trim() || null;
  }
  if (posRaw !== null && posRaw !== undefined && String(posRaw) !== "") {
    const p = parseInt(String(posRaw), 10);
    if (!Number.isNaN(p)) patch.position = p;
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("milestones").update(patch).eq("id", id);
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
}

export async function deleteMilestone(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const { data: ms } = await supabase
    .from("milestones")
    .select("id, journey_id")
    .eq("id", id)
    .maybeSingle();
  if (!ms) return;

  const owned = await assertJourneyOwnership(supabase, ms.journey_id, user.id);
  if (!owned) return;

  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
}

export async function assignJourneyToStudent(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "").trim();
  const journey_id = String(formData.get("journey_id") ?? "").trim();
  if (!student_id || !journey_id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const jOk = await assertJourneyOwnership(supabase, journey_id, user.id);
  const sOk = await assertStudentOwnership(supabase, student_id, user.id);
  if (!jOk || !sOk) return;

  const { error } = await supabase.from("student_journeys").upsert(
    {
      student_id,
      journey_id,
      current_milestone_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,journey_id" }
  );
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
  revalidatePath(`/aluno/${student_id}`);
}

export async function setStudentMilestone(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "").trim();
  const journey_id = String(formData.get("journey_id") ?? "").trim();
  const milestone_id = String(formData.get("milestone_id") ?? "").trim();

  if (!student_id || !journey_id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const jOk = await assertJourneyOwnership(supabase, journey_id, user.id);
  const sOk = await assertStudentOwnership(supabase, student_id, user.id);
  if (!jOk || !sOk) return;

  let current_milestone_id: string | null = null;
  if (milestone_id) {
    const { data: ms } = await supabase
      .from("milestones")
      .select("id")
      .eq("id", milestone_id)
      .eq("journey_id", journey_id)
      .maybeSingle();
    if (!ms) return;
    current_milestone_id = ms.id;
  }

  const { error } = await supabase
    .from("student_journeys")
    .update({
      current_milestone_id,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", student_id)
    .eq("journey_id", journey_id);
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
  revalidatePath(`/aluno/${student_id}`);
}

export async function acceptAiSuggestion(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "").trim();
  const journey_id = String(formData.get("journey_id") ?? "").trim();
  if (!student_id || !journey_id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await getActiveSubscription(supabase, user.id);
  if (!canUseJourneys(sub)) return;

  const jOk = await assertJourneyOwnership(supabase, journey_id, user.id);
  const sOk = await assertStudentOwnership(supabase, student_id, user.id);
  if (!jOk || !sOk) return;

  const { data: row } = await supabase
    .from("student_journeys")
    .select("ai_suggested_milestone_id")
    .eq("student_id", student_id)
    .eq("journey_id", journey_id)
    .maybeSingle();

  const suggested = row?.ai_suggested_milestone_id;
  if (!suggested) return;

  const { data: ms } = await supabase
    .from("milestones")
    .select("id")
    .eq("id", suggested)
    .eq("journey_id", journey_id)
    .maybeSingle();
  if (!ms) return;

  const { error } = await supabase
    .from("student_journeys")
    .update({
      current_milestone_id: suggested,
      ai_suggested_milestone_id: null,
      ai_suggestion_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", student_id)
    .eq("journey_id", journey_id);
  if (error) return;

  revalidatePath("/jornadas");
  revalidatePath("/galeria");
  revalidatePath(`/aluno/${student_id}`);
}
