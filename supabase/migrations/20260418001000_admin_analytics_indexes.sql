-- Índices para leituras administrativas / dashboard (P0.2 plano dashboard-admin)
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status_paid_at
  ON public.billing_transactions (status, paid_at);

CREATE INDEX IF NOT EXISTS idx_billing_funnel_events_name_created
  ON public.billing_funnel_events (event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status_period_end
  ON public.subscriptions (plan, status, period_end);

CREATE INDEX IF NOT EXISTS idx_user_activity_days_activity_date
  ON public.user_activity_days (activity_date);
