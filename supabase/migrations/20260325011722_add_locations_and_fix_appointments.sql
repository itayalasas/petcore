/*
  # Agregar tabla de ubicaciones y arreglar appointments

  1. Nueva Tabla: locations
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, foreign key)
    - `name` (text, nombre de la ubicación)
    - `address` (text, dirección)
    - `city` (text, ciudad)
    - `phone` (text, teléfono)
    - `is_active` (boolean, si está activa)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Modificaciones a appointments
    - Agregar `location_id` (uuid, foreign key a locations)
    - Cambiar el nombre de la columna de `scheduled_at` si es necesario
    - Asegurar que todos los campos estén correctos

  3. Seguridad
    - Habilitar RLS en locations
    - Crear políticas de acceso basadas en tenant
*/

-- Crear tabla de ubicaciones
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);

-- Agregar location_id a appointments si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);
  END IF;
END $$;

-- Renombrar appointment_date a scheduled_at si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE appointments RENAME COLUMN appointment_date TO scheduled_at;
  END IF;
END $$;

-- Cambiar owner_id para que referencie owners en lugar de profiles
DO $$
BEGIN
  -- Primero eliminar la constraint existente si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_owner_id_fkey'
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments DROP CONSTRAINT appointments_owner_id_fkey;
  END IF;

  -- Agregar la nueva constraint correcta
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_owner_id_fkey'
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES owners(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- RLS Policies para locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can view locations in their tenant') THEN
    CREATE POLICY "Users can view locations in their tenant"
      ON locations FOR SELECT
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can insert locations') THEN
    CREATE POLICY "Users can insert locations"
      ON locations FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can update locations') THEN
    CREATE POLICY "Users can update locations"
      ON locations FOR UPDATE
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can delete locations') THEN
    CREATE POLICY "Users can delete locations"
      ON locations FOR DELETE
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;
END $$;

-- Insertar ubicaciones por defecto para tenants existentes
INSERT INTO locations (tenant_id, name, address, city)
SELECT 
  id as tenant_id,
  'Sede Principal' as name,
  'Dirección principal' as address,
  'Ciudad' as city
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE locations.tenant_id = tenants.id
);
