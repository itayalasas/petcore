/*
  # Licenciamiento modular por tenant

  1. Nuevas tablas
    - `module_catalog`: catálogo central de módulos disponibles en la aplicación
    - `plan_module_licenses`: módulos incluidos por defecto en cada plan
    - `tenant_module_licenses`: activaciones/desactivaciones específicas por tenant

  2. Funciones helper
    - `is_module_licensed(tenant_id, module_key)`
    - `get_tenant_module_licenses(tenant_id)`

  3. Seguridad
    - Solo admins/owners del tenant pueden administrar overrides de licencias
*/

CREATE TABLE IF NOT EXISTS module_catalog (
  module_key text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  is_core boolean NOT NULL DEFAULT false,
  default_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_module_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES module_catalog(module_key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, module_key)
);

CREATE TABLE IF NOT EXISTS tenant_module_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES module_catalog(module_key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_module_licenses_plan_id ON plan_module_licenses(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_licenses_module_key ON plan_module_licenses(module_key);
CREATE INDEX IF NOT EXISTS idx_tenant_module_licenses_tenant_id ON tenant_module_licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_licenses_module_key ON tenant_module_licenses(module_key);

ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_module_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_module_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view module catalog" ON module_catalog;
CREATE POLICY "Authenticated users can view module catalog"
  ON module_catalog FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view plan module licenses" ON plan_module_licenses;
CREATE POLICY "Authenticated users can view plan module licenses"
  ON plan_module_licenses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tenant users can view own module licenses" ON tenant_module_licenses;
CREATE POLICY "Tenant users can view own module licenses"
  ON tenant_module_licenses FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenant admins can insert module licenses" ON tenant_module_licenses;
CREATE POLICY "Tenant admins can insert module licenses"
  ON tenant_module_licenses FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenant admins can update module licenses" ON tenant_module_licenses;
CREATE POLICY "Tenant admins can update module licenses"
  ON tenant_module_licenses FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenant admins can delete module licenses" ON tenant_module_licenses;
CREATE POLICY "Tenant admins can delete module licenses"
  ON tenant_module_licenses FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id
      FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION update_module_licensing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_module_catalog_updated_at ON module_catalog;
CREATE TRIGGER update_module_catalog_updated_at
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_module_licensing_updated_at();

DROP TRIGGER IF EXISTS update_plan_module_licenses_updated_at ON plan_module_licenses;
CREATE TRIGGER update_plan_module_licenses_updated_at
  BEFORE UPDATE ON plan_module_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_module_licensing_updated_at();

DROP TRIGGER IF EXISTS update_tenant_module_licenses_updated_at ON tenant_module_licenses;
CREATE TRIGGER update_tenant_module_licenses_updated_at
  BEFORE UPDATE ON tenant_module_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_module_licensing_updated_at();

INSERT INTO module_catalog (module_key, display_name, description, category, is_core, default_enabled, sort_order)
VALUES
  ('dashboard', 'Inicio', 'Panel principal y resumen operativo', 'Core', true, true, 10),
  ('mascotas', 'Mascotas', 'Gestión de mascotas y ficha general', 'Operación diaria', false, true, 20),
  ('duenos', 'Dueños', 'Gestión de propietarios y contactos', 'Operación diaria', false, true, 30),
  ('salud', 'Consultas', 'Expediente médico y consultas clínicas', 'Operación diaria', false, true, 40),
  ('agenda', 'Agenda', 'Citas, reservas y atención por horario', 'Operación diaria', false, true, 50),
  ('pos', 'Punto de Venta', 'Facturación y cobro de consultas o productos', 'Operación diaria', false, true, 60),
  ('ordenes', 'Órdenes', 'Órdenes y seguimiento operativo', 'Operación diaria', false, false, 70),
  ('comercio', 'Comercio', 'Catálogo, productos e inventario', 'Negocio', false, false, 80),
  ('pagos', 'Pagos y finanzas', 'Pagos, transacciones y finanzas', 'Negocio', false, true, 90),
  ('aliados', 'Aliados', 'Gestión de aliados y socios comerciales', 'Negocio', false, false, 100),
  ('clientes', 'Clientes', 'CRM y gestión de clientes', 'Negocio', false, false, 110),
  ('reportes', 'Reportes', 'Reportes operativos y ejecutivos', 'Escalamiento', false, false, 120),
  ('marketing', 'Marketing y CRM', 'Campañas y automatización comercial', 'Escalamiento', false, false, 130),
  ('logistica', 'Logística', 'Rutas, entregas y distribución', 'Escalamiento', false, false, 140),
  ('administracion', 'Administración', 'Usuarios, roles y gobierno del tenant', 'Core', true, true, 150),
  ('configuracion', 'Configuración', 'Parámetros del tenant y del sistema', 'Core', true, true, 160),
  ('api', 'API Docs', 'Documentación e integraciones API', 'Plataforma', false, false, 170)
ON CONFLICT (module_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_core = EXCLUDED.is_core,
  default_enabled = EXCLUDED.default_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO plan_module_licenses (plan_id, module_key, is_enabled)
SELECT sp.id, module_key, true
FROM subscription_plans sp
JOIN (VALUES
  ('basic', 'mascotas'),
  ('basic', 'duenos'),
  ('basic', 'salud'),
  ('basic', 'agenda'),
  ('basic', 'pos'),
  ('basic', 'pagos'),
  ('professional', 'mascotas'),
  ('professional', 'duenos'),
  ('professional', 'salud'),
  ('professional', 'agenda'),
  ('professional', 'pos'),
  ('professional', 'pagos'),
  ('professional', 'ordenes'),
  ('professional', 'comercio'),
  ('professional', 'aliados'),
  ('professional', 'clientes'),
  ('professional', 'reportes'),
  ('professional', 'api'),
  ('enterprise', 'mascotas'),
  ('enterprise', 'duenos'),
  ('enterprise', 'salud'),
  ('enterprise', 'agenda'),
  ('enterprise', 'pos'),
  ('enterprise', 'pagos'),
  ('enterprise', 'ordenes'),
  ('enterprise', 'comercio'),
  ('enterprise', 'aliados'),
  ('enterprise', 'clientes'),
  ('enterprise', 'reportes'),
  ('enterprise', 'marketing'),
  ('enterprise', 'logistica'),
  ('enterprise', 'api')
) AS plan_modules(plan_name, module_key)
  ON plan_modules.plan_name = sp.name
ON CONFLICT (plan_id, module_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();

CREATE OR REPLACE FUNCTION is_module_licensed(
  p_tenant_id uuid,
  p_module_key text
)
RETURNS boolean AS $$
DECLARE
  v_is_core boolean := false;
  v_subscription_active boolean := false;
  v_plan_enabled boolean := false;
  v_tenant_override boolean;
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

  SELECT tml.is_enabled
  INTO v_tenant_override
  FROM tenant_module_licenses tml
  WHERE tml.tenant_id = p_tenant_id
    AND tml.module_key = p_module_key;

  IF v_tenant_override IS NOT NULL THEN
    RETURN v_tenant_override;
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

CREATE OR REPLACE FUNCTION get_tenant_module_licenses(p_tenant_id uuid)
RETURNS TABLE (
  module_key text,
  display_name text,
  description text,
  category text,
  is_core boolean,
  plan_enabled boolean,
  tenant_enabled boolean,
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
    tml.is_enabled AS tenant_enabled,
    CASE
      WHEN mc.is_core THEN true
      WHEN NOT COALESCE(ss.subscription_active, false) THEN false
      WHEN tml.is_enabled IS NOT NULL THEN tml.is_enabled
      ELSE COALESCE(pml.is_enabled, mc.default_enabled, false)
    END AS effective_enabled,
    CASE
      WHEN mc.is_core THEN 'core'
      WHEN tml.is_enabled IS NOT NULL THEN 'tenant_override'
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
  LEFT JOIN tenant_module_licenses tml
    ON tml.tenant_id = p_tenant_id
   AND tml.module_key = mc.module_key
  ORDER BY mc.sort_order, mc.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;