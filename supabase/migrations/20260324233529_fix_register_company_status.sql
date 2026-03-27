/*
  # Fix Registration Function Status

  ## Issue
  The register_company function was using 'trialing' status, but the constraint
  only allows: 'trial', 'active', 'suspended', 'cancelled'

  ## Changes
  - Update function to use 'trial' instead of 'trialing'
*/

-- Drop and recreate the function with correct status value
DROP FUNCTION IF EXISTS register_company;

CREATE OR REPLACE FUNCTION register_company(
  p_user_id uuid,
  p_company_name text,
  p_company_slug text,
  p_subscription_plan text,
  p_user_email text,
  p_user_display_name text,
  p_industry text DEFAULT NULL,
  p_company_size text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_trial_ends_at timestamptz;
  v_result json;
BEGIN
  -- Calculate trial end date (30 days from now)
  v_trial_ends_at := now() + interval '30 days';

  -- Insert tenant
  INSERT INTO tenants (
    name,
    slug,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    settings
  ) VALUES (
    p_company_name,
    p_company_slug,
    'trial',
    p_subscription_plan,
    v_trial_ends_at,
    jsonb_build_object(
      'industry', p_industry,
      'company_size', p_company_size
    )
  )
  RETURNING id INTO v_tenant_id;

  -- Insert profile
  INSERT INTO profiles (
    id,
    email,
    display_name,
    is_owner,
    tenant_id
  ) VALUES (
    p_user_id,
    p_user_email,
    p_user_display_name,
    true,
    v_tenant_id
  );

  -- Insert tenant member
  INSERT INTO tenant_members (
    tenant_id,
    user_id,
    role,
    is_active,
    joined_at
  ) VALUES (
    v_tenant_id,
    p_user_id,
    'owner',
    true,
    now()
  );

  -- Insert tenant subscription with correct status 'trial'
  INSERT INTO tenant_subscriptions (
    tenant_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at
  ) VALUES (
    v_tenant_id,
    (SELECT id FROM subscription_plans WHERE name = p_subscription_plan LIMIT 1),
    'trial',
    now(),
    now() + interval '1 month',
    v_trial_ends_at
  );

  -- Build result
  v_result := json_build_object(
    'tenant_id', v_tenant_id,
    'tenant_name', p_company_name,
    'tenant_slug', p_company_slug,
    'subscription_plan', p_subscription_plan,
    'trial_ends_at', v_trial_ends_at
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error registering company: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION register_company TO authenticated;

-- Add comment
COMMENT ON FUNCTION register_company IS 'Registers a new company with tenant, profile, member, and subscription in a single transaction';
