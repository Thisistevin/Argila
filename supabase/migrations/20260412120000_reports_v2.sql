-- Relatórios IA v2: rascunho, geração, publicação com share_token
-- Ver Planos-Cursor/relatorios-ia-v2.md

ALTER TABLE public.reports ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('generating', 'ready', 'published', 'failed')),
  ADD COLUMN IF NOT EXISTS generation_mode text
    CHECK (generation_mode IS NULL OR generation_mode IN ('automatic', 'directed')),
  ADD COLUMN IF NOT EXISTS generation_focus text,
  ADD COLUMN IF NOT EXISTS teacher_guidance text,
  ADD COLUMN IF NOT EXISTS source_job_id uuid REFERENCES public.ai_jobs (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
