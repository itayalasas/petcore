# Arquitectura Multi-Tenant SaaS

## Resumen

Esta aplicación está diseñada como una plataforma SaaS multi-tenant completa, permitiendo que múltiples organizaciones (clínicas veterinarias, tiendas de mascotas, etc.) utilicen la misma infraestructura de forma aislada y segura.

## Principios Fundamentales de Multi-Tenancy

### 1. Acceso Estrictamente Basado en Tenant

**REGLA CRÍTICA**: La aplicación NO permite acceso sin un tenant válido.

- Los usuarios NO autenticados ven la Landing Page
- Los usuarios autenticados SIN tenant ven un mensaje de error y opción para crear organización
- Los usuarios autenticados CON tenant acceden a la aplicación completa

### 2. Flujo de Acceso

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario Accede                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                 ¿Usuario Autenticado?
                          │
          ┌───────────────┴───────────────┐
          │                               │
          NO                             SI
          │                               │
          ▼                               ▼
   ┌──────────────┐              ¿Tiene Tenant?
   │ Landing Page │                      │
   │  - Login     │      ┌───────────────┴───────────────┐
   │  - Registro  │      │                               │
   └──────────────┘     NO                              SI
                        │                               │
                        ▼                               ▼
              ┌────────────────────┐         ┌──────────────────┐
              │ TenantGuard        │         │ Aplicación       │
              │ - Sin Tenant       │         │ - Dashboard      │
              │ - Crear Org        │         │ - Módulos        │
              │ - O Invitación     │         │ - Configuración  │
              └────────────────────┘         └──────────────────┘
```

### 3. Componentes de Control

#### TenantGuard (`src/components/TenantGuard.tsx`)
Componente que protege el acceso a la aplicación:

```typescript
// Verifica que el usuario tenga un tenant válido
<TenantGuard onNoTenant={() => mostrarRegistroOrganización()}>
  <Aplicacion />
</TenantGuard>
```

**Estados que maneja:**
- **Loading**: Muestra spinner mientras carga información de tenants
- **Sin Tenant**: Muestra mensaje y opción para crear organización
- **Con Tenant**: Permite acceso a la aplicación

#### TenantContext (`src/contexts/TenantContext.tsx`)
Proporciona el contexto de tenant a toda la aplicación:

```typescript
const {
  currentTenant,      // Tenant activo
  tenants,           // Todos los tenants del usuario
  subscription,      // Información de suscripción
  canAddUser,        // Verificar límites
  canAddPet,         // Verificar límites
  hasFeature         // Verificar características
} = useTenant();
```

## Modelo de Datos

### Tabla `tenants` (Organizaciones)

Cada tenant representa una organización independiente:

```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,                    -- Nombre de la organización
  slug text NOT NULL UNIQUE,             -- Identificador único para URLs
  domain text UNIQUE,                    -- Dominio personalizado (opcional)
  subscription_status text,              -- trial, active, suspended, cancelled
  subscription_plan text,                -- basic, professional, enterprise
  max_users integer DEFAULT 5,           -- Límite de usuarios
  max_pets integer DEFAULT 100,          -- Límite de mascotas
  is_active boolean DEFAULT true,
  ...
)
```

### Tabla `tenant_members` (Usuarios por Tenant)

Relación muchos a muchos entre usuarios y tenants:

```sql
CREATE TABLE tenant_members (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES profiles(id),
  role text,                            -- owner, admin, veterinarian, staff, member, viewer
  permissions jsonb,                    -- Permisos específicos
  is_active boolean DEFAULT true,
  ...
)
```

### Roles Disponibles

- **owner**: Control total del tenant, puede eliminar la organización
- **admin**: Administración completa, gestión de usuarios y configuración
- **veterinarian**: Acceso completo a mascotas y salud
- **staff**: Empleado con permisos limitados
- **member**: Acceso básico de lectura/escritura
- **viewer**: Solo lectura

### Tablas Multi-Tenant

Todas estas tablas incluyen `tenant_id`:

- `profiles` - Usuarios (pueden pertenecer a múltiples tenants)
- `pets` - Mascotas
- `pet_health` - Historial médico
- `partners` - Proveedores/Aliados
- `bookings` - Reservas de servicios
- `orders` - Órdenes de compra

## Seguridad: Row Level Security (RLS)

### Políticas RLS

Todas las tablas tienen políticas RLS que garantizan:

1. **Aislamiento de datos**: Los usuarios solo pueden ver datos de sus tenants
2. **Control de acceso por rol**: Diferentes permisos según el rol
3. **Prevención de acceso cruzado**: Imposible acceder a datos de otros tenants

### Ejemplo de Política RLS para Pets

```sql
CREATE POLICY "Users can view pets in their tenant"
  ON pets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

## Implementación en Frontend

### TenantProvider Context

El contexto de React `TenantProvider` gestiona:

```typescript
interface TenantContextType {
  currentTenant: Tenant | null;        // Tenant actualmente seleccionado
  tenants: Tenant[];                   // Lista de tenants del usuario
  currentMembership: TenantMember | null;  // Membresía actual con rol
  switchTenant: (tenantId: string) => Promise<void>;  // Cambiar tenant
  hasPermission: (permission: string) => boolean;     // Verificar permisos
  isAdmin: () => boolean;              // Verificar si es admin
  isOwner: () => boolean;              // Verificar si es owner
}
```

