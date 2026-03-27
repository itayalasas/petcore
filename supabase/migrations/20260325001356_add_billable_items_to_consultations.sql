/*
  # Add Billable Items Tracking to Consultations

  ## Changes
  - Add billable_items JSONB field to consultations table
  - Add billed boolean flag to track if consultation has been charged
  - This allows veterinarians to add products/services during consultation
  - POS can then load these items automatically for billing

  ## Structure of billable_items
  [
    {
      "type": "product" | "service",
      "id": "uuid",
      "name": "Item name",
      "quantity": 1,
      "unit_price": 100.00,
      "notes": "Optional notes"
    }
  ]
*/

-- Add billable_items field to track items to charge
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'billable_items'
  ) THEN
    ALTER TABLE consultations ADD COLUMN billable_items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add billed flag to track if consultation has been charged
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'billed'
  ) THEN
    ALTER TABLE consultations ADD COLUMN billed boolean DEFAULT false;
  END IF;
END $$;

-- Add index for quick lookup of unbilled consultations
CREATE INDEX IF NOT EXISTS idx_consultations_unbilled ON consultations(tenant_id, billed, date DESC)
WHERE billed = false;
