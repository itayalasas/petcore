/*
  # Expand pet_services service_type to include daycare types

  1. Changes
    - Drop existing constraint
    - Add new constraint with expanded values: daycare, walk, overnight
*/

ALTER TABLE pet_services DROP CONSTRAINT IF EXISTS valid_service_type;

ALTER TABLE pet_services ADD CONSTRAINT valid_service_type 
CHECK (service_type IN ('grooming', 'bathing', 'nail_trim', 'haircut', 'spa', 'dental', 'daycare', 'walk', 'overnight', 'other'));