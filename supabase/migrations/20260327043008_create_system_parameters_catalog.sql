/*
  # Create System Parameters Table for Configurable Catalogs

  1. New Tables
    - `system_parameters` - Master table for all configurable system data
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, required) - Multi-tenant reference
      - `code` (text) - Unique code identifier within type
      - `type` (text, required) - Type/category: vaccine, service, diagnosis, treatment, medication, species, breed, etc.
      - `name` (text, required) - Display name
      - `description` (text) - Description
      - `value` (jsonb) - Flexible value storage for type-specific data
      - `parent_id` (uuid) - For hierarchical data (e.g., breeds under species)
      - `sort_order` (integer) - Display order
      - `is_active` (boolean) - Active/inactive flag
      - `is_system` (boolean) - System default (non-deletable)
      - `metadata` (jsonb) - Additional flexible metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies for tenant-based access
*/

CREATE TABLE IF NOT EXISTS system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text,
  type text NOT NULL,
  name text NOT NULL,
  description text,
  value jsonb DEFAULT '{}',
  parent_id uuid REFERENCES system_parameters(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_code_per_type_tenant UNIQUE (tenant_id, type, code)
);

CREATE INDEX IF NOT EXISTS idx_system_parameters_tenant ON system_parameters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_parameters_type ON system_parameters(type);
CREATE INDEX IF NOT EXISTS idx_system_parameters_parent ON system_parameters(parent_id);
CREATE INDEX IF NOT EXISTS idx_system_parameters_active ON system_parameters(is_active);

ALTER TABLE system_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system parameters in their tenant"
  ON system_parameters FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert system parameters in their tenant"
  ON system_parameters FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update system parameters in their tenant"
  ON system_parameters FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete non-system parameters in their tenant"
  ON system_parameters FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    AND is_system = false
  );

CREATE OR REPLACE FUNCTION seed_tenant_system_parameters(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO system_parameters (tenant_id, code, type, name, description, value, is_system, sort_order)
  SELECT 
    p_tenant_id,
    v.code,
    v.type,
    v.name,
    v.description,
    v.value::jsonb,
    true,
    v.sort_order
  FROM (VALUES
    ('perro', 'species', 'Perro', 'Canino domestico', '{}', 1),
    ('gato', 'species', 'Gato', 'Felino domestico', '{}', 2),
    ('ave', 'species', 'Ave', 'Aves domesticas', '{}', 3),
    ('roedor', 'species', 'Roedor', 'Hamsters, conejos, etc.', '{}', 4),
    ('reptil', 'species', 'Reptil', 'Tortugas, iguanas, etc.', '{}', 5),
    ('consulta_general', 'service_type', 'Consulta General', 'Consulta veterinaria general', '{"price": 500, "duration_minutes": 30}', 1),
    ('vacunacion', 'service_type', 'Vacunacion', 'Aplicacion de vacunas', '{"price": 350, "duration_minutes": 15}', 2),
    ('cirugia', 'service_type', 'Cirugia', 'Procedimientos quirurgicos', '{"price": 2500, "duration_minutes": 120}', 3),
    ('laboratorio', 'service_type', 'Laboratorio', 'Examenes de laboratorio', '{"price": 800, "duration_minutes": 20}', 4),
    ('radiografia', 'service_type', 'Radiografia', 'Estudios radiograficos', '{"price": 1200, "duration_minutes": 30}', 5),
    ('ultrasonido', 'service_type', 'Ultrasonido', 'Estudios ultrasonograficos', '{"price": 1500, "duration_minutes": 45}', 6),
    ('hospitalizacion', 'service_type', 'Hospitalizacion', 'Internamiento y cuidados', '{"price": 800, "duration_minutes": 1440}', 7),
    ('estetica', 'service_type', 'Estetica', 'Servicios de grooming', '{"price": 400, "duration_minutes": 60}', 8),
    ('emergencia', 'service_type', 'Emergencia', 'Atencion de urgencias', '{"price": 1000, "duration_minutes": 60}', 9),
    ('oral', 'medication_route', 'Oral', 'Administracion por via oral', '{}', 1),
    ('subcutanea', 'medication_route', 'Subcutanea', 'Inyeccion subcutanea', '{}', 2),
    ('intramuscular', 'medication_route', 'Intramuscular', 'Inyeccion intramuscular', '{}', 3),
    ('intravenosa', 'medication_route', 'Intravenosa', 'Inyeccion intravenosa', '{}', 4),
    ('topica', 'medication_route', 'Topica', 'Aplicacion en piel', '{}', 5),
    ('oftalmica', 'medication_route', 'Oftalmica', 'Aplicacion en ojos', '{}', 6),
    ('otica', 'medication_route', 'Otica', 'Aplicacion en oidos', '{}', 7),
    ('cada_8h', 'medication_frequency', 'Cada 8 horas', '3 veces al dia', '{"hours": 8}', 1),
    ('cada_12h', 'medication_frequency', 'Cada 12 horas', '2 veces al dia', '{"hours": 12}', 2),
    ('cada_24h', 'medication_frequency', 'Cada 24 horas', '1 vez al dia', '{"hours": 24}', 3),
    ('prn', 'medication_frequency', 'Segun necesidad', 'Cuando sea necesario', '{"hours": 0}', 4),
    ('leve', 'severity', 'Leve', 'Condicion leve', '{"level": 1}', 1),
    ('moderado', 'severity', 'Moderado', 'Condicion moderada', '{"level": 2}', 2),
    ('grave', 'severity', 'Grave', 'Condicion grave', '{"level": 3}', 3),
    ('critico', 'severity', 'Critico', 'Condicion critica', '{"level": 4}', 4),
    ('pendiente', 'appointment_status', 'Pendiente', 'Cita pendiente de confirmar', '{}', 1),
    ('confirmada', 'appointment_status', 'Confirmada', 'Cita confirmada', '{}', 2),
    ('en_curso', 'appointment_status', 'En Curso', 'Cita en progreso', '{}', 3),
    ('completada', 'appointment_status', 'Completada', 'Cita finalizada', '{}', 4),
    ('cancelada', 'appointment_status', 'Cancelada', 'Cita cancelada', '{}', 5),
    ('no_asistio', 'appointment_status', 'No Asistio', 'Paciente no se presento', '{}', 6)
  ) AS v(code, type, name, description, value, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM system_parameters sp 
    WHERE sp.tenant_id = p_tenant_id AND sp.type = v.type AND sp.code = v.code
  );
END;
$$;
