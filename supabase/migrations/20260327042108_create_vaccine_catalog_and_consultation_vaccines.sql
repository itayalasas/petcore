/*
  # Create Vaccine Catalog and Consultation Vaccines Tables

  1. New Tables
    - `vaccine_catalog` - Master catalog of vaccines with species/breed info
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, required)
      - `name` (text, required) - Vaccine name
      - `description` (text) - Description
      - `species` (text array) - Which species (perro, gato, etc.)
      - `manufacturer` (text) - Manufacturer/brand
      - `dose_ml` (numeric) - Standard dose
      - `price` (numeric) - Price to charge
      - `interval_days` (integer) - Days between doses
      - `required_doses` (integer) - Number of doses in protocol
      - `is_required` (boolean) - Is it a mandatory vaccine
      - `min_age_weeks` (integer) - Minimum age to apply
      - `is_active` (boolean)
      
    - `consultation_vaccines` - Vaccines applied during consultations
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, required)
      - `consultation_id` (uuid, required)
      - `vaccine_id` (uuid, optional) - Reference to catalog
      - `vaccine_name` (text, required)
      - `batch_number` (text) - Vaccine batch/lot number
      - `expiry_date` (date) - Expiry of vaccine
      - `dose_number` (integer) - Which dose in series
      - `next_dose_date` (date) - When next dose is due
      - `price` (numeric) - Price charged
      - `notes` (text)
      - `applied_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies for tenant-based access
*/

CREATE TABLE IF NOT EXISTS vaccine_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  species text[] DEFAULT ARRAY['perro', 'gato'],
  manufacturer text,
  dose_ml numeric(5,2),
  price numeric(10,2) DEFAULT 0,
  interval_days integer DEFAULT 365,
  required_doses integer DEFAULT 1,
  is_required boolean DEFAULT false,
  min_age_weeks integer DEFAULT 6,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  vaccine_id uuid REFERENCES vaccine_catalog(id) ON DELETE SET NULL,
  vaccine_name text NOT NULL,
  batch_number text,
  expiry_date date,
  dose_number integer DEFAULT 1,
  next_dose_date date,
  price numeric(10,2) DEFAULT 0,
  notes text,
  applied_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccine_catalog_tenant ON vaccine_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_catalog_species ON vaccine_catalog USING GIN(species);
CREATE INDEX IF NOT EXISTS idx_consultation_vaccines_consultation ON consultation_vaccines(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_vaccines_tenant ON consultation_vaccines(tenant_id);

ALTER TABLE vaccine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_vaccines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vaccine catalog in their tenant"
  ON vaccine_catalog FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert vaccine catalog in their tenant"
  ON vaccine_catalog FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update vaccine catalog in their tenant"
  ON vaccine_catalog FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete vaccine catalog in their tenant"
  ON vaccine_catalog FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view consultation vaccines in their tenant"
  ON consultation_vaccines FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert consultation vaccines in their tenant"
  ON consultation_vaccines FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update consultation vaccines in their tenant"
  ON consultation_vaccines FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete consultation vaccines in their tenant"
  ON consultation_vaccines FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
