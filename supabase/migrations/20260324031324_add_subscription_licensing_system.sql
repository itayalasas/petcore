/*
  # Subscription and Licensing System

  ## Overview
  This migration implements a complete multi-tenant subscription and licensing system with three tiers:
  - Basic (Free trial): 5 users, 100 pets, basic features
  - Professional ($49/mo): 50 users, 1000 pets, all features
  - Enterprise (Custom): Unlimited users/pets, premium features

  ## New Tables

  ### `subscription_plans`
  Defines available subscription plans with their limits and features
  - `id` (uuid, primary key)
  - `name` (text) - Plan name (basic, professional, enterprise)
  - `display_name` (text) - Display name for UI
  - `price_monthly` (numeric) - Monthly price in USD
  - `max_users` (integer) - Maximum allowed users (-1 for unlimited)
  - `max_pets` (integer) - Maximum allowed pets (-1 for unlimited)
  - `features` (jsonb) - Feature flags and capabilities
  - `is_active` (boolean) - Whether plan is available for selection
  - `trial_days` (integer) - Trial period duration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `tenant_subscriptions`
  Links tenants to their active subscription plans
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `plan_id` (uuid, foreign key to subscription_plans)
  - `status` (text) - active, trial, suspended, cancelled
  - `trial_ends_at` (timestamptz) - Trial expiration date
  - `current_period_start` (timestamptz) - Current billing period start
  - `current_period_end` (timestamptz) - Current billing period end
  - `cancelled_at` (timestamptz) - Cancellation date
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Users can only view their own tenant's subscription
  - Only tenant admins can modify subscriptions

  ## Initial Data
  Seeds the three standard plans with their configurations
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT -1,
  max_pets integer NOT NULL DEFAULT -1,
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  trial_days integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_subscriptions table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
-- Anyone can view active plans (for plan selection)
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only service role can modify plans
CREATE POLICY "Only service role can insert plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only service role can update plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Only service role can delete plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (false);

-- RLS Policies for tenant_subscriptions
-- Users can view their own tenant's subscription
CREATE POLICY "Users can view own tenant subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Tenant admins can update their subscription
CREATE POLICY "Tenant admins can update subscription"
  ON tenant_subscriptions FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- New tenant subscriptions can be created during registration
CREATE POLICY "Service can create subscriptions"
  ON tenant_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_tenant_subscriptions_updated_at ON tenant_subscriptions;
CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Seed subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, max_users, max_pets, trial_days, features)
VALUES 
  (
    'basic',
    'Basic',
    'Gratis - 30 días de prueba',
    0,
    5,
    100,
    30,
    '{
      "has_basic_features": true,
      "has_email_support": true,
      "has_basic_reports": true,
      "has_advanced_reports": false,
      "has_api_integrations": false,
      "has_priority_support": false,
      "has_branding": false,
      "has_24_7_support": false,
      "has_advanced_analytics": false,
      "has_dedicated_consulting": false,
      "has_sla": false,
      "has_custom_domain": false
    }'::jsonb
  ),
  (
    'professional',
    'Professional',
    'Más popular - $49/mes',
    49.00,
    50,
    1000,
    30,
    '{
      "has_basic_features": true,
      "has_all_features": true,
      "has_email_support": true,
      "has_priority_support": true,
      "has_basic_reports": true,
      "has_advanced_reports": true,
      "has_api_integrations": true,
      "has_branding": true,
      "has_24_7_support": false,
      "has_advanced_analytics": false,
      "has_dedicated_consulting": false,
      "has_sla": false,
      "has_custom_domain": false
    }'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'Personalizado - Contactar ventas',
    0,
    -1,
    -1,
    0,
    '{
      "has_basic_features": true,
      "has_all_features": true,
      "has_premium_features": true,
      "has_email_support": true,
      "has_priority_support": true,
      "has_24_7_support": true,
      "has_basic_reports": true,
      "has_advanced_reports": true,
      "has_advanced_analytics": true,
      "has_api_integrations": true,
      "has_branding": true,
      "has_dedicated_consulting": true,
      "has_sla": true,
      "has_custom_domain": true
    }'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
  p_tenant_id uuid,
  p_limit_type text,
  p_current_count integer
)
RETURNS boolean AS $$
DECLARE
  v_max_limit integer;
  v_plan_limit integer;
BEGIN
  -- Get the plan limit for this tenant
  SELECT 
    CASE 
      WHEN p_limit_type = 'users' THEN sp.max_users
      WHEN p_limit_type = 'pets' THEN sp.max_pets
      ELSE -1
    END INTO v_plan_limit
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON ts.plan_id = sp.id
  WHERE ts.tenant_id = p_tenant_id
    AND ts.status IN ('trial', 'active');

  -- If no subscription found or limit is -1 (unlimited), allow
  IF v_plan_limit IS NULL OR v_plan_limit = -1 THEN
    RETURN true;
  END IF;

  -- Check if current count exceeds limit
  RETURN p_current_count < v_plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant subscription info
CREATE OR REPLACE FUNCTION get_tenant_subscription(p_tenant_id uuid)
RETURNS TABLE (
  plan_name text,
  plan_display_name text,
  status text,
  max_users integer,
  max_pets integer,
  features jsonb,
  trial_ends_at timestamptz,
  is_trial boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.display_name,
    ts.status,
    sp.max_users,
    sp.max_pets,
    sp.features,
    ts.trial_ends_at,
    (ts.status = 'trial' AND ts.trial_ends_at > now()) as is_trial
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON ts.plan_id = sp.id
  WHERE ts.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;