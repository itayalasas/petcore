/*
  # Update All RLS Policies to Use Helper Function

  ## Changes
  Replace all direct queries to tenant_members in RLS policies with the
  get_user_tenant_ids() helper function to ensure consistency and prevent
  any potential recursion issues.

  ## Tables Updated
  - profiles
  - pets
  - pet_health
  - bookings
  - orders
  - partners
*/

-- =====================================================
-- UPDATE PROFILES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;

CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    tenant_id IN (SELECT get_user_tenant_ids())
  );

-- =====================================================
-- UPDATE PETS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view pets in their tenant" ON pets;
DROP POLICY IF EXISTS "Users can insert pets in their tenant" ON pets;
DROP POLICY IF EXISTS "Users can update pets in their tenant" ON pets;
DROP POLICY IF EXISTS "Users can delete pets in their tenant" ON pets;

CREATE POLICY "Users can view pets in their tenant"
  ON pets FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert pets in their tenant"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update pets in their tenant"
  ON pets FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete pets in their tenant"
  ON pets FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- UPDATE PET_HEALTH POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view pet health in their tenant" ON pet_health;
DROP POLICY IF EXISTS "Users can insert pet health in their tenant" ON pet_health;
DROP POLICY IF EXISTS "Users can update pet health in their tenant" ON pet_health;
DROP POLICY IF EXISTS "Users can delete pet health in their tenant" ON pet_health;

CREATE POLICY "Users can view pet health in their tenant"
  ON pet_health FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert pet health in their tenant"
  ON pet_health FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update pet health in their tenant"
  ON pet_health FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete pet health in their tenant"
  ON pet_health FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- UPDATE BOOKINGS POLICIES (if table exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    DROP POLICY IF EXISTS "Users can view bookings in their tenant" ON bookings;
    DROP POLICY IF EXISTS "Users can insert bookings in their tenant" ON bookings;
    DROP POLICY IF EXISTS "Users can update bookings in their tenant" ON bookings;
    DROP POLICY IF EXISTS "Users can delete bookings in their tenant" ON bookings;

    EXECUTE 'CREATE POLICY "Users can view bookings in their tenant" ON bookings FOR SELECT TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can insert bookings in their tenant" ON bookings FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can update bookings in their tenant" ON bookings FOR UPDATE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can delete bookings in their tenant" ON bookings FOR DELETE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
  END IF;
END $$;

-- =====================================================
-- UPDATE ORDERS POLICIES (if table exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP POLICY IF EXISTS "Users can view orders in their tenant" ON orders;
    DROP POLICY IF EXISTS "Users can insert orders in their tenant" ON orders;
    DROP POLICY IF EXISTS "Users can update orders in their tenant" ON orders;
    DROP POLICY IF EXISTS "Users can delete orders in their tenant" ON orders;

    EXECUTE 'CREATE POLICY "Users can view orders in their tenant" ON orders FOR SELECT TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can insert orders in their tenant" ON orders FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can update orders in their tenant" ON orders FOR UPDATE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can delete orders in their tenant" ON orders FOR DELETE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
  END IF;
END $$;

-- =====================================================
-- UPDATE PARTNERS POLICIES (if table exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partners') THEN
    DROP POLICY IF EXISTS "Users can view partners in their tenant" ON partners;
    DROP POLICY IF EXISTS "Users can insert partners in their tenant" ON partners;
    DROP POLICY IF EXISTS "Users can update partners in their tenant" ON partners;
    DROP POLICY IF EXISTS "Users can delete partners in their tenant" ON partners;

    EXECUTE 'CREATE POLICY "Users can view partners in their tenant" ON partners FOR SELECT TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can insert partners in their tenant" ON partners FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can update partners in their tenant" ON partners FOR UPDATE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()))';
    EXECUTE 'CREATE POLICY "Users can delete partners in their tenant" ON partners FOR DELETE TO authenticated USING (tenant_id IN (SELECT get_user_tenant_ids()))';
  END IF;
END $$;
