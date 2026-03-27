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
    IF v_plan.name = 'basic' THEN
      RAISE EXCEPTION 'El plan % no requiere checkout de pago', v_plan.name;
    END IF;

    RAISE EXCEPTION 'El plan % no tiene un precio configurado para checkout', v_plan.name;
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

NOTIFY pgrst, 'reload schema';