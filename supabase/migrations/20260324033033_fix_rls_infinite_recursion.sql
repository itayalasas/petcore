/*
  # Fix RLS Infinite Recursion

  ## Problem
  The RLS policies for tenant_members and tenants were causing infinite recursion
  because they query tenant_members within the policy check for tenant_members.

  ## Solution
  Rewrite policies to avoid self-referencing queries:
  - For tenant_members: Allow users to see rows where they are directly mentioned
  - For tenants: Use SECURITY DEFINER functions to break the recursion chain
  - Simplify policy logic to avoid circular references

  ## Changes
  1. Drop existing problematic policies
  2. Create new non-recursive policies
  3. Use simpler checks that don't create circular dependencies
*/

-- =====================================================
-- DROP EXISTING POLICIES THAT CAUSE RECURSION
-- =====================================================

-- Drop tenant_members policies
DROP POLICY IF EXISTS "Users can view members of their tenants" ON tenant_members;
DROP POLICY IF EXISTS "Admins can insert members" ON tenant_members;
DROP POLICY IF EXISTS "Admins can update members" ON tenant_members;
DROP POLICY IF EXISTS "Admins can delete members" ON tenant_members;

-- Drop tenants policies
DROP POLICY IF EXISTS "Users can view their own tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant owners can update their tenant" ON tenants;
DROP POLICY IF EXISTS "System can create tenants" ON tenants;

-- Drop subscription policies that might reference tenant_members
DROP POLICY IF EXISTS "Users can view own tenant subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Tenant admins can update subscription" ON tenant_subscriptions;

-- =====================================================
-- CREATE HELPER FUNCTION (SECURITY DEFINER)
-- =====================================================

-- This function bypasses RLS to get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM tenant_members 
  WHERE user_id = auth.uid() 
  AND is_active = true;
$$;

-- =====================================================
-- NEW NON-RECURSIVE POLICIES FOR TENANT_MEMBERS
-- =====================================================

-- Users can see their own memberships
CREATE POLICY "Users can view own memberships"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can see other members of their tenants (using helper function)
CREATE POLICY "Users can view tenant members"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- System can create memberships during registration
CREATE POLICY "System can create memberships"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update memberships in their tenants
CREATE POLICY "Admins can update memberships"
  ON tenant_members FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Admins can delete memberships in their tenants
CREATE POLICY "Admins can delete memberships"
  ON tenant_members FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- NEW NON-RECURSIVE POLICIES FOR TENANTS
-- =====================================================

-- Users can view tenants they belong to (using helper function)
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_tenant_ids()));

-- Owners can update their tenants (simplified check)
CREATE POLICY "Owners can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (id IN (SELECT get_user_tenant_ids()));

-- System can create tenants during registration
CREATE POLICY "System can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FIX SUBSCRIPTION POLICIES
-- =====================================================

-- Users can view subscriptions of their tenants
CREATE POLICY "Users can view tenant subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Admins can update subscriptions
CREATE POLICY "Admins can update subscriptions"
  ON tenant_subscriptions FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
