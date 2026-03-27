# Sistema de Licenciamiento Multi-Tenant

## Descripción General

El sistema implementa un modelo de suscripción completo con tres planes de licenciamiento que controlan automáticamente límites, características y acceso a funcionalidades según el plan seleccionado. La activación efectiva del tenant ya no se administra desde la empresa cliente: ahora la emite el propietario de la aplicación desde una consola de plataforma separada.

## Planes Disponibles

### 1. Basic (Gratis)
- **Precio**: $0/mes
- **Período de prueba**: 30 días
- **Límites**:
  - 5 usuarios
  - 100 mascotas
- **Características**:
  - Funcionalidades básicas
  - Soporte por email
  - Reportes básicos

### 2. Professional ($49/mes)
- **Precio**: $49/mes
- **Período de prueba**: 30 días
- **Límites**:
  - 50 usuarios
  - 1000 mascotas
- **Características**:
  - Todas las funcionalidades
  - Soporte prioritario
  - Reportes avanzados
  - Integraciones API
  - Personalización de marca

### 3. Enterprise (Personalizado)
- **Precio**: Contactar ventas
- **Período de prueba**: No aplica
- **Límites**:
  - Usuarios ilimitados
  - Mascotas ilimitadas
- **Características**:
  - Funcionalidades premium
  - Soporte 24/7
  - Analytics avanzado
  - Consultoría dedicada
  - SLA garantizado
  - Dominio personalizado

## Arquitectura de Base de Datos

### Tablas

#### `module_catalog`
Catálogo central de módulos licenciables en la aplicación.

```sql
- module_key (text, primary key)
- display_name (text)
- description (text)
- category (text)
- is_core (boolean) - Módulos que siempre están habilitados
- default_enabled (boolean)
- sort_order (integer)
```

#### `plan_module_licenses`
Define qué módulos quedan habilitados por defecto según el plan contratado.

```sql
- id (uuid)
- plan_id (uuid)
- module_key (text)
- is_enabled (boolean)
```

#### `tenant_module_entitlements`
Permite emitir activaciones o bloqueos específicos por tenant, por encima del default del plan. Solo puede ser modificada por administradores de plataforma.

```sql
- id (uuid)
- tenant_id (uuid)
- module_key (text)
- is_enabled (boolean)
- managed_by (uuid)
- notes (text)
```

#### `platform_admins`
Usuarios del propietario de la aplicación autorizados para gestionar billing y licencias globales.

```sql
- user_id (uuid)
- email (text)
- display_name (text)
- role (text) - 'platform_owner', 'platform_admin', 'billing_admin'
- is_active (boolean)
```

#### `subscription_plans`
Almacena la definición de los planes de suscripción disponibles.

```sql
- id (uuid)
- name (text) - 'basic', 'professional', 'enterprise'
- display_name (text)
- description (text)
- price_monthly (numeric)
- max_users (integer) - -1 para ilimitados
- max_pets (integer) - -1 para ilimitados
- features (jsonb) - Características del plan
- is_active (boolean)
- trial_days (integer)
```

#### `tenant_subscriptions`
Relaciona cada tenant con su plan de suscripción activo.

```sql
- id (uuid)
- tenant_id (uuid)
- plan_id (uuid)
- status (text) - 'trial', 'active', 'suspended', 'cancelled'
- trial_ends_at (timestamptz)
- current_period_start (timestamptz)
- current_period_end (timestamptz)
- cancelled_at (timestamptz)
```

### Funciones de Base de Datos

#### `check_subscription_limit(tenant_id, limit_type, current_count)`
Verifica si un tenant puede agregar más recursos (usuarios o mascotas) según su plan actual.

```sql
SELECT check_subscription_limit(
  'tenant-uuid',
  'users',  -- o 'pets'
  5         -- cantidad actual
);
```

#### `get_tenant_subscription(tenant_id)`
Obtiene la información completa de suscripción de un tenant.

```sql
SELECT * FROM get_tenant_subscription('tenant-uuid');
```

#### `is_module_licensed(tenant_id, module_key)`
Resuelve si un módulo está habilitado para el tenant combinando:
1. módulos core,
2. plan activo,
3. entitlements emitidos por plataforma.

```sql
SELECT is_module_licensed('tenant-uuid', 'salud');
```

