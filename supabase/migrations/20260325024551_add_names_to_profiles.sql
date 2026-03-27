/*
  # Agregar campos de nombre a profiles

  1. Descripción
    - Agrega first_name y last_name a la tabla profiles
    - Mantiene display_name para compatibilidad
    - Migra datos existentes si es necesario

  2. Cambios
    - Agrega columnas first_name y last_name
    - Actualiza display_name como campo computado si está vacío
*/

-- Agregar columnas first_name y last_name si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Migrar datos: si display_name tiene espacios, separar en first_name y last_name
UPDATE profiles
SET 
  first_name = CASE 
    WHEN display_name IS NOT NULL AND position(' ' in display_name) > 0 
    THEN split_part(display_name, ' ', 1)
    ELSE display_name
  END,
  last_name = CASE 
    WHEN display_name IS NOT NULL AND position(' ' in display_name) > 0 
    THEN substring(display_name from position(' ' in display_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL 
  AND display_name IS NOT NULL;

-- Si display_name está vacío pero hay first_name y last_name, construir display_name
UPDATE profiles
SET display_name = CONCAT(first_name, ' ', COALESCE(last_name, ''))
WHERE display_name IS NULL 
  AND first_name IS NOT NULL;
