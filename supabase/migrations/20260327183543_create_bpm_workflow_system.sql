/*
  # BPM Workflow System - Core Schema

  1. New Tables
    - `employees` - Staff members who can be assigned to work
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, reference to tenants)
      - `profile_id` (uuid, reference to profiles)
      - `employee_code` (text, unique per tenant)
      - `department` (text) - veterinary, grooming, store, laboratory, etc.
      - `specializations` (text[]) - list of specializations
      - `is_active` (boolean)
      
    - `employee_schedules` - Working hours per employee
      - `id` (uuid, primary key)
      - `employee_id` (uuid, reference to employees)
      - `day_of_week` (int, 0=Sunday to 6=Saturday)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      
    - `employee_services` - Which services each employee can provide
      - `id` (uuid, primary key)
      - `employee_id` (uuid, reference to employees)
      - `service_id` (uuid, reference to services)
      - `is_primary` (boolean) - main provider for this service
      
    - `cases` - Patient cases that can span multiple appointments/services
      - `id` (uuid, primary key)
      - `tenant_id` (uuid)
      - `case_number` (text, unique per tenant)
      - `pet_id` (uuid)
      - `owner_id` (uuid)
      - `status` (text) - open, in_progress, pending_referral, completed, cancelled
      - `priority` (text) - low, normal, high, urgent
      - `chief_complaint` (text)
      - `created_by` (uuid)
      - `assigned_to` (uuid, employee)
      - `department` (text)
      
    - `referrals` - Inter-department transfers
      - `id` (uuid, primary key)
      - `tenant_id` (uuid)
      - `case_id` (uuid)
      - `from_department` (text)
      - `to_department` (text)
      - `from_employee_id` (uuid)
      - `to_employee_id` (uuid, nullable until assigned)
      - `reason` (text)
      - `urgency` (text) - routine, urgent, emergency
      - `status` (text) - pending, accepted, in_progress, completed, rejected
      - `notes` (text)
      - `scheduled_date` (timestamptz)
      
    - `case_activities` - Activity log for cases
      - `id` (uuid, primary key)
      - `case_id` (uuid)
      - `activity_type` (text) - note, status_change, referral, appointment, service
      - `description` (text)
      - `performed_by` (uuid)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Policies for tenant-based access
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id),
  employee_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  department text NOT NULL DEFAULT 'general',
  specializations text[] DEFAULT '{}',
  hire_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, employee_code)
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees tenant isolation"
  ON employees FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Employee schedules
CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  location_id uuid REFERENCES locations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, day_of_week, location_id)
);

ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee schedules tenant isolation"
  ON employee_schedules FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Employee services (which services each employee can provide)
CREATE TABLE IF NOT EXISTS employee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee services tenant isolation"
  ON employee_services FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Cases (patient cases spanning multiple services)
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_number text NOT NULL,
  pet_id uuid NOT NULL REFERENCES pets(id),
  owner_id uuid REFERENCES owners(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_referral', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  chief_complaint text,
  diagnosis_summary text,
  department text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES employees(id),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, case_number)
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cases tenant isolation"
  ON cases FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Referrals (inter-department transfers)
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referral_number text NOT NULL,
  case_id uuid REFERENCES cases(id),
  pet_id uuid NOT NULL REFERENCES pets(id),
  from_department text NOT NULL,
  to_department text NOT NULL,
  from_employee_id uuid REFERENCES employees(id),
  to_employee_id uuid REFERENCES employees(id),
  reason text NOT NULL,
  clinical_notes text,
  urgency text NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'scheduled', 'in_progress', 'completed', 'rejected', 'cancelled')),
  rejection_reason text,
  scheduled_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, referral_number)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals tenant isolation"
  ON referrals FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Case activities (audit log)
CREATE TABLE IF NOT EXISTS case_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('note', 'status_change', 'referral_created', 'referral_updated', 'appointment_scheduled', 'service_completed', 'assignment_changed', 'priority_changed')),
  description text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE case_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case activities tenant isolation"
  ON case_activities FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Add employee_id to appointments for assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN employee_id uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN case_id uuid REFERENCES cases(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'referral_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN referral_id uuid REFERENCES referrals(id);
  END IF;
END $$;

-- Add case_id and referral_id to pet_services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_services' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE pet_services ADD COLUMN case_id uuid REFERENCES cases(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_services' AND column_name = 'referral_id'
  ) THEN
    ALTER TABLE pet_services ADD COLUMN referral_id uuid REFERENCES referrals(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_services' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE pet_services ADD COLUMN employee_id uuid REFERENCES employees(id);
  END IF;
END $$;

-- Add case_id to consultations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE consultations ADD COLUMN case_id uuid REFERENCES cases(id);
  END IF;
END $$;

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM cases WHERE tenant_id = p_tenant_id AND case_number LIKE 'CASE-' || v_year || '-%';
  RETURN 'CASE-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$;

-- Function to generate referral numbers
CREATE OR REPLACE FUNCTION generate_referral_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM referrals WHERE tenant_id = p_tenant_id AND referral_number LIKE 'REF-' || v_year || '-%';
  RETURN 'REF-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_pet ON cases(pet_id);
CREATE INDEX IF NOT EXISTS idx_referrals_tenant ON referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_to_department ON referrals(tenant_id, to_department, status);
CREATE INDEX IF NOT EXISTS idx_case_activities_case ON case_activities(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_case ON appointments(case_id);