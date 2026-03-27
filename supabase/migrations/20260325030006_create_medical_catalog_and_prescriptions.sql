/*
  # Medical Catalog and Prescription System

  ## Overview
  Complete system for managing veterinary medications, diagnoses, treatments, and prescriptions.

  ## New Tables

  ### 1. medications
  Catalog of available medications
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `name` (text) - Medication name
  - `generic_name` (text) - Generic/scientific name
  - `category` (text) - Medication category (antibiotic, anti-inflammatory, etc.)
  - `description` (text) - Description and usage
  - `dosage_forms` (text) - Available forms (tablet, syrup, injection, etc.)
  - `manufacturer` (text) - Manufacturer name
  - `requires_prescription` (boolean) - Needs veterinary prescription
  - `warnings` (text) - Warnings and contraindications
  - `storage_instructions` (text) - Storage requirements
  - `is_active` (boolean) - Medication availability
  - `created_at`, `updated_at` (timestamptz)

  ### 2. diagnoses
  Catalog of common veterinary diagnoses
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `code` (text) - Diagnosis code
  - `name` (text) - Diagnosis name
  - `category` (text) - Category (infectious, metabolic, trauma, etc.)
  - `description` (text) - Detailed description
  - `symptoms` (text) - Common symptoms
  - `recommended_tests` (text) - Recommended diagnostic tests
  - `is_active` (boolean) - Diagnosis availability
  - `created_at`, `updated_at` (timestamptz)

  ### 3. treatments
  Catalog of treatment protocols
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `name` (text) - Treatment name
  - `category` (text) - Category
  - `description` (text) - Treatment description
  - `protocol` (text) - Detailed protocol steps
  - `duration_days` (integer) - Typical duration
  - `frequency` (text) - Application frequency
  - `is_active` (boolean) - Treatment availability
  - `created_at`, `updated_at` (timestamptz)

  ### 4. prescriptions
  Issued prescriptions during consultations
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `consultation_id` (uuid, foreign key to consultations)
  - `pet_id` (uuid, foreign key to pets)
  - `medication_id` (uuid, optional, foreign key to medications)
  - `medication_name` (text) - Medication name (if not from catalog)
  - `dosage` (text) - Dosage instructions
  - `frequency` (text) - How often to administer
  - `duration_days` (integer) - Treatment duration
  - `quantity` (text) - Quantity prescribed
  - `route` (text) - Administration route (oral, topical, injection, etc.)
  - `instructions` (text) - Special instructions
  - `start_date` (date) - When to start
  - `end_date` (date) - When to end
  - `veterinarian_id` (uuid, foreign key to profiles)
  - `status` (text) - active, completed, discontinued
  - `notes` (text) - Additional notes
  - `created_at`, `updated_at` (timestamptz)

  ### 5. consultation_diagnoses
  Link diagnoses to consultations (many-to-many)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `consultation_id` (uuid, foreign key to consultations)
  - `diagnosis_id` (uuid, optional, foreign key to diagnoses)
  - `diagnosis_name` (text) - Diagnosis name (if not from catalog)
  - `notes` (text) - Specific notes for this diagnosis
  - `is_primary` (boolean) - Is this the primary diagnosis
  - `created_at` (timestamptz)

  ### 6. consultation_treatments
  Link treatments to consultations (many-to-many)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `consultation_id` (uuid, foreign key to consultations)
  - `treatment_id` (uuid, optional, foreign key to treatments)
  - `treatment_name` (text) - Treatment name (if not from catalog)
  - `instructions` (text) - Specific instructions
  - `start_date` (date) - When to start
  - `end_date` (date) - When to end
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies ensure tenant isolation
  - Users can only access data from their tenant
*/

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  generic_name text,
  category text NOT NULL,
  description text,
  dosage_forms text,
  manufacturer text,
  requires_prescription boolean DEFAULT true,
  warnings text,
  storage_instructions text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_tenant ON medications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medications_category ON medications(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(tenant_id, name);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medications in their tenant"
  ON medications FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete medications"
  ON medications FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  symptoms text,
  recommended_tests text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_tenant ON diagnoses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_category ON diagnoses(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON diagnoses(tenant_id, code);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view diagnoses in their tenant"
  ON diagnoses FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert diagnoses"
  ON diagnoses FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update diagnoses"
  ON diagnoses FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete diagnoses"
  ON diagnoses FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Treatments table
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  protocol text,
  duration_days integer,
  frequency text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatments_tenant ON treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(tenant_id, category);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view treatments in their tenant"
  ON treatments FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert treatments"
  ON treatments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update treatments"
  ON treatments FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete treatments"
  ON treatments FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id),
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration_days integer,
  quantity text,
  route text NOT NULL DEFAULT 'oral',
  instructions text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  veterinarian_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet ON prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medication ON prescriptions(medication_id);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prescriptions in their tenant"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete prescriptions"
  ON prescriptions FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Consultation diagnoses table
CREATE TABLE IF NOT EXISTS consultation_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  diagnosis_id uuid REFERENCES diagnoses(id),
  diagnosis_name text NOT NULL,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_tenant ON consultation_diagnoses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_consultation ON consultation_diagnoses(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_diagnosis ON consultation_diagnoses(diagnosis_id);

ALTER TABLE consultation_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consultation diagnoses in their tenant"
  ON consultation_diagnoses FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert consultation diagnoses"
  ON consultation_diagnoses FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update consultation diagnoses"
  ON consultation_diagnoses FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete consultation diagnoses"
  ON consultation_diagnoses FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Consultation treatments table
CREATE TABLE IF NOT EXISTS consultation_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id),
  treatment_name text NOT NULL,
  instructions text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_treatments_tenant ON consultation_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultation_treatments_consultation ON consultation_treatments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_treatments_treatment ON consultation_treatments(treatment_id);

ALTER TABLE consultation_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consultation treatments in their tenant"
  ON consultation_treatments FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert consultation treatments"
  ON consultation_treatments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update consultation treatments"
  ON consultation_treatments FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete consultation treatments"
  ON consultation_treatments FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Insert sample medications
INSERT INTO medications (tenant_id, name, generic_name, category, description, dosage_forms, requires_prescription)
SELECT 
  t.id,
  'Amoxicilina',
  'Amoxicillin',
  'Antibiótico',
  'Antibiótico de amplio espectro para infecciones bacterianas',
  'Tableta, Suspensión',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM medications m WHERE m.tenant_id = t.id AND m.name = 'Amoxicilina'
);

