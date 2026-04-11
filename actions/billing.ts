"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Persiste ID de cliente Asaas após POST /v3/customers (integração real no M6). */
export async function linkAsaasCustomer(asaasCustomerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ asaas_customer_id: asaasCustomerId })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/planos");
  return { ok: true as const };
}

/** Persiste ID de cliente Abacatepay após criação na API. */
export async function linkAbacateCustomer(abacateCustomerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ abacate_customer_id: abacateCustomerId })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/planos");
  return { ok: true as const };
}
