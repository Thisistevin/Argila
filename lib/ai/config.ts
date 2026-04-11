/** Constantes de IA — PLANO_EXECUCAO_ARGILA.md */

export const MODEL_HAIKU = "claude-haiku-4-5-20251001" as const;
export const MODEL_SONNET = "claude-sonnet-4-5-20251001" as const;

export const PROMPT_DIARY = "diary-v1.0" as const;
export const PROMPT_DIARY_SCORING = "diary-scoring-v1.0" as const;
export const PROMPT_REPORT = "report-v1.0" as const;
export const PROMPT_ATTENTION = "attention-v1.0" as const;

/** Janela máxima de diários para attention-v1.0 */
export const ATTENTION_WINDOW_MAX = 5;
/** Mínimo de diários com scoring para rodar attention job */
export const ATTENTION_MIN_DIARIES = 3;

export const EXPLORE_STUDENT_LIMIT = 5;
export const PROFESSOR_STUDENT_LIMIT = 40;
