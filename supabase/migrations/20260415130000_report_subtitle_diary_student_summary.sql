-- Relatórios: subtítulo com nome do professor
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS subtitle text;

-- Diário: resumo individual por aluno + avaliação manual (0–5) + origem
ALTER TABLE public.diary_students
  ADD COLUMN IF NOT EXISTS ai_student_summary text,
  ADD COLUMN IF NOT EXISTS teacher_comprehension_rating smallint
    CHECK (teacher_comprehension_rating IS NULL OR teacher_comprehension_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS teacher_attention_rating smallint
    CHECK (teacher_attention_rating IS NULL OR teacher_attention_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS teacher_engagement_rating smallint
    CHECK (teacher_engagement_rating IS NULL OR teacher_engagement_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS assessment_source text
    CHECK (assessment_source IS NULL OR assessment_source IN ('teacher', 'ai', 'hybrid'));

-- Jornadas: auditoria da sugestão IA
ALTER TABLE public.student_journeys
  ADD COLUMN IF NOT EXISTS ai_suggestion_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS ai_suggested_at timestamptz;
