/*
  # Sistema de Roles y Permisos Granular

  ## Nuevas Tablas
  
  ### 1. `roles`
  - Roles por tenant con permisos personalizables
  
  ### 2. `permissions`
  - Catálogo global de permisos del sistema
  
  ### 3. `role_permissions`
  - Relación muchos a muchos entre roles y permisos

  ### 4. Actualización de `profiles`
  - Agregar role_id para asignar rol a usuarios

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo administradores pueden gestionar roles y permisos
*/

-- Crear función helper get_user_tenant si no existe
CREATE OR REPLACE FUNCTION get_user_tenant(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN v_tenant_id;
END;
$$;

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Crear tabla de permisos (global, no por tenant)
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  resource text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action, resource)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Crear tabla de relación role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Agregar role_id a profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role_id uuid REFERENCES roles(id) ON DELETE SET NULL;
    CREATE INDEX idx_profiles_role ON profiles(role_id);
  END IF;
END $$;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);

-- Insertar permisos del sistema (catálogo completo)
INSERT INTO permissions (module, action, resource, description) VALUES
  -- Dashboard
  ('dashboard', 'view', 'main', 'Ver dashboard principal'),
  ('dashboard', 'view', 'analytics', 'Ver análisis y estadísticas'),
  
  -- Mascotas (CORE)
  ('mascotas', 'view', 'list', 'Ver lista de mascotas'),
  ('mascotas', 'view', 'details', 'Ver detalles de mascota'),
  ('mascotas', 'create', 'new', 'Crear nueva mascota'),
  ('mascotas', 'edit', 'info', 'Editar información de mascota'),
  ('mascotas', 'delete', 'record', 'Eliminar mascota'),
  ('mascotas', 'view', 'history', 'Ver historial médico'),
  
  -- Dueños
  ('duenos', 'view', 'list', 'Ver lista de dueños'),
  ('duenos', 'view', 'details', 'Ver detalles de dueño'),
  ('duenos', 'create', 'new', 'Crear nuevo dueño'),
  ('duenos', 'edit', 'info', 'Editar información de dueño'),
  ('duenos', 'delete', 'record', 'Eliminar dueño'),
  
  -- Salud / Consultas
  ('salud', 'view', 'consultations', 'Ver consultas médicas'),
  ('salud', 'create', 'consultation', 'Crear consulta médica'),
  ('salud', 'edit', 'consultation', 'Editar consulta médica'),
  ('salud', 'view', 'medical-records', 'Ver expediente médico'),
  ('salud', 'create', 'prescription', 'Crear recetas médicas'),
  ('salud', 'view', 'vaccinations', 'Ver vacunaciones'),
  
  -- Agenda
  ('agenda', 'view', 'calendar', 'Ver agenda y calendario'),
  ('agenda', 'create', 'appointment', 'Crear cita'),
  ('agenda', 'edit', 'appointment', 'Editar cita'),
  ('agenda', 'delete', 'appointment', 'Cancelar cita'),
  ('agenda', 'view', 'availability', 'Ver disponibilidad'),
  
  -- Servicios
  ('servicios', 'view', 'list', 'Ver lista de servicios'),
  ('servicios', 'create', 'new', 'Crear nuevo servicio'),
  ('servicios', 'edit', 'info', 'Editar servicio'),
  ('servicios', 'delete', 'record', 'Eliminar servicio'),
  ('servicios', 'view', 'pricing', 'Ver precios'),
  
  -- Órdenes
  ('ordenes', 'view', 'list', 'Ver lista de órdenes'),
  ('ordenes', 'create', 'new', 'Crear nueva orden'),
  ('ordenes', 'edit', 'status', 'Cambiar estado de orden'),
  ('ordenes', 'view', 'details', 'Ver detalles de orden'),
  
  -- Comercio (NEGOCIO)
  ('comercio', 'view', 'products', 'Ver productos'),
  ('comercio', 'create', 'product', 'Crear producto'),
  ('comercio', 'edit', 'product', 'Editar producto'),
  ('comercio', 'delete', 'product', 'Eliminar producto'),
  ('comercio', 'view', 'inventory', 'Ver inventario'),
  ('comercio', 'edit', 'inventory', 'Ajustar inventario'),
  ('comercio', 'view', 'categories', 'Ver categorías'),
  
  -- POS (Punto de Venta)
  ('pos', 'view', 'interface', 'Ver interfaz de POS'),
  ('pos', 'create', 'sale', 'Procesar ventas'),
  ('pos', 'view', 'sales-history', 'Ver historial de ventas'),
  ('pos', 'create', 'refund', 'Procesar devoluciones'),
  ('pos', 'view', 'cash-register', 'Ver caja registradora'),
  
  -- Pagos y Finanzas
  ('pagos', 'view', 'transactions', 'Ver transacciones'),
  ('pagos', 'create', 'payment', 'Registrar pago'),
  ('pagos', 'view', 'pending', 'Ver pagos pendientes'),
  ('pagos', 'view', 'reports', 'Ver reportes financieros'),
  ('pagos', 'edit', 'invoice', 'Editar facturas'),
  
  -- Aliados
  ('aliados', 'view', 'list', 'Ver lista de aliados'),
  ('aliados', 'create', 'new', 'Crear nuevo aliado'),
  ('aliados', 'edit', 'info', 'Editar aliado'),
  ('aliados', 'view', 'performance', 'Ver rendimiento de aliados'),
  
  -- Clientes
  ('clientes', 'view', 'list', 'Ver lista de clientes'),
  ('clientes', 'view', 'details', 'Ver detalles de cliente'),
  ('clientes', 'edit', 'info', 'Editar información de cliente'),
  ('clientes', 'view', 'history', 'Ver historial de cliente'),
  
  -- Logística (ESCALAMIENTO)
  ('logistica', 'view', 'routes', 'Ver rutas de entrega'),
  ('logistica', 'create', 'route', 'Crear ruta'),
  ('logistica', 'edit', 'route', 'Editar ruta'),
  ('logistica', 'view', 'drivers', 'Ver repartidores'),
  ('logistica', 'view', 'tracking', 'Ver seguimiento de entregas'),
  
  -- Marketing y CRM
  ('marketing', 'view', 'campaigns', 'Ver campañas'),
  ('marketing', 'create', 'campaign', 'Crear campaña'),
  ('marketing', 'view', 'analytics', 'Ver análisis de marketing'),
  ('marketing', 'view', 'customers', 'Ver base de clientes'),
  ('marketing', 'create', 'email', 'Enviar emails'),
  
  -- Reportes
  ('reportes', 'view', 'sales', 'Ver reportes de ventas'),
  ('reportes', 'view', 'financial', 'Ver reportes financieros'),
  ('reportes', 'view', 'inventory', 'Ver reportes de inventario'),
  ('reportes', 'view', 'appointments', 'Ver reportes de citas'),
  ('reportes', 'view', 'performance', 'Ver reportes de rendimiento'),
  ('reportes', 'export', 'data', 'Exportar datos'),
  
  -- Administración (PLATAFORMA)
  ('administracion', 'view', 'users', 'Ver usuarios'),
  ('administracion', 'create', 'user', 'Crear usuario'),
  ('administracion', 'edit', 'user', 'Editar usuario'),
  ('administracion', 'delete', 'user', 'Eliminar usuario'),
  ('administracion', 'view', 'roles', 'Ver roles y permisos'),
  ('administracion', 'edit', 'roles', 'Editar roles y permisos'),
  ('administracion', 'view', 'audit', 'Ver log de auditoría'),
  
  -- Configuración
  ('configuracion', 'view', 'general', 'Ver configuración general'),
  ('configuracion', 'edit', 'general', 'Editar configuración general'),
  ('configuracion', 'edit', 'notifications', 'Configurar notificaciones'),
  ('configuracion', 'edit', 'integrations', 'Configurar integraciones'),
  ('configuracion', 'view', 'subscription', 'Ver suscripción'),
  
  -- API Docs
  ('api', 'view', 'docs', 'Ver documentación API'),
  ('api', 'view', 'keys', 'Ver API keys'),
  ('api', 'create', 'key', 'Crear API key')
ON CONFLICT (module, action, resource) DO NOTHING;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid,
  p_module text,
  p_action text,
  p_resource text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON rp.role_id = p.role_id
    JOIN permissions perm ON perm.id = rp.permission_id
    WHERE p.id = p_user_id
      AND perm.module = p_module
      AND perm.action = p_action
      AND (p_resource IS NULL OR perm.resource = p_resource)
  ) INTO v_has_permission;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Función para obtener todos los permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS TABLE (
  module text,
  action text,
  resource text,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    perm.module,
    perm.action,
    perm.resource,
    perm.description
  FROM profiles p
  JOIN role_permissions rp ON rp.role_id = p.role_id
  JOIN permissions perm ON perm.id = rp.permission_id
  WHERE p.id = p_user_id;
END;
$$;

-- RLS Policies para roles
CREATE POLICY "Users can view roles in their tenant"
  ON roles FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND is_system = false);

-- RLS Policies para permissions (todos pueden ver)
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies para role_permissions
CREATE POLICY "Users can view role permissions in their tenant"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Admins can insert role permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Admins can delete role permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));
