/**
 * Estimativa de custo em centavos de BRL (aproximação; briefing §11).
 * Ajustar multiplicadores conforme tabela de preços Anthropic.
 */
export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const inM = inputTokens / 1_000_000;
  const outM = outputTokens / 1_000_000;
  if (model.includes("haiku")) {
    return Math.round((inM * 25 + outM * 125) * 100) / 100; // USD-like → centavos aproximados
  }
  if (model.includes("sonnet")) {
    return Math.round((inM * 300 + outM * 1500) * 100) / 100;
  }
  return Math.round((inM * 50 + outM * 200) * 100) / 100;
}
