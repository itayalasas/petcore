/*
  # Enable Inventario module on all subscription plans
  
  1. Changes
    - Adds inventario module license to basic, professional, and enterprise plans
    - All plans get access to inventory management by default
  
  2. Notes
    - This ensures existing tenants can access the new Inventario module
*/

INSERT INTO plan_module_licenses (plan_id, module_key, is_enabled)
SELECT sp.id, 'inventario', true
FROM subscription_plans sp
WHERE sp.name IN ('basic', 'professional', 'enterprise')
ON CONFLICT (plan_id, module_key) DO UPDATE SET is_enabled = true;