-- Diário dashboard + recomputação determinística de atenção
-- Ver Planos-Cursor/diario-dashboard-atencao-v1.md

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS attention_prev_trend text,
  ADD COLUMN IF NOT EXISTS attention_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_absences smallint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.daily_teacher_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  day date NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('critical_students', 'class_activity')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professor_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_teacher_suggestions_professor_day
  ON public.daily_teacher_suggestions (professor_id, day);

ALTER TABLE public.daily_teacher_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_teacher_suggestions_select_own
  ON public.daily_teacher_suggestions FOR SELECT
  USING (professor_id = auth.uid());

CREATE POLICY daily_teacher_suggestions_insert_own
  ON public.daily_teacher_suggestions FOR INSERT
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY daily_teacher_suggestions_update_own
  ON public.daily_teacher_suggestions FOR UPDATE
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());
