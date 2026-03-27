/*
  # Schema Multi-Tenant Completo para Sistema de Mascotas SaaS

  1. Tablas Core
    - `tenants` - Organizaciones/Clínicas
    - `tenant_members` - Usuarios por tenant con roles
    - `profiles` - Perfiles de usuario
    - `pets` - Mascotas (con tenant_id)
    - `pet_health` - Historial médico (con tenant_id)
    - `bookings` - Reservas de servicios (con tenant_id)
    - `orders` - Órdenes de compra (con tenant_id)
    - `partners` - Proveedores/Aliados (con tenant_id)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas que filtran por tenant_id
    - Funciones helper para verificación de tenant
*/

-- =====================================================
-- TABLAS CORE DE TENANT
-- =====================================================

-- Tabla de Tenants (Organizaciones/Clínicas)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  subscription_plan text NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
  trial_ends_at timestamptz,
  max_users integer DEFAULT 5,
  max_pets integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLAS DE USUARIOS
-- =====================================================

-- Tabla de Perfiles de Usuario
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  display_name text,
  photo_url text,
  phone text,
  is_owner boolean DEFAULT true,
  is_partner boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_delivery boolean DEFAULT false,
  location text,
  bio text,
  country_id uuid,
  department_id uuid,
  calle text,
  numero text,
  barrio text,
  codigo_postal text,
  latitud text,
  longitud text,
  email_confirmed boolean DEFAULT false,
  email_confirmed_at timestamptz,
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Miembros por Tenant (relación muchos a muchos)
CREATE TABLE tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'veterinarian', 'staff', 'member', 'viewer')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  invited_by uuid REFERENCES profiles(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- =====================================================
-- TABLAS DE MASCOTAS
-- =====================================================

-- Tabla de Mascotas
CREATE TABLE pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'other')),
  breed text NOT NULL,
  breed_info jsonb,
  age numeric,
  age_display jsonb,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  weight numeric,
  weight_display jsonb,
  color text,
  is_neutered boolean DEFAULT false,
  has_chip boolean DEFAULT false,
  chip_number text,
  photo_url text,
  personality text[] DEFAULT '{}',
  medical_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Salud de Mascotas
CREATE TABLE pet_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('vaccine', 'deworming', 'checkup', 'medication', 'illness', 'surgery', 'allergy')),
  name text,
  application_date text,
  diagnosis_date text,
  next_due_date text,
  veterinarian text,
  treatment text,
  symptoms text,
  severity text,
  product_name text,
  notes text,
  status text,
  weight text,
  weight_unit text,
  date text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLAS DE SERVICIOS Y COMERCIO
-- =====================================================

-- Tabla de Partners/Proveedores
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  business_name text NOT NULL,
  business_type text NOT NULL,
  description text,
  address text,
  phone text,
  email text,
  logo text,
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  rating numeric DEFAULT 0,
  reviews_count integer DEFAULT 0,
  features jsonb DEFAULT '{}'::jsonb,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Servicios de Partners
CREATE TABLE partner_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL,
  duration integer,
  is_active boolean DEFAULT true,
  images text[] DEFAULT '{}',
  has_cost boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Reservas/Bookings
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id),
  service_id uuid REFERENCES partner_services(id),
  service_name text NOT NULL,
  customer_id uuid NOT NULL REFERENCES profiles(id),
  customer_name text,
  customer_phone text,
  customer_email text,
  pet_id uuid NOT NULL REFERENCES pets(id),
  pet_name text,
  date timestamptz NOT NULL,
  time text,
  end_time text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Órdenes
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  pet_id uuid REFERENCES pets(id),
  items jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled')),
  total_amount numeric NOT NULL,
  shipping_address text,
  customer_name text,
  customer_email text,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX idx_pets_tenant_id ON pets(tenant_id);
CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_pet_health_tenant_id ON pet_health(tenant_id);
CREATE INDEX idx_pet_health_pet_id ON pet_health(pet_id);
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_pet_id ON bookings(pet_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_partners_tenant_id ON partners(tenant_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para obtener el tenant_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM tenant_members
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario pertenece a un tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(tenant_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_id_param
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS - TENANTS
-- =====================================================

CREATE POLICY "Users can view their own tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant owners can update their tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "System can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- POLÍTICAS RLS - TENANT MEMBERS
-- =====================================================

CREATE POLICY "Users can view members of their tenants"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can insert members"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Admins can update members"
  ON tenant_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- =====================================================
-- POLÍTICAS RLS - PROFILES
-- =====================================================

CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS - PETS
-- =====================================================

CREATE POLICY "Users can view pets in their tenant"
  ON pets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert pets in their tenant"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update pets in their tenant"
  ON pets FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete pets in their tenant"
  ON pets FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- POLÍTICAS RLS - PET HEALTH
-- =====================================================

CREATE POLICY "Users can view pet health in their tenant"
  ON pet_health FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert pet health in their tenant"
  ON pet_health FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update pet health in their tenant"
  ON pet_health FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- POLÍTICAS RLS - BOOKINGS
-- =====================================================

CREATE POLICY "Users can view bookings in their tenant"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert bookings in their tenant"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update bookings in their tenant"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Crear tenant demo
INSERT INTO tenants (name, slug, subscription_status, subscription_plan, max_users, max_pets)
VALUES ('Demo Veterinaria', 'demo-vet', 'active', 'professional', 50, 1000);
