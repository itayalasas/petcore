DROP POLICY IF EXISTS "Platform admins can view all plans" ON subscription_plans;
CREATE POLICY "Platform admins can view all plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can insert plans" ON subscription_plans;
CREATE POLICY "Platform admins can insert plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can update plans" ON subscription_plans;
CREATE POLICY "Platform admins can update plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can delete plans" ON subscription_plans;
CREATE POLICY "Platform admins can delete plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (is_platform_admin(auth.uid()));
