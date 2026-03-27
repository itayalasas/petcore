/*
  # Add Inventario module permissions
  
  1. New Permissions
    - inventario:view - View inventory and products
    - inventario:create - Create new products
    - inventario:edit - Edit products and adjust stock
    - inventario:delete - Delete products
  
  2. Role Assignments
    - admin role gets all inventario permissions
    - veterinario role gets view permission
*/

INSERT INTO permissions (module, action, resource, description) VALUES
  ('inventario', 'view', 'products', 'Ver inventario y productos'),
  ('inventario', 'create', 'products', 'Crear nuevos productos'),
  ('inventario', 'edit', 'products', 'Editar productos y ajustar stock'),
  ('inventario', 'delete', 'products', 'Eliminar productos')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.module = 'inventario'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'veterinario'
AND p.module = 'inventario'
AND p.action = 'view'
ON CONFLICT DO NOTHING;