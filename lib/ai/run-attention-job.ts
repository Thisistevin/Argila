import { recomputeAttentionTrendForStudent } from "@/lib/attention/recompute-attention-trend";

/**
 * Mantido para compatibilidade com chamadas antigas.
 * A regra de atenção é determinística em {@link recomputeAttentionTrendForStudent}.
 */
export async function runAttentionForStudent(
  studentId: string,
  professorId: string
): Promise<void> {
  await recomputeAttentionTrendForStudent(studentId, professorId);
}
