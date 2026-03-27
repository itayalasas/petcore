/*
  # Add permissions for Estetica and Cuidado modules + Specialized roles

  1. New Global Permissions
    - estetica:view, estetica:create, estetica:edit
    - cuidado:view, cuidado:create, cuidado:edit

  2. New Roles (per tenant)
    - veterinarian: Access to consultas, mascotas, duenos, agenda
    - groomer: Access to estetica, mascotas, duenos, agenda
    - caretaker: Access to cuidado, mascotas, duenos, agenda

  3. Updates
    - Add new permissions to existing owner/admin roles
*/

INSERT INTO permissions (module, action, resource, description)
VALUES 
  ('estetica', 'view', 'services', 'Ver servicios de estetica'),
  ('estetica', 'create', 'service', 'Crear servicios de estetica'),
  ('estetica', 'edit', 'service', 'Editar servicios de estetica'),
  ('cuidado', 'view', 'services', 'Ver servicios de cuidado'),
  ('cuidado', 'create', 'service', 'Crear servicios de cuidado'),
  ('cuidado', 'edit', 'service', 'Editar servicios de cuidado')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_tenant_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
  v_owner_role_id uuid;
  v_admin_role_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM tenants LOOP
    SELECT id INTO v_owner_role_id FROM roles WHERE tenant_id = v_tenant_id AND name = 'owner';
    SELECT id INTO v_admin_role_id FROM roles WHERE tenant_id = v_tenant_id AND name = 'admin';

    IF v_owner_role_id IS NOT NULL THEN
      FOR v_permission_id IN 
        SELECT id FROM permissions 
        WHERE module IN ('estetica', 'cuidado')
      LOOP
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        VALUES (v_tenant_id, v_owner_role_id, v_permission_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF v_admin_role_id IS NOT NULL THEN
      FOR v_permission_id IN 
        SELECT id FROM permissions 
        WHERE module IN ('estetica', 'cuidado')
      LOOP
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        VALUES (v_tenant_id, v_admin_role_id, v_permission_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM roles WHERE tenant_id = v_tenant_id AND name = 'veterinarian'
    ) THEN
      INSERT INTO roles (tenant_id, name, description, is_system)
      VALUES (v_tenant_id, 'veterinarian', 'Veterinario con acceso a consultas, mascotas y agenda', true)
      RETURNING id INTO v_role_id;

      FOR v_permission_id IN 
        SELECT id FROM permissions 
        WHERE module IN ('dashboard', 'salud', 'mascotas', 'duenos', 'agenda')
      LOOP
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        VALUES (v_tenant_id, v_role_id, v_permission_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM roles WHERE tenant_id = v_tenant_id AND name = 'groomer'
    ) THEN
      INSERT INTO roles (tenant_id, name, description, is_system)
      VALUES (v_tenant_id, 'groomer', 'Peluquero/estilista con acceso a estetica, mascotas y agenda', true)
      RETURNING id INTO v_role_id;

      FOR v_permission_id IN 
        SELECT id FROM permissions 
        WHERE module IN ('dashboard', 'estetica', 'mascotas', 'duenos', 'agenda')
      LOOP
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        VALUES (v_tenant_id, v_role_id, v_permission_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM roles WHERE tenant_id = v_tenant_id AND name = 'caretaker'
    ) THEN
      INSERT INTO roles (tenant_id, name, description, is_system)
      VALUES (v_tenant_id, 'caretaker', 'Cuidador con acceso a guarderia, mascotas y agenda', true)
      RETURNING id INTO v_role_id;

      FOR v_permission_id IN 
        SELECT id FROM permissions 
        WHERE module IN ('dashboard', 'cuidado', 'mascotas', 'duenos', 'agenda')
      LOOP
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        VALUES (v_tenant_id, v_role_id, v_permission_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;
END $$;