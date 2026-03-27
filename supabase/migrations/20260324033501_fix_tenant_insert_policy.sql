/*
  # Fix Tenant Insert Policy

  ## Problem
  Users cannot create tenants during registration because the RLS policy
  is blocking the INSERT operation.

  ## Solution
  Update the INSERT policy for tenants to explicitly allow creation by
  authenticated users. Also ensure profiles and tenant_members policies
  allow insertion during registration flow.

  ## Changes
  1. Update tenant INSERT policy
  2. Ensure profile INSERT policy allows registration
  3. Ensure tenant_members INSERT policy allows registration
*/

-- =====================================================
-- FIX TENANTS INSERT POLICY
-- =====================================================

DROP POLICY IF EXISTS "System can create tenants" ON tenants;

-- Allow authenticated users to create tenants
CREATE POLICY "Authenticated users can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- VERIFY PROFILES INSERT POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =====================================================
-- VERIFY TENANT_MEMBERS INSERT POLICY
-- =====================================================

DROP POLICY IF EXISTS "System can create memberships" ON tenant_members;

-- Allow authenticated users to create memberships
-- (This is needed during registration)
CREATE POLICY "Authenticated users can create memberships"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FIX TENANT_SUBSCRIPTIONS INSERT POLICY
-- =====================================================

DROP POLICY IF EXISTS "System can create subscriptions" ON tenant_subscriptions;

-- Allow authenticated users to create subscriptions
CREATE POLICY "Authenticated users can create subscriptions"
  ON tenant_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);
