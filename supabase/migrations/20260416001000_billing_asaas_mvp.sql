-- Billing Asaas MVP — schema, cupons, checkout, retenção, jurídico, atividade
-- Ver Planos-Cursor/billing-asaas-mvp-detalhado-v1.md (não editar migrations antigas)

-- ---------------------------------------------------------------------------
-- subscriptions: novos estados e colunas
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions SET status = 'canceled' WHERE status = 'cancelled';

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

UPDATE public.subscriptions SET status = 'active'
  WHERE status = 'pending' AND plan IN ('explorar', 'escola');
UPDATE public.subscriptions SET status = 'past_due'
  WHERE status = 'pending' AND plan = 'professor';
UPDATE public.subscriptions SET status = 'active' WHERE status = 'pending';

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_payment_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb;

-- ---------------------------------------------------------------------------
-- profiles: exclusão de conta
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'pending_deletion')),
  ADD COLUMN IF NOT EXISTS account_deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deletion_scheduled_for timestamptz;

-- ---------------------------------------------------------------------------
-- checkout_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('professor')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  entrypoint text NOT NULL CHECK (entrypoint IN ('studio_plans', 'landing_pricing_professor', 'landing_cta')),
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'card')),
  status text NOT NULL CHECK (status IN ('checkout_started', 'awaiting_payment', 'paid', 'expired', 'failed', 'canceled')),
  base_amount_cents integer NOT NULL,
  final_amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  coupon_code text,
  promotion_source text CHECK (promotion_source IN ('coupon', 'landing_trial')),
  discount_percent integer,
  extra_trial_days integer,
  trial_days_applied integer NOT NULL DEFAULT 0,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_payment_id text,
  provider_payload jsonb,
  checkout_payload jsonb,
  awaiting_payment_until timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_professor ON public.checkout_sessions (professor_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_asaas_payment ON public.checkout_sessions (asaas_payment_id);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY checkout_sessions_select_own ON public.checkout_sessions
  FOR SELECT USING (professor_id = auth.uid());
CREATE POLICY checkout_sessions_insert_own ON public.checkout_sessions
  FOR INSERT WITH CHECK (professor_id = auth.uid());
CREATE POLICY checkout_sessions_update_own ON public.checkout_sessions
  FOR UPDATE USING (professor_id = auth.uid()) WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- billing_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  payment_method text CHECK (payment_method IN ('pix', 'card')),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'failed', 'refunded', 'canceled')),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  coupon_code text,
  promotion_source text,
  customer_name text,
  customer_country text,
  customer_state text,
  paid_at timestamptz,
  due_at timestamptz,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_payment_id text,
  provider_event text,
  provider_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_professor ON public.billing_transactions (professor_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_checkout ON public.billing_transactions (checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_asaas_payment ON public.billing_transactions (asaas_payment_id);

ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_transactions_select_own ON public.billing_transactions
  FOR SELECT USING (professor_id = auth.uid());
CREATE POLICY billing_transactions_insert_own ON public.billing_transactions
  FOR INSERT WITH CHECK (professor_id = auth.uid());
CREATE POLICY billing_transactions_update_own ON public.billing_transactions
  FOR UPDATE USING (professor_id = auth.uid()) WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- billing_funnel_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  entrypoint text,
  billing_cycle text,
  payment_method text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_funnel_professor ON public.billing_funnel_events (professor_id);

ALTER TABLE public.billing_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_funnel_events_select_own ON public.billing_funnel_events
  FOR SELECT USING (professor_id = auth.uid());
CREATE POLICY billing_funnel_events_insert_own ON public.billing_funnel_events
  FOR INSERT WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- coupons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'expired')),
  benefit_type text NOT NULL CHECK (benefit_type IN ('percent_discount', 'trial_days')),
  benefit_value integer NOT NULL,
  allowed_cycles text[] NOT NULL DEFAULT ARRAY['monthly', 'annual']::text[],
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  redemptions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- sem policy SELECT para usuário final — leitura via service role / server

-- ---------------------------------------------------------------------------
-- coupon_redemptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  code_snapshot text NOT NULL,
  benefit_type_snapshot text NOT NULL,
  benefit_value_snapshot integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_professor ON public.coupon_redemptions (professor_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_redemptions_select_own ON public.coupon_redemptions
  FOR SELECT USING (professor_id = auth.uid());
CREATE POLICY coupon_redemptions_insert_own ON public.coupon_redemptions
  FOR INSERT WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- legal_acceptances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acceptance_kind text NOT NULL CHECK (acceptance_kind IN ('signup', 'first_acceptance')),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_professor ON public.legal_acceptances (professor_id);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_acceptances_select_own ON public.legal_acceptances
  FOR SELECT USING (professor_id = auth.uid());
CREATE POLICY legal_acceptances_insert_own ON public.legal_acceptances
  FOR INSERT WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- retention_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retention_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('premium_cleanup', 'account_delete')),
  status text NOT NULL CHECK (status IN ('scheduled', 'processing', 'done', 'failed')),
  run_after timestamptz NOT NULL,
  reason text,
  metadata jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_jobs_run ON public.retention_jobs (status, run_after);

ALTER TABLE public.retention_jobs ENABLE ROW LEVEL SECURITY;
-- sem policies para usuário — só service role

-- ---------------------------------------------------------------------------
-- user_activity_days
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_activity_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professor_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_professor ON public.user_activity_days (professor_id);

ALTER TABLE public.user_activity_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_activity_days_insert_own ON public.user_activity_days
  FOR INSERT WITH CHECK (professor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value)
VALUES
  ('landing_professor_trial', '{"enabled": true, "trialDays": 14}'::jsonb),
  ('legal_current_versions', '{"terms": "v1", "privacy": "v1"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- cupons MVP (códigos em maiúsculas para match simples no app)
INSERT INTO public.coupons (code, status, benefit_type, benefit_value)
VALUES
  ('ARGILA20', 'active', 'percent_discount', 20),
  ('TRIAL30', 'active', 'trial_days', 30)
ON CONFLICT (code) DO NOTHING;