#### `get_tenant_module_licenses(tenant_id)`
Devuelve el estado efectivo de todos los módulos para un tenant, indicando si el origen es `core`, `plan`, `platform_entitlement` o `none`.

```sql
SELECT * FROM get_tenant_module_licenses('tenant-uuid');
```

## Servicios de Licenciamiento

### `src/services/licensing.ts`

Provee funciones para gestionar suscripciones y verificar límites:

#### Funciones principales:

**Gestión de Planes**
- `getAllPlans()` - Obtiene todos los planes disponibles
- `getTenantSubscription(tenantId)` - Obtiene la suscripción completa de un tenant
- `getTenantSubscriptionInfo(tenantId)` - Obtiene información resumida de la suscripción

**Verificación de Límites**
- `checkSubscriptionLimit(tenantId, limitType, currentCount)` - Verifica límites genéricos
- `canAddUser(tenantId, currentUserCount)` - Verifica si se puede agregar un usuario
- `canAddPet(tenantId, currentPetCount)` - Verifica si se puede agregar una mascota

**Verificación de Características**
- `hasFeature(tenantId, featureName)` - Verifica si el plan tiene una característica específica

**Licenciamiento Modular**
- `getTenantModuleLicenses(tenantId)` - Obtiene el estado efectivo de módulos por tenant
- `getCurrentPlatformAdmin()` - Resuelve si el usuario autenticado pertenece a la consola de plataforma
- `getPlatformTenantSummaries()` - Lista tenants con snapshot de plan/estado para operación centralizada
- `updatePlatformTenantModuleEntitlement(tenantId, moduleKey, isEnabled)` - Emite o actualiza un entitlement por módulo
- `clearPlatformTenantModuleEntitlement(tenantId, moduleKey)` - Elimina el entitlement y vuelve al comportamiento del plan
- `updatePlatformTenantSubscription(tenantId, updates)` - Actualiza plan/estado desde plataforma y sincroniza el snapshot del tenant

**Administración de Suscripciones**
- `createTenantSubscription(tenantId, planName)` - Crea una nueva suscripción
- `updateTenantSubscription(tenantId, planName)` - Actualiza el plan de suscripción
- `cancelSubscription(tenantId)` - Cancela una suscripción
- `isSubscriptionActive(tenantId)` - Verifica si la suscripción está activa

## Contexto de Tenant

### `src/contexts/TenantContext.tsx`

El contexto de tenant se actualizó para incluir información de suscripción:

```typescript
const {
  subscription,        // Información de la suscripción actual
  moduleLicenses,      // Estado efectivo de licencias por módulo
  canAddUser,         // Función para verificar límite de usuarios
  canAddPet,          // Función para verificar límite de mascotas
  hasFeature,         // Función para verificar características
  hasModuleAccess,    // Verifica si un módulo está licenciado para el tenant
  refreshModuleLicenses,
  getMaxUsers,        // Obtiene el límite máximo de usuarios
  getMaxPets          // Obtiene el límite máximo de mascotas
} = useTenant();
```

## Integración Frontend

### Sidebar y render de vistas
- La navegación lateral solo muestra módulos con permiso y licencia activa.
- Aunque un usuario intente navegar manualmente a una vista, la aplicación hace fallback al dashboard si el módulo no está licenciado.

### Permisos + licencias
- `PermissionsProvider` ahora combina permisos del rol con licenciamiento modular.
- Un usuario puede tener permiso funcional sobre un módulo, pero si la licencia del tenant está inactiva, el acceso se bloquea igual.

### Gestión en UI
- `Configuración > Licencias` quedó en modo informativo para usuarios tenant.
- La edición real vive en `Consola plataforma`, un shell separado y no visible para usuarios tenant.
- La consola plataforma puede cambiar plan y estado de suscripción, además de emitir o limpiar entitlements por módulo.

### Validación de acceso
- El tenant resuelve sus módulos activos al iniciar sesión y cargar `TenantContext`.
- Si la suscripción está suspendida o cancelada, los módulos no core quedan bloqueados aunque el usuario tenga permisos funcionales.
- Si existe un entitlement de plataforma para un módulo, ese entitlement prevalece sobre el plan.

## Autenticación de administradores de plataforma

La tabla `platform_admins` no crea usuarios de autenticación ni almacena contraseñas. Esa tabla solo autoriza a un usuario que ya existe en `auth.users` para ver y operar la consola global.

### Flujo correcto

