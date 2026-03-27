/*
  # Helper Functions for RLS Policies

  ## Functions
  - is_tenant_admin() - Check if current user is admin or owner of their tenant
  - is_tenant_owner() - Check if current user is owner of their tenant
*/

-- Check if user is admin or owner in their tenant
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

-- Check if user is owner in their tenant
CREATE OR REPLACE FUNCTION is_tenant_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role = 'owner'
      AND is_active = true
  );
$$;
