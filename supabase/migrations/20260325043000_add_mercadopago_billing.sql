/*
  # Billing SaaS con Mercado Pago

  1. Nuevas tablas
    - `billing_customers`: snapshot del pagador por tenant
    - `billing_checkout_sessions`: intentos de checkout/preference creados para suscripción
    - `billing_webhook_events`: bitácora idempotente de webhooks recibidos

  2. Funciones helper
    - `create_billing_checkout_session(...)`
    - `apply_mercadopago_payment_result(...)`

  3. Seguridad
    - Plataforma puede ver todo el billing
    - El tenant solo puede ver sus propias sesiones
*/

CREATE TABLE IF NOT EXISTS billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider IN ('mercadopago')),
  provider_customer_id text,
  payer_email text,
  payer_name text,
  payer_document_type text,
  payer_document_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider IN ('mercadopago')),
  external_reference text NOT NULL UNIQUE,
  preference_id text,
  payment_id text,
  merchant_order_id text,
  checkout_url text,
  sandbox_checkout_url text,
  currency_id text NOT NULL DEFAULT 'COP',
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back', 'expired')),
  status_detail text,
  payer_email text,
  created_by uuid,
  expires_at timestamptz,
  paid_at timestamptz,
  last_webhook_at timestamptz,
  raw_preference jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider IN ('mercadopago')),
  event_type text,
  action text,
  external_id text,
  signature text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_type, action, external_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_tenant_id ON billing_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_tenant_id ON billing_checkout_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_status ON billing_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_subscription_id ON billing_checkout_sessions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_provider_external_id ON billing_webhook_events(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_processed ON billing_webhook_events(processed);

ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_billing_customers_updated_at ON billing_customers;
CREATE TRIGGER update_billing_customers_updated_at
  BEFORE UPDATE ON billing_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

DROP TRIGGER IF EXISTS update_billing_checkout_sessions_updated_at ON billing_checkout_sessions;
CREATE TRIGGER update_billing_checkout_sessions_updated_at
  BEFORE UPDATE ON billing_checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

DROP POLICY IF EXISTS "Tenant users can view own billing customers" ON billing_customers;
CREATE POLICY "Tenant users can view own billing customers"
  ON billing_customers FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

DROP POLICY IF EXISTS "Platform admins can view all billing customers" ON billing_customers;
CREATE POLICY "Platform admins can view all billing customers"
  ON billing_customers FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage billing customers" ON billing_customers;
CREATE POLICY "Platform admins can manage billing customers"
  ON billing_customers FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view own billing sessions" ON billing_checkout_sessions;
CREATE POLICY "Tenant users can view own billing sessions"
  ON billing_checkout_sessions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

DROP POLICY IF EXISTS "Platform admins can view all billing sessions" ON billing_checkout_sessions;
CREATE POLICY "Platform admins can view all billing sessions"
  ON billing_checkout_sessions FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage billing sessions" ON billing_checkout_sessions;
CREATE POLICY "Platform admins can manage billing sessions"
  ON billing_checkout_sessions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all webhook events" ON billing_webhook_events;
CREATE POLICY "Platform admins can view all webhook events"
  ON billing_webhook_events FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "No direct authenticated writes to webhook events" ON billing_webhook_events;
CREATE POLICY "No direct authenticated writes to webhook events"
  ON billing_webhook_events FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION create_billing_checkout_session(
  p_tenant_id uuid,
  p_plan_id uuid,
  p_provider text DEFAULT 'mercadopago',
  p_currency_id text DEFAULT 'COP',
  p_payer_email text DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS billing_checkout_sessions AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
  v_subscription tenant_subscriptions%ROWTYPE;
  v_external_reference text;
  v_session billing_checkout_sessions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado';
  END IF;

  IF COALESCE(v_plan.price_monthly, 0) <= 0 THEN
    RAISE EXCEPTION 'El plan % no requiere checkout de pago', v_plan.name;
  END IF;

  SELECT *
  INTO v_subscription
  FROM tenant_subscriptions
  WHERE tenant_id = p_tenant_id
  LIMIT 1;

  v_external_reference := format(
    'tenant:%s:plan:%s:ts:%s',
    p_tenant_id,
    p_plan_id,
    floor(extract(epoch from now()) * 1000)::bigint
  );

  INSERT INTO billing_checkout_sessions (
    tenant_id,
    subscription_id,
    plan_id,
    provider,
    external_reference,
    currency_id,
    amount,
    payer_email,
    created_by,
    status
  ) VALUES (
    p_tenant_id,
    v_subscription.id,
    p_plan_id,
    p_provider,
    v_external_reference,
    p_currency_id,
    v_plan.price_monthly,
    p_payer_email,
    p_created_by,
    'pending'
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION apply_mercadopago_payment_result(
  p_external_reference text,
  p_payment_id text,
  p_merchant_order_id text,
  p_status text,
  p_status_detail text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL,
  p_payment_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS billing_checkout_sessions AS $$
DECLARE
  v_session billing_checkout_sessions%ROWTYPE;
  v_effective_paid_at timestamptz := COALESCE(p_paid_at, now());
BEGIN
  SELECT *
  INTO v_session
  FROM billing_checkout_sessions
  WHERE external_reference = p_external_reference
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session no encontrado para external_reference %', p_external_reference;
  END IF;

  UPDATE billing_checkout_sessions
  SET payment_id = COALESCE(p_payment_id, payment_id),
      merchant_order_id = COALESCE(p_merchant_order_id, merchant_order_id),
      status = p_status,
      status_detail = p_status_detail,
      paid_at = CASE WHEN p_status IN ('approved', 'authorized') THEN v_effective_paid_at ELSE paid_at END,
      last_webhook_at = now(),
      raw_payment = COALESCE(p_payment_payload, '{}'::jsonb),
      updated_at = now()
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  IF p_status IN ('approved', 'authorized') THEN
    UPDATE tenant_subscriptions
    SET plan_id = v_session.plan_id,
        status = 'active',
        trial_ends_at = NULL,
        cancelled_at = NULL,
        current_period_start = v_effective_paid_at,
        current_period_end = v_effective_paid_at + interval '1 month',
        updated_at = now()
    WHERE tenant_id = v_session.tenant_id;
  ELSIF p_status IN ('charged_back', 'refunded') THEN
    UPDATE tenant_subscriptions
    SET status = 'suspended',
        updated_at = now()
    WHERE tenant_id = v_session.tenant_id;
  END IF;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;