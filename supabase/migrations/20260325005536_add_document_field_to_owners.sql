/*
  # Agregar campo de documento/DNI a tabla owners

  1. Agregar columna document_id a owners
  2. Crear índice para búsquedas rápidas
*/

-- Agregar campo de documento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'owners' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE owners ADD COLUMN document_id text;
    CREATE INDEX idx_owners_document ON owners(document_id);
  END IF;
END $$;
