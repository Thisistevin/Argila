"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(data: { name: string; phone: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ name: data.name.trim(), phone: data.phone.trim() || null })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/perfil");
  return { ok: true as const };
}
