/*
  # Agregar columna price a appointments

  1. Descripción
    - Agrega la columna price a la tabla appointments
    - Permite registrar el precio de cada cita/reserva
    - Tiene valor por defecto 0

  2. Cambios
    - Agrega columna price (decimal)
*/

-- Agregar columna price a appointments si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'price'
  ) THEN
    ALTER TABLE appointments ADD COLUMN price decimal(10,2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Crear índice para búsquedas por precio
CREATE INDEX IF NOT EXISTS idx_appointments_price ON appointments(price);

-- Actualizar precio basado en el servicio asociado (si existe)
UPDATE appointments a
SET price = s.price
FROM services s
WHERE a.service_id = s.id
  AND a.price = 0;