### Uso en Componentes

```typescript
import { useTenant } from '../contexts/TenantContext';

function MyComponent() {
  const { currentTenant, isAdmin } = useTenant();

  // Pasar tenant_id a servicios
  const pets = await petsService.getAllPets(currentTenant.id);

  // Verificar permisos
  if (isAdmin()) {
    // Mostrar opciones de admin
  }
}
```

### Servicios con Tenant

Todos los servicios aceptan `tenantId` opcional:

```typescript
export const petsService = {
  async getAllPets(tenantId?: string) {
    let query = supabase.from('pets').select('*');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    return data;
  }
}
```

## Flujo de Trabajo Multi-Tenant

### 1. Registro de Usuario

1. Usuario se registra en la aplicación
2. Se crea perfil en `profiles`
3. Se puede crear un nuevo tenant o ser invitado a uno existente

### 2. Creación de Tenant

```typescript
const tenant = await tenantsService.createTenant({
  name: "Veterinaria Central",
  slug: "vet-central",
  subscription_plan: "professional"
});
```

Esto automáticamente:
- Crea el tenant
- Agrega al usuario creador como `owner`
- Inicia período de prueba de 30 días

### 3. Invitar Usuarios

```typescript
await tenantsService.addMember({
  tenant_id: currentTenant.id,
  user_id: "usuario-uuid",
  role: "veterinarian"
});
```

### 4. Operaciones CRUD

Todas las operaciones incluyen automáticamente el `tenant_id`:

```typescript
// Crear mascota
const pet = await petsService.createPet({
  tenant_id: currentTenant.id,  // Automático
  name: "Max",
  species: "dog",
  owner_id: "owner-uuid"
});

// Las políticas RLS verifican automáticamente que:
// 1. El usuario pertenece al tenant
// 2. El tenant_id coincide
```

## Planes de Suscripción

### Basic
- 5 usuarios
- 100 mascotas
- Funcionalidades básicas

### Professional
- 50 usuarios
- 1000 mascotas
- Reportes avanzados
- Integraciones

### Enterprise
- Usuarios ilimitados
- Mascotas ilimitadas
- Soporte prioritario
- Customización

## Límites y Validación

El sistema valida automáticamente:

```typescript
const stats = await tenantsService.getTenantStats(tenantId);

// Verificar límites
if (stats.pets >= currentTenant.max_pets) {
  throw new Error('Límite de mascotas alcanzado');
}

if (stats.users >= currentTenant.max_users) {
  throw new Error('Límite de usuarios alcanzado');
}
```

## Cambio de Tenant

Los usuarios pueden pertenecer a múltiples tenants y cambiar entre ellos:

```typescript
const { switchTenant } = useTenant();

// Cambiar a otro tenant
await switchTenant('otro-tenant-id');

// Los datos se recargan automáticamente para el nuevo tenant
```

## Migraciones y Actualizaciones

### Agregar Tenant a Tablas Existentes

Para tablas nuevas, siempre incluir:

```sql
CREATE TABLE nueva_tabla (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ...
);

-- Índice para performance
CREATE INDEX idx_nueva_tabla_tenant_id ON nueva_tabla(tenant_id);

-- RLS
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view data in their tenant"
  ON nueva_tabla FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

## Funciones Helper de Base de Datos

### get_user_tenant_id()

Obtiene el tenant_id del usuario actual:

```sql
SELECT get_user_tenant_id();
```

### user_belongs_to_tenant(tenant_id)

Verifica si el usuario pertenece a un tenant:

```sql
SELECT user_belongs_to_tenant('tenant-uuid');
```

## Mejores Prácticas

1. **Siempre pasar tenant_id**: Todos los servicios deben recibir y validar tenant_id
2. **Usar RLS**: Nunca confiar solo en lógica de aplicación
3. **Validar límites**: Verificar límites antes de crear recursos
4. **Índices**: Crear índices en tenant_id para performance
5. **Cascadas**: Usar ON DELETE CASCADE para limpieza automática
6. **Logs de auditoría**: Registrar cambios importantes con tenant_id

## Monitoreo y Analytics

### Métricas por Tenant

```typescript
const stats = await tenantsService.getTenantStats(tenantId);
// Retorna: { pets, users, bookings }
```

### Uso de Recursos

Monitorear:
- Número de mascotas vs límite
- Número de usuarios vs límite
- Uso de almacenamiento
- Actividad de usuarios

## Escalabilidad

La arquitectura multi-tenant permite:

1. **Escala horizontal**: Agregar más tenants sin cambios
2. **Aislamiento**: Problemas de un tenant no afectan otros
3. **Personalización**: Cada tenant puede tener configuración única
4. **Análisis**: Métricas agregadas y por tenant

## Próximos Pasos

- [ ] Implementar facturación automatizada
- [ ] Agregar dominios personalizados
- [ ] Sistema de invitaciones por email
- [ ] Panel de administración de tenants
- [ ] Reportes de uso por tenant
- [ ] Límites de API por tenant
