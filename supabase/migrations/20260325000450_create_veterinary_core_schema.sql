/*
  # Veterinary Core Management System Schema

  ## Overview
  Complete schema for veterinary clinic management including medical records,
  consultations, inventory, POS, and appointments.

  ## New Tables

  ### 1. services
  Catalog of veterinary services (vaccinations, surgeries, consultations, etc.)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `name` (text) - Service name
  - `description` (text) - Service description
  - `category` (text) - Service category
  - `price` (decimal) - Base price
  - `duration_minutes` (integer) - Estimated duration
  - `is_active` (boolean) - Service availability
  - `requires_appointment` (boolean) - Needs scheduling
  - `created_at`, `updated_at` (timestamptz)

  ### 2. medical_records
  Medical history entries for each pet
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `pet_id` (uuid, foreign key to pets)
  - `date` (date) - Record date
  - `record_type` (text) - Type: consultation, vaccination, surgery, etc.
  - `title` (text) - Record title
  - `description` (text) - Detailed notes
  - `veterinarian_id` (uuid, foreign key to profiles)
  - `attachments` (jsonb) - Files, images, documents
  - `created_at`, `updated_at` (timestamptz)

  ### 3. consultations
  Veterinary consultation sessions
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `pet_id` (uuid, foreign key to pets)
  - `veterinarian_id` (uuid, foreign key to profiles)
  - `appointment_id` (uuid, optional, foreign key to appointments)
  - `date` (timestamptz) - Consultation date
  - `reason` (text) - Visit reason
  - `symptoms` (text) - Observed symptoms
  - `diagnosis` (text) - Diagnosis
  - `treatment` (text) - Treatment plan
  - `prescriptions` (jsonb) - Prescribed medications
  - `weight` (decimal) - Pet weight at visit
  - `temperature` (decimal) - Body temperature
  - `heart_rate` (integer) - Heart rate
  - `notes` (text) - Additional notes
  - `status` (text) - Status: in_progress, completed, cancelled
  - `total_amount` (decimal) - Total consultation cost
  - `created_at`, `updated_at` (timestamptz)

  ### 4. products
  Inventory products (medications, food, accessories)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `sku` (text) - Stock keeping unit
  - `barcode` (text) - Product barcode
  - `category` (text) - Product category
  - `brand` (text) - Brand name
  - `price` (decimal) - Sale price
  - `cost` (decimal) - Cost price
  - `stock` (integer) - Current stock
  - `min_stock` (integer) - Minimum stock alert level
  - `unit` (text) - Unit of measure
  - `is_active` (boolean) - Product availability
  - `requires_prescription` (boolean) - Needs prescription
  - `image_url` (text) - Product image
  - `created_at`, `updated_at` (timestamptz)

  ### 5. sales
  POS sales transactions
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `sale_number` (text) - Sequential sale number
  - `customer_id` (uuid, optional, foreign key to profiles if client)
  - `pet_id` (uuid, optional, foreign key to pets)
  - `consultation_id` (uuid, optional, foreign key to consultations)
  - `sale_date` (timestamptz) - Transaction date
  - `subtotal` (decimal) - Subtotal before tax
  - `tax` (decimal) - Tax amount
  - `discount` (decimal) - Discount amount
  - `total` (decimal) - Final total
  - `payment_method` (text) - cash, card, transfer, etc.
  - `payment_status` (text) - pending, paid, cancelled
  - `notes` (text) - Sale notes
  - `cashier_id` (uuid, foreign key to profiles)
  - `created_at`, `updated_at` (timestamptz)

  ### 6. sale_items
  Individual items in a sale
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `sale_id` (uuid, foreign key to sales)
  - `item_type` (text) - product or service
  - `product_id` (uuid, optional, foreign key to products)
  - `service_id` (uuid, optional, foreign key to services)
  - `description` (text) - Item description
  - `quantity` (integer) - Quantity sold
  - `unit_price` (decimal) - Price per unit
  - `subtotal` (decimal) - Line subtotal
  - `discount` (decimal) - Line discount
  - `total` (decimal) - Line total
  - `created_at` (timestamptz)

  ### 7. appointments
  Scheduled appointments
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `pet_id` (uuid, foreign key to pets)
  - `owner_id` (uuid, foreign key to profiles)
  - `veterinarian_id` (uuid, optional, foreign key to profiles)
  - `service_id` (uuid, optional, foreign key to services)
  - `appointment_date` (timestamptz) - Scheduled date/time
  - `duration_minutes` (integer) - Appointment duration
  - `reason` (text) - Appointment reason
  - `status` (text) - scheduled, confirmed, in_progress, completed, cancelled, no_show
  - `notes` (text) - Appointment notes
  - `reminder_sent` (boolean) - Reminder notification sent
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies ensure tenant isolation
  - Users can only access data from their tenant
*/

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  is_active boolean DEFAULT true,
  requires_appointment boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(tenant_id, category);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services in their tenant"
  ON services FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Admins can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  record_type text NOT NULL,
  title text NOT NULL,
  description text,
  veterinarian_id uuid REFERENCES profiles(id),
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_tenant ON medical_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_pet ON medical_records(tenant_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(tenant_id, date DESC);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medical records in their tenant"
  ON medical_records FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete medical records"
  ON medical_records FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Appointments table (must be created before consultations due to foreign key)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id),
  veterinarian_id uuid REFERENCES profiles(id),
  service_id uuid REFERENCES services(id),
  appointment_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(tenant_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_pet ON appointments(tenant_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_veterinarian ON appointments(tenant_id, veterinarian_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(tenant_id, status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appointments in their tenant"
  ON appointments FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  veterinarian_id uuid NOT NULL REFERENCES profiles(id),
  appointment_id uuid REFERENCES appointments(id),
  date timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  symptoms text,
  diagnosis text,
  treatment text,
  prescriptions jsonb DEFAULT '[]'::jsonb,
  weight decimal(6,2),
  temperature decimal(4,1),
  heart_rate integer,
  notes text,
  status text NOT NULL DEFAULT 'in_progress',
  total_amount decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_tenant ON consultations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultations_pet ON consultations(tenant_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_veterinarian ON consultations(tenant_id, veterinarian_id);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consultations in their tenant"
  ON consultations FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert consultations"
  ON consultations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update consultations"
  ON consultations FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete consultations"
  ON consultations FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  category text NOT NULL,
  brand text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer DEFAULT 10,
  unit text DEFAULT 'unit',
  is_active boolean DEFAULT true,
  requires_prescription boolean DEFAULT false,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(tenant_id, name);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products in their tenant"
  ON products FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_number text NOT NULL,
  customer_id uuid REFERENCES profiles(id),
  pet_id uuid REFERENCES pets(id),
  consultation_id uuid REFERENCES consultations(id),
  sale_date timestamptz NOT NULL DEFAULT now(),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  cashier_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sale_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(tenant_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(tenant_id, payment_status);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales in their tenant"
  ON sales FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  product_id uuid REFERENCES products(id),
  service_id uuid REFERENCES services(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  discount decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_tenant ON sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_service ON sale_items(service_id);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale items in their tenant"
  ON sale_items FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Staff can update sale items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete sale items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Function to generate sale numbers
CREATE OR REPLACE FUNCTION generate_sale_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_sale_number text;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM sales
  WHERE tenant_id = p_tenant_id
    AND DATE(sale_date) = CURRENT_DATE;
  
  v_sale_number := 'SALE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 4, '0');
  
  RETURN v_sale_number;
END;
$$;

-- Trigger to update stock after sale
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock = stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();
