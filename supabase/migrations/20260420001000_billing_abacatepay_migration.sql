-- Billing Abacatepay — colunas para o novo provider
-- Mantém colunas asaas_* existentes para compatibilidade com registros históricos.

-- ---------------------------------------------------------------------------
-- checkout_sessions: colunas Abacatepay
-- ---------------------------------------------------------------------------
ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS abacatepay_billing_id text,
  ADD COLUMN IF NOT EXISTS abacatepay_customer_id text;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_abacatepay_billing
  ON public.checkout_sessions (abacatepay_billing_id);

-- ---------------------------------------------------------------------------
-- billing_transactions: colunas Abacatepay
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS abacatepay_billing_id text,
  ADD COLUMN IF NOT EXISTS abacatepay_customer_id text;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_abacatepay_billing
  ON public.billing_transactions (abacatepay_billing_id);

-- profiles.abacate_customer_id já existe desde a migration init.
-- subscriptions.source já aceita 'abacatepay' (coluna text sem constraint).
-- Nenhuma alteração adicional necessária.
