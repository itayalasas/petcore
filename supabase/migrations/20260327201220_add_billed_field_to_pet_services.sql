/*
  # Add billed field to pet_services
  
  1. Changes
    - Add `billed` boolean column to pet_services table with default false
    - This field tracks whether a pet service has been charged/paid
  
  2. Purpose
    - Allows POS to filter out already-billed services from pending charges
    - Consistent with consultations table behavior
*/

ALTER TABLE pet_services 
ADD COLUMN IF NOT EXISTS billed boolean DEFAULT false;