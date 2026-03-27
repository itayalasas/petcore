/*
  # Add Inventario module to licensing catalog
  
  1. New Module
    - inventario module for product and stock management
    - Category: Negocio (between ordenes and comercio)
    - Sort order: 75 (before comercio at 80)
    - Default enabled: true
  
  2. Note
    - This allows the module to be managed in the platform licensing console
    - Plans can now enable/disable this module
*/

INSERT INTO module_catalog (module_key, display_name, description, category, is_core, default_enabled, sort_order)
VALUES ('inventario', 'Inventario', 'Gestion de productos, stock y movimientos', 'Negocio', false, true, 75)
ON CONFLICT (module_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();