DROP POLICY IF EXISTS "Platform admins can insert plan module licenses" ON plan_module_licenses;
CREATE POLICY "Platform admins can insert plan module licenses"
  ON plan_module_licenses FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can update plan module licenses" ON plan_module_licenses;
CREATE POLICY "Platform admins can update plan module licenses"
  ON plan_module_licenses FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can delete plan module licenses" ON plan_module_licenses;
CREATE POLICY "Platform admins can delete plan module licenses"
  ON plan_module_licenses FOR DELETE
  TO authenticated
  USING (is_platform_admin(auth.uid()));