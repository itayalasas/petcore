/*
  # Change appointments employee reference to profiles

  1. Changes
    - Drop the existing foreign key constraint from appointments.employee_id to employees table
    - Add new foreign key constraint from appointments.employee_id to profiles table
    - This allows assigning users (from profiles) instead of employees to appointments

  2. Reason
    - The system uses profiles table for user management, not employees table
    - Appointments should be assigned to users (profiles) who have roles

  3. Security
    - No RLS changes needed, existing policies remain valid
*/

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_employee_id_fkey' 
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments DROP CONSTRAINT appointments_employee_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_assigned_user_fkey' 
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_assigned_user_fkey 
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Also fix pet_services table if it has the same issue
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pet_services_employee_id_fkey' 
    AND table_name = 'pet_services'
  ) THEN
    ALTER TABLE pet_services DROP CONSTRAINT pet_services_employee_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_services' AND column_name = 'employee_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pet_services_assigned_user_fkey' 
    AND table_name = 'pet_services'
  ) THEN
    ALTER TABLE pet_services 
    ADD CONSTRAINT pet_services_assigned_user_fkey 
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
