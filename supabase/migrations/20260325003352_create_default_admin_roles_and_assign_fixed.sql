/*
  # Crear Roles de Administrador por Defecto

  1. Cambios
    - Crear rol "Administrador" para cada tenant existente
    - Asignar TODOS los permisos al rol Administrador
    - Asignar el rol Administrador a todos los usuarios existentes
    - Modificar la función de registro para crear rol admin automáticamente

  2. Seguridad
    - Los admins tendrán acceso completo a su tenant
*/

-- Crear rol de Administrador para cada tenant existente
INSERT INTO roles (tenant_id, name, description, is_system)
SELECT 
  id,
  'Administrador',
  'Acceso completo al sistema con todos los permisos',
  true
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM roles 
  WHERE roles.tenant_id = tenants.id 
  AND roles.name = 'Administrador'
);

-- Asignar TODOS los permisos al rol Administrador de cada tenant
INSERT INTO role_permissions (tenant_id, role_id, permission_id)
SELECT 
  r.tenant_id,
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar el rol de Administrador a todos los usuarios existentes que no tengan rol
UPDATE profiles
SET role_id = (
  SELECT id 
  FROM roles 
  WHERE roles.tenant_id = profiles.tenant_id 
  AND roles.name = 'Administrador'
  LIMIT 1
)
WHERE role_id IS NULL;

-- Actualizar la función de registro para crear automáticamente el rol admin
CREATE OR REPLACE FUNCTION register_company(
  p_company_name text,
  p_industry text,
  p_user_email text,
  p_user_password text,
  p_user_full_name text,
  p_plan_id text DEFAULT 'free'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_subscription_id uuid;
  v_admin_role_id uuid;
BEGIN
  -- 1. Crear usuario en auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    p_user_email,
    crypt(p_user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_user_full_name),
    now(),
    now()
  )
  RETURNING id INTO v_user_id;

  -- 2. Crear tenant
  INSERT INTO tenants (name, slug, is_active, created_at, updated_at)
  VALUES (
    p_company_name, 
    lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g')),
    true,
    now(), 
    now()
  )
  RETURNING id INTO v_tenant_id;

  -- 3. Crear suscripción
  INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
  VALUES (
    v_tenant_id,
    p_plan_id,
    'active',
    now(),
    now() + interval '1 month'
  )
  RETURNING id INTO v_subscription_id;

  -- 4. Crear rol de Administrador
  INSERT INTO roles (tenant_id, name, description, is_system)
  VALUES (
    v_tenant_id,
    'Administrador',
    'Acceso completo al sistema con todos los permisos',
    true
  )
  RETURNING id INTO v_admin_role_id;

  -- 5. Asignar TODOS los permisos al rol Administrador
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT v_tenant_id, v_admin_role_id, id
  FROM permissions;

  -- 6. Crear perfil con rol de administrador
  INSERT INTO profiles (
    id,
    tenant_id,
    role_id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_tenant_id,
    v_admin_role_id,
    p_user_email,
    p_user_full_name,
    now(),
    now()
  );

  -- Retornar información
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'tenant_id', v_tenant_id,
    'subscription_id', v_subscription_id,
    'role_id', v_admin_role_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
