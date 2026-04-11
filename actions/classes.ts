"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";

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

  const { error } = await supabase.from("classes").insert({
    professor_id: user.id,
    name,
  });
  if (error) return;
  revalidatePath("/galeria");
  revalidatePath("/diario/novo");
}
