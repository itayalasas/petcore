/*
  # Add appointment_id to pet_services

  1. Changes
    - Add appointment_id column to pet_services table
    - Add foreign key reference to appointments table
    
  2. Purpose
    - Allow tracking which appointment originated a pet service
    - Enable updating appointment status when service is completed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_services' AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE pet_services ADD COLUMN appointment_id uuid REFERENCES appointments(id);
  END IF;
END $$;