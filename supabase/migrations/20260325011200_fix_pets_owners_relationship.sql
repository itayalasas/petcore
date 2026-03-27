/*
  # Arreglar relación entre pets y owners

  1. Descripción
    - Asegura que existe la relación de foreign key entre pets.owner_id y owners.id
    - Elimina la constraint incorrecta si existe
    - Crea la constraint correcta
  
  2. Cambios
    - Verifica que la columna owner_id existe en pets
    - Crea o recrea la foreign key constraint
    - Actualiza el índice si es necesario
*/

-- Primero, eliminar la constraint existente si existe (podría estar mal configurada)
DO $$
BEGIN
  -- Intentar eliminar cualquier constraint existente en owner_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%owner_id%' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_owner_id_fkey CASCADE;
  END IF;
END $$;

-- Asegurar que la columna owner_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE pets ADD COLUMN owner_id uuid;
  END IF;
END $$;

-- Crear el índice si no existe
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);

-- Ahora crear la foreign key constraint correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pets_owner_id_fkey'
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE pets 
    ADD CONSTRAINT pets_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES owners(id) 
    ON DELETE SET NULL;
  END IF;
END $$;
