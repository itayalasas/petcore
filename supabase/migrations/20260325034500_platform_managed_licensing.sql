/*
  # Licenciamiento administrado por plataforma

  1. Gobierno de acceso
    - `platform_admins`: usuarios del propietario de la aplicación que pueden operar billing/licencias
    - `tenant_module_entitlements`: entitlements emitidos manualmente por plataforma por tenant y módulo

  2. Endurecimiento de seguridad
    - Los tenants ya no pueden actualizar suscripciones
    - Los tenants solo consumen el estado efectivo de licencias

  3. Consistencia
    - Se sincroniza `tenants.subscription_*` desde `tenant_subscriptions`
    - `get_tenant_module_licenses` e `is_module_licensed` pasan a resolver entitlements emitidos por plataforma
*/

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'platform_admin' CHECK (role IN ('platform_owner', 'platform_admin', 'billing_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_module_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES module_catalog(module_key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  managed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON platform_admins(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_tenant_id ON tenant_module_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_module_key ON tenant_module_entitlements(module_key);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_module_entitlements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_platform_licensing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platform_admins_updated_at ON platform_admins;
CREATE TRIGGER update_platform_admins_updated_at
  BEFORE UPDATE ON platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_licensing_updated_at();

DROP TRIGGER IF EXISTS update_tenant_module_entitlements_updated_at ON tenant_module_entitlements;
CREATE TRIGGER update_tenant_module_entitlements_updated_at
  BEFORE UPDATE ON tenant_module_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_licensing_updated_at();

CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM platform_admins pa
    WHERE pa.user_id = COALESCE(p_user_id, auth.uid())
      AND pa.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Platform admins can view their own profile" ON platform_admins;
CREATE POLICY "Platform admins can view their own profile"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

DROP POLICY IF EXISTS "No authenticated inserts on platform_admins" ON platform_admins;
CREATE POLICY "No authenticated inserts on platform_admins"
  ON platform_admins FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No authenticated updates on platform_admins" ON platform_admins;
CREATE POLICY "No authenticated updates on platform_admins"
  ON platform_admins FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No authenticated deletes on platform_admins" ON platform_admins;
CREATE POLICY "No authenticated deletes on platform_admins"
  ON platform_admins FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Tenant users can view own module entitlements" ON tenant_module_entitlements;
CREATE POLICY "Tenant users can view own module entitlements"
  ON tenant_module_entitlements FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Platform admins can view all module entitlements" ON tenant_module_entitlements;
CREATE POLICY "Platform admins can view all module entitlements"
  ON tenant_module_entitlements FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can insert module entitlements" ON tenant_module_entitlements;
CREATE POLICY "Platform admins can insert module entitlements"
  ON tenant_module_entitlements FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can update module entitlements" ON tenant_module_entitlements;
CREATE POLICY "Platform admins can update module entitlements"
  ON tenant_module_entitlements FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can delete module entitlements" ON tenant_module_entitlements;
CREATE POLICY "Platform admins can delete module entitlements"
  ON tenant_module_entitlements FOR DELETE
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON tenant_subscriptions;
CREATE POLICY "Platform admins can view all subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant admins can update subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Tenant admins can update subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Tenant admins can update their subscription" ON tenant_subscriptions;

DROP POLICY IF EXISTS "Platform admins can update subscriptions" ON tenant_subscriptions;
CREATE POLICY "Platform admins can update subscriptions"
  ON tenant_subscriptions FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION sync_tenant_subscription_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
BEGIN
  SELECT *
  INTO v_plan
  FROM subscription_plans sp
  WHERE sp.id = NEW.plan_id;

  UPDATE tenants
  SET subscription_status = NEW.status,
      subscription_plan = COALESCE(v_plan.name, subscription_plan),
      trial_ends_at = NEW.trial_ends_at,
      max_users = COALESCE(v_plan.max_users, max_users),
      max_pets = COALESCE(v_plan.max_pets, max_pets),
      updated_at = now()
  WHERE id = NEW.tenant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_tenant_subscription_snapshot_trigger ON tenant_subscriptions;
CREATE TRIGGER sync_tenant_subscription_snapshot_trigger
  AFTER INSERT OR UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_subscription_snapshot();

UPDATE tenants t
SET subscription_status = ts.status,
    subscription_plan = sp.name,
    trial_ends_at = ts.trial_ends_at,
    max_users = sp.max_users,
    max_pets = sp.max_pets,
    updated_at = now()
FROM tenant_subscriptions ts
JOIN subscription_plans sp ON sp.id = ts.plan_id
WHERE t.id = ts.tenant_id;

DO $$
BEGIN
  IF to_regclass('public.tenant_module_licenses') IS NOT NULL THEN
    INSERT INTO tenant_module_entitlements (
      tenant_id,
      module_key,
      is_enabled,
      notes,
      created_at,
      updated_at
    )
    SELECT
      tml.tenant_id,
      tml.module_key,
      tml.is_enabled,
      'Migrado desde tenant_module_licenses',
      tml.created_at,
      tml.updated_at
    FROM tenant_module_licenses tml
    ON CONFLICT (tenant_id, module_key) DO UPDATE
      SET is_enabled = EXCLUDED.is_enabled,
          notes = EXCLUDED.notes,
          updated_at = now();
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS get_tenant_module_licenses(uuid);

CREATE OR REPLACE FUNCTION is_module_licensed(
  p_tenant_id uuid,
  p_module_key text
)
RETURNS boolean AS $$
DECLARE
  v_is_core boolean := false;
  v_subscription_active boolean := false;
  v_plan_enabled boolean := false;
  v_platform_entitlement boolean;
BEGIN
  SELECT mc.is_core
  INTO v_is_core
  FROM module_catalog mc
  WHERE mc.module_key = p_module_key;

  IF COALESCE(v_is_core, false) THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM tenant_subscriptions ts
    WHERE ts.tenant_id = p_tenant_id
      AND (
        ts.status = 'active'
        OR (ts.status = 'trial' AND (ts.trial_ends_at IS NULL OR ts.trial_ends_at > now()))
      )
  )
  INTO v_subscription_active;

  IF NOT v_subscription_active THEN
    RETURN false;
  END IF;

  SELECT tme.is_enabled
  INTO v_platform_entitlement
  FROM tenant_module_entitlements tme
  WHERE tme.tenant_id = p_tenant_id
    AND tme.module_key = p_module_key;

  IF v_platform_entitlement IS NOT NULL THEN
    RETURN v_platform_entitlement;
  END IF;

  SELECT COALESCE(pml.is_enabled, mc.default_enabled)
  INTO v_plan_enabled
  FROM module_catalog mc
  LEFT JOIN tenant_subscriptions ts
    ON ts.tenant_id = p_tenant_id
  LEFT JOIN plan_module_licenses pml
    ON pml.plan_id = ts.plan_id
   AND pml.module_key = mc.module_key
  WHERE mc.module_key = p_module_key
  LIMIT 1;

  RETURN COALESCE(v_plan_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE FUNCTION get_tenant_module_licenses(p_tenant_id uuid)
RETURNS TABLE (
  module_key text,
  display_name text,
  description text,
  category text,
  is_core boolean,
  plan_enabled boolean,
  platform_enabled boolean,
  effective_enabled boolean,
  license_source text,
  sort_order integer
) AS $$
BEGIN
  RETURN QUERY
  WITH subscription_state AS (
    SELECT
      ts.tenant_id,
      ts.plan_id,
      (
        ts.status = 'active'
        OR (ts.status = 'trial' AND (ts.trial_ends_at IS NULL OR ts.trial_ends_at > now()))
      ) AS subscription_active
    FROM tenant_subscriptions ts
    WHERE ts.tenant_id = p_tenant_id
  )
  SELECT
    mc.module_key,
    mc.display_name,
    mc.description,
    mc.category,
    mc.is_core,
    COALESCE(
      CASE WHEN COALESCE(ss.subscription_active, false) THEN pml.is_enabled ELSE false END,
      CASE WHEN COALESCE(ss.subscription_active, false) THEN mc.default_enabled ELSE false END,
      false
    ) AS plan_enabled,
    tme.is_enabled AS platform_enabled,
    CASE
      WHEN mc.is_core THEN true
      WHEN NOT COALESCE(ss.subscription_active, false) THEN false
      WHEN tme.is_enabled IS NOT NULL THEN tme.is_enabled
      ELSE COALESCE(pml.is_enabled, mc.default_enabled, false)
    END AS effective_enabled,
    CASE
      WHEN mc.is_core THEN 'core'
      WHEN tme.is_enabled IS NOT NULL THEN 'platform_entitlement'
      WHEN COALESCE(pml.is_enabled, mc.default_enabled, false) THEN 'plan'
      ELSE 'none'
    END AS license_source,
    mc.sort_order
  FROM module_catalog mc
  LEFT JOIN subscription_state ss
    ON ss.tenant_id = p_tenant_id
  LEFT JOIN plan_module_licenses pml
    ON pml.plan_id = ss.plan_id
   AND pml.module_key = mc.module_key
  LEFT JOIN tenant_module_entitlements tme
    ON tme.tenant_id = p_tenant_id
   AND tme.module_key = mc.module_key
  ORDER BY mc.sort_order, mc.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;