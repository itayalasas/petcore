/*
  # Create Billing Queue for POS Notifications

  1. New Tables
    - `billing_queue`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `source_type` (text) - Type of source: 'consultation', 'grooming', 'daycare'
      - `source_id` (uuid) - ID of the source record (consultation_id, pet_service_id)
      - `pet_id` (uuid) - Pet being serviced
      - `owner_id` (uuid) - Owner to charge
      - `description` (text) - Description of the service
      - `amount` (numeric) - Amount to charge
      - `requested_by` (uuid) - Staff member who requested the charge
      - `status` (text) - 'pending', 'processed', 'cancelled'
      - `processed_at` (timestamptz) - When it was processed
      - `processed_by` (uuid) - Who processed it
      - `order_id` (uuid) - Resulting order ID after processing
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `billing_queue` table
    - Add policies for tenant-based access

  3. Purpose
    - Allows veterinarians/staff to send services to POS for billing
    - POS staff see pending items and can process them
    - Provides notification counts for sidebar
*/

CREATE TABLE IF NOT EXISTS billing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('consultation', 'grooming', 'daycare', 'walk', 'overnight', 'vaccine', 'other')),
  source_id uuid,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES owners(id) ON DELETE SET NULL,
  description text NOT NULL,
  items jsonb DEFAULT '[]',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_queue_tenant_status ON billing_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_queue_source ON billing_queue(source_type, source_id);

ALTER TABLE billing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_queue_tenant_isolation"
  ON billing_queue
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
