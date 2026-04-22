-- Trial interno TRIAL30, status trial_expired e histórico de downgrade
-- Ver Planos-Cursor/trial-downgrade-professor-v1.md

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'trial_expired', 'past_due', 'canceled'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_coupon_code text,
  ADD COLUMN IF NOT EXISTS downgraded_at timestamptz,
  ADD COLUMN IF NOT EXISTS downgrade_reason text;

ALTER TABLE public.checkout_sessions DROP CONSTRAINT IF EXISTS checkout_sessions_status_check;

ALTER TABLE public.checkout_sessions
  ADD CONSTRAINT checkout_sessions_status_check
  CHECK (status IN (
    'checkout_started',
    'awaiting_payment',
    'paid',
    'trial_started',
    'expired',
    'failed',
    'canceled'
  ));
