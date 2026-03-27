/*
  # Create Pet Services Table for Grooming and Other Services

  1. New Tables
    - `pet_services` - Records of services performed on pets (grooming, bathing, nail trimming, etc.)
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, required) - Multi-tenant reference
      - `pet_id` (uuid, required) - Reference to the pet
      - `service_id` (uuid, optional) - Reference to catalog service
      - `service_name` (text, required) - Name of the service performed
      - `service_type` (text, required) - Type: grooming, bathing, nail_trim, haircut, spa, other
      - `performed_by` (uuid, optional) - Staff member who performed the service
      - `performed_at` (timestamptz, required) - When the service was performed
      - `duration_minutes` (integer) - Duration of the service
      - `notes` (text) - Additional notes about the service
      - `before_photo_url` (text) - Photo before service
      - `after_photo_url` (text) - Photo after service
      - `price` (numeric) - Price charged
      - `status` (text) - Status: scheduled, in_progress, completed, cancelled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies for tenant-based access
*/

CREATE TABLE IF NOT EXISTS pet_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  service_type text NOT NULL DEFAULT 'other',
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  notes text,
  before_photo_url text,
  after_photo_url text,
  price numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_service_type CHECK (service_type IN ('grooming', 'bathing', 'nail_trim', 'haircut', 'spa', 'dental', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_pet_services_tenant ON pet_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pet_services_pet ON pet_services(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_services_performed_at ON pet_services(performed_at DESC);

ALTER TABLE pet_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pet services in their tenant"
  ON pet_services
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pet services in their tenant"
  ON pet_services
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update pet services in their tenant"
  ON pet_services
  FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete pet services in their tenant"
  ON pet_services
  FOR DELETE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
