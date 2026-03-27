CREATE OR REPLACE FUNCTION prevent_manual_paid_plan_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_new_plan subscription_plans%ROWTYPE;
  v_payment_confirmed text := current_setting('app.billing_payment_confirmed', true);
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    SELECT *
    INTO v_new_plan
    FROM subscription_plans
    WHERE id = NEW.plan_id;

    IF FOUND
      AND COALESCE(v_new_plan.price_monthly, 0) > 0
      AND COALESCE(v_payment_confirmed, 'false') <> 'true' THEN
      RAISE EXCEPTION 'El plan % solo puede activarse cuando el pago quede confirmado.', COALESCE(v_new_plan.display_name, v_new_plan.name);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_manual_paid_plan_activation_trigger ON tenant_subscriptions;
CREATE TRIGGER prevent_manual_paid_plan_activation_trigger
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_manual_paid_plan_activation();

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
    PERFORM set_config('app.billing_payment_confirmed', 'true', true);

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

NOTIFY pgrst, 'reload schema';