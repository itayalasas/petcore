# Solución de Recursión Infinita en RLS

## Problema Detectado

El sistema estaba generando un error crítico al intentar registrar nuevas empresas o acceder a datos de tenants:

```
Error: infinite recursion detected in policy for relation "tenant_members"
```

## Causa Raíz

Las políticas de Row Level Security (RLS) en las tablas `tenant_members` y `tenants` estaban creando una **recursión infinita**:

### Ejemplo del Problema

```sql
-- Esta política causaba el problema:
CREATE POLICY "Users can view members of their tenants"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members  -- ¡Consulta recursiva!
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

**¿Por qué causa recursión?**

1. Usuario intenta leer `tenant_members`
2. PostgreSQL evalúa la política RLS
3. La política consulta `tenant_members` para verificar permisos
4. Esta consulta activa la misma política RLS
5. Vuelve al paso 2 → Recursión infinita

### Tablas Afectadas

- `tenant_members` - Recursión directa (se consultaba a sí misma)
- `tenants` - Consultaba `tenant_members`, que tenía recursión
- `tenant_subscriptions` - Consultaba `tenant_members`
- Todas las demás tablas con `tenant_id` - Consultaban `tenant_members`

## Solución Implementada

### 1. Función Helper con SECURITY DEFINER

Creamos una función que **rompe la cadena de recursión** usando `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER  -- ¡Clave! Ejecuta sin RLS
STABLE
AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
  AND is_active = true;
$$;
```

**¿Cómo funciona `SECURITY DEFINER`?**

- La función se ejecuta con los privilegios del creador (superusuario)
- **Bypasea las políticas RLS** durante su ejecución
- Rompe el ciclo de recursión
- Es segura porque solo retorna datos del usuario actual (`auth.uid()`)

### 2. Nuevas Políticas RLS Sin Recursión

#### tenant_members

```sql
-- Política 1: Ver propias membresías (sin consultas adicionales)
CREATE POLICY "Users can view own memberships"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());  -- Directo, sin recursión

-- Política 2: Ver otros miembros (usa función helper)
CREATE POLICY "Users can view tenant members"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));  -- ¡Sin recursión!
```

#### tenants

```sql
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_tenant_ids()));  -- Usa helper
```

#### Todas las demás tablas

```sql
-- Ejemplo con pets
CREATE POLICY "Users can view pets in their tenant"
  ON pets FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- El patrón se repite para:
-- - profiles
-- - pet_health
-- - bookings
-- - orders
-- - partners
-- - tenant_subscriptions
```

## Migraciones Aplicadas

### 1. `fix_rls_infinite_recursion.sql`

- Elimina políticas problemáticas
- Crea función `get_user_tenant_ids()`
- Implementa nuevas políticas para `tenant_members`, `tenants` y `tenant_subscriptions`

### 2. `update_all_rls_policies_to_use_helper.sql`

- Actualiza todas las políticas RLS existentes
- Reemplaza consultas directas con llamadas a `get_user_tenant_ids()`
- Asegura consistencia en todo el sistema

## Ventajas de la Nueva Implementación

### 1. Sin Recursión

✅ Las políticas no se llaman a sí mismas
✅ La función helper rompe la cadena de dependencias
✅ PostgreSQL puede evaluar las políticas sin entrar en bucle

### 2. Mejor Rendimiento

✅ `SECURITY DEFINER` ejecuta sin overhead de RLS
✅ Función marcada como `STABLE` permite caching dentro de la transacción
✅ Una sola consulta optimizada en lugar de múltiples evaluaciones recursivas

### 3. Mantenibilidad

✅ Lógica centralizada en una función
✅ Cambios futuros solo requieren actualizar la función
✅ Políticas más simples y fáciles de entender

### 4. Seguridad Mantenida

✅ Solo retorna tenants del usuario autenticado
✅ Usa `auth.uid()` que es seguro y verificado por Supabase
✅ No expone datos de otros usuarios
✅ Mantiene el aislamiento multi-tenant

## Verificación

Para verificar que las políticas funcionan correctamente:

```sql
-- Como usuario autenticado, deberías ver solo tus tenants
SELECT * FROM tenants;

-- Deberías ver tus membresías y las de tus tenants
SELECT * FROM tenant_members;

-- Deberías ver solo mascotas de tus tenants
SELECT * FROM pets;

-- Si intentas acceder a un tenant que no es tuyo, retorna vacío
SELECT * FROM pets WHERE tenant_id = 'otro-tenant-id';
```

## Casos de Prueba Exitosos

Después de la corrección, estos flujos funcionan correctamente:

1. ✅ **Registro de nueva empresa**
   - Crea tenant
   - Crea usuario
   - Crea membresía
   - Crea suscripción

2. ✅ **Login de usuario existente**
   - Carga sus tenants
   - Carga información de suscripciones
   - Accede solo a sus datos

3. ✅ **Cambio entre tenants**
   - Usuario con múltiples tenants puede cambiar
   - Datos se filtran automáticamente por tenant activo

4. ✅ **Creación de recursos**
   - Crear mascotas (verifica límites)
   - Agregar usuarios (verifica límites)
   - Todas las operaciones respetan RLS

## Lecciones Aprendidas

### ❌ Evitar

```sql
-- NO hacer esto (recursión):
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (
    column IN (SELECT column FROM table_name WHERE ...)
  );
```

### ✅ Usar

```sql
-- Opción 1: Función SECURITY DEFINER
CREATE FUNCTION helper() RETURNS SETOF type
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ... FROM table_name WHERE ...
$$;

CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (column IN (SELECT helper()));

-- Opción 2: Comparación directa (cuando sea posible)
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (user_id = auth.uid());
```

## Conclusión

El problema de recursión infinita se ha resuelto completamente mediante:

1. Identificación de políticas recursivas
2. Creación de función helper con `SECURITY DEFINER`
3. Actualización de todas las políticas RLS
4. Verificación de funcionamiento

El sistema ahora opera correctamente con **aislamiento multi-tenant completo** y **sin problemas de recursión**.
