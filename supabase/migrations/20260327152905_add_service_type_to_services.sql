/*
  # Add service_type to services table

  1. Changes
    - Add `service_type` column to services table with enum values:
      - 'veterinary': Consultas veterinarias, vacunacion, tratamientos
      - 'grooming': Bano, peluqueria, corte de unas, estetica
      - 'daycare': Guarderia, paseos, cuidado
    - Update existing services based on category

  2. Notes
    - service_type determines which module handles the appointment
    - veterinary -> Salud (consultas veterinarias)
    - grooming -> Estetica (bandeja de grooming)
    - daycare -> Cuidado (bandeja de cuidado)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE services ADD COLUMN service_type text DEFAULT 'veterinary';
  END IF;
END $$;

UPDATE services SET service_type = 'grooming' 
WHERE LOWER(category) IN ('estética', 'estetica', 'grooming', 'peluquería', 'peluqueria');

UPDATE services SET service_type = 'daycare' 
WHERE LOWER(category) IN ('guardería', 'guarderia', 'cuidado', 'paseo', 'daycare');

UPDATE services SET service_type = 'veterinary' 
WHERE LOWER(category) IN ('veterinaria', 'veterinary', 'salud', 'vacunación', 'vacunacion');

ALTER TABLE services ALTER COLUMN service_type SET NOT NULL;