1. Crear primero el usuario en Supabase Auth (`auth.users`) con email y contraseña.
2. Tomar el `id` real de ese usuario autenticable.
3. Insertar ese mismo `id` en `platform_admins`.
4. Iniciar sesión con el login normal de la aplicación.
5. Al autenticarse, la app detecta `platform_admins` y habilita la `Consola plataforma`.

### Importante

- Si insertas un UUID en `platform_admins` que no existe en `auth.users`, ese registro no sirve para iniciar sesión.
- La contraseña siempre vive en Supabase Auth, no en `platform_admins`.
- No necesitas un login aparte para plataforma: se usa el mismo login de la app.
- Si el usuario es `platform_admin` y no tiene tenant, la app lo lleva a la consola global.

### Ejemplo recomendado

1. Crear usuario en Auth con email `admin@petcare.com`.
2. Obtener su `auth.users.id`.
3. Registrar el acceso global:

```sql
insert into platform_admins (
  user_id,
  email,
  display_name,
  role,
  is_active
) values (
  'EL-ID-REAL-DE-AUTH-USERS',
  'admin@petcare.com',
  'Owner App',
  'platform_owner',
  true
);
```

## Verificaciones Automáticas

### Creación de Mascotas
El servicio `petsService.createPet()` verifica automáticamente el límite antes de crear una mascota:

```typescript
const pet = await petsService.createPet({
  tenant_id: currentTenant.id,
  name: 'Rex',
  // ... otros datos
});
// Lanza error si se excede el límite del plan
```

### Creación de Usuarios
El servicio `tenantsService.addMember()` verifica automáticamente el límite antes de agregar un usuario:

```typescript
const member = await tenantsService.addMember({
  tenant_id: currentTenant.id,
  user_id: newUserId,
  role: 'member'
});
// Lanza error si se excede el límite del plan
```

## Componentes UI

### `PricingPlans`
Componente para mostrar y seleccionar planes de suscripción.

```typescript
import PricingPlans from './components/ui/PricingPlans';

<PricingPlans
  onSelectPlan={(planName) => handlePlanSelection(planName)}
  selectedPlan="basic"
  showTrialBadge={true}
/>
```

### `SubscriptionCard`
Componente para mostrar la información de suscripción actual y permitir cambios.

```typescript
import SubscriptionCard from './components/ui/SubscriptionCard';

<SubscriptionCard />
```

## Flujo de Registro

1. Usuario completa información de la empresa
2. Usuario completa información del administrador
3. Usuario selecciona un plan de suscripción
4. El sistema:
   - Crea el usuario en Supabase Auth
   - Crea el tenant con el plan seleccionado
   - Crea el perfil del usuario
   - Crea la membresía del usuario al tenant
   - **Crea la suscripción del tenant al plan seleccionado**

## Características del Plan

Los features se almacenan en formato JSONB y pueden incluir:

```json
{
  "has_basic_features": true,
  "has_all_features": true,
  "has_premium_features": false,
  "has_email_support": true,
  "has_priority_support": false,
  "has_24_7_support": false,
  "has_basic_reports": true,
  "has_advanced_reports": false,
  "has_advanced_analytics": false,
  "has_api_integrations": false,
  "has_branding": false,
  "has_dedicated_consulting": false,
  "has_sla": false,
  "has_custom_domain": false
}
```

## Mensajes de Error

Cuando se alcanza un límite, el sistema lanza errores descriptivos:

- **Límite de usuarios**: "Has alcanzado el límite de usuarios para tu plan actual. Actualiza tu suscripción para agregar más usuarios."
- **Límite de mascotas**: "Has alcanzado el límite de mascotas para tu plan actual. Actualiza tu suscripción para agregar más mascotas."

## Seguridad (RLS)

### subscription_plans
- Todos los usuarios autenticados pueden ver planes activos
- Solo el service role puede modificar planes

### tenant_subscriptions
- Los usuarios solo pueden ver la suscripción de su tenant
- Solo admins del tenant pueden actualizar la suscripción
- El sistema puede crear suscripciones durante el registro

## Próximos Pasos Recomendados

1. Integrar procesamiento de pagos (Stripe)
2. Agregar notificaciones de vencimiento de trial
3. Implementar downgrade/upgrade automático
4. Crear dashboard de métricas de uso
5. Agregar límites de almacenamiento de archivos
6. Implementar límites de API calls para planes con API
