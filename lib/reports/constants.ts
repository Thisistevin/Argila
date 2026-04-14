/** Focos válidos (modo direcionado) — alinhado ao briefing v2 */
export const REPORT_FOCUS_OPTIONS = [
  "Progresso geral",
  "Atenção",
  "Engajamento",
  "Compreensão",
  "Dificuldades recorrentes",
  "Recomendações pedagógicas",
] as const;

export type ReportFocusOption = (typeof REPORT_FOCUS_OPTIONS)[number];