INSERT INTO medications (tenant_id, name, generic_name, category, description, dosage_forms, requires_prescription)
SELECT 
  t.id,
  'Carprofeno',
  'Carprofen',
  'Anti-inflamatorio',
  'AINE para alivio del dolor y la inflamación',
  'Tableta',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM medications m WHERE m.tenant_id = t.id AND m.name = 'Carprofeno'
);

INSERT INTO medications (tenant_id, name, generic_name, category, description, dosage_forms, requires_prescription)
SELECT 
  t.id,
  'Prednisolona',
  'Prednisolone',
  'Corticosteroide',
  'Corticosteroide para alergias e inflamación',
  'Tableta, Suspensión',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM medications m WHERE m.tenant_id = t.id AND m.name = 'Prednisolona'
);

-- Insert sample diagnoses
INSERT INTO diagnoses (tenant_id, code, name, category, description, symptoms)
SELECT 
  t.id,
  'INF001',
  'Otitis Externa',
  'Infección',
  'Inflamación del canal auditivo externo',
  'Rascado de orejas, sacudida de cabeza, mal olor, enrojecimiento'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM diagnoses d WHERE d.tenant_id = t.id AND d.code = 'INF001'
);

INSERT INTO diagnoses (tenant_id, code, name, category, description, symptoms)
SELECT 
  t.id,
  'GAS001',
  'Gastroenteritis Aguda',
  'Gastrointestinal',
  'Inflamación del tracto gastrointestinal',
  'Vómitos, diarrea, pérdida de apetito, letargia'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM diagnoses d WHERE d.tenant_id = t.id AND d.code = 'GAS001'
);

INSERT INTO diagnoses (tenant_id, code, name, category, description, symptoms)
SELECT 
  t.id,
  'DERM001',
  'Dermatitis Alérgica',
  'Dermatológico',
  'Reacción alérgica de la piel',
  'Picazón, enrojecimiento, pérdida de pelo, lesiones'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM diagnoses d WHERE d.tenant_id = t.id AND d.code = 'DERM001'
);

-- Insert sample treatments
INSERT INTO treatments (tenant_id, name, category, description, protocol, duration_days, frequency)
SELECT 
  t.id,
  'Tratamiento de Otitis',
  'Infección',
  'Protocolo para tratar otitis externa',
  'Limpieza auricular + antibiótico tópico + antiinflamatorio',
  14,
  'Cada 12 horas'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM treatments tr WHERE tr.tenant_id = t.id AND tr.name = 'Tratamiento de Otitis'
);

INSERT INTO treatments (tenant_id, name, category, description, protocol, duration_days, frequency)
SELECT 
  t.id,
  'Tratamiento de Gastroenteritis',
  'Gastrointestinal',
  'Protocolo para tratar gastroenteritis aguda',
  'Ayuno 12-24h + dieta blanda + probióticos + protector gástrico',
  5,
  'Cada 8 horas'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM treatments tr WHERE tr.tenant_id = t.id AND tr.name = 'Tratamiento de Gastroenteritis'
);
