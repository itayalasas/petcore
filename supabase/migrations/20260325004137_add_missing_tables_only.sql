/*
  # Agregar Tablas Faltantes

  1. owners - tabla de dueños de mascotas
  2. order_items - items de órdenes
  3. payments - tabla de pagos
*/

-- Tabla de dueños
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_owners_tenant ON owners(tenant_id);

-- Actualizar tabla pets para relacionar con owners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE pets ADD COLUMN owner_id uuid REFERENCES owners(id) ON DELETE SET NULL;
    CREATE INDEX idx_pets_owner ON pets(owner_id);
  END IF;
END $$;

-- Tabla de items de orden
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  payment_date timestamptz DEFAULT now(),
  reference text,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- RLS Policies para owners
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owners' AND policyname = 'Users can view owners in their tenant') THEN
    CREATE POLICY "Users can view owners in their tenant"
      ON owners FOR SELECT
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owners' AND policyname = 'Users can insert owners') THEN
    CREATE POLICY "Users can insert owners"
      ON owners FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owners' AND policyname = 'Users can update owners') THEN
    CREATE POLICY "Users can update owners"
      ON owners FOR UPDATE
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owners' AND policyname = 'Users can delete owners') THEN
    CREATE POLICY "Users can delete owners"
      ON owners FOR DELETE
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;
END $$;

-- RLS Policies para order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view order items') THEN
    CREATE POLICY "Users can view order items"
      ON order_items FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.tenant_id = get_user_tenant(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can insert order items') THEN
    CREATE POLICY "Users can insert order items"
      ON order_items FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.tenant_id = get_user_tenant(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can update order items') THEN
    CREATE POLICY "Users can update order items"
      ON order_items FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.tenant_id = get_user_tenant(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can delete order items') THEN
    CREATE POLICY "Users can delete order items"
      ON order_items FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.tenant_id = get_user_tenant(auth.uid())
        )
      );
  END IF;
END $$;

-- RLS Policies para payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can view payments') THEN
    CREATE POLICY "Users can view payments"
      ON payments FOR SELECT
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can insert payments') THEN
    CREATE POLICY "Users can insert payments"
      ON payments FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can update payments') THEN
    CREATE POLICY "Users can update payments"
      ON payments FOR UPDATE
      TO authenticated
      USING (tenant_id = get_user_tenant(auth.uid()));
  END IF;
END $$;

-- Función para generar número de orden
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_number text;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE tenant_id = p_tenant_id
  AND created_at >= date_trunc('year', CURRENT_DATE);
  
  v_number := 'ORD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD((v_count + 1)::text, 5, '0');
  
  RETURN v_number;
END;
$$;
