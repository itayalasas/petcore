# Flujo de Acceso Multi-Tenant

## Descripción General

El sistema implementa un **control de acceso estricto basado en tenant**. Ningún usuario puede acceder a la aplicación sin estar asociado a una organización (tenant) válida.

## Estados de Acceso

### 1. Usuario No Autenticado

**Vista**: Landing Page
**Ubicación**: `src/components/landing/LandingPage.tsx`

El usuario ve:
- Descripción del producto
- Características principales
- Planes de suscripción
- Botones de "Registrar Empresa" y "Iniciar Sesión"

**Acciones disponibles:**
- Registrar nueva empresa → Abre `CompanyRegistrationModal`
- Iniciar sesión → Abre `LoginModal`

### 2. Usuario Autenticado SIN Tenant

**Vista**: Pantalla de error de TenantGuard
**Ubicación**: `src/components/TenantGuard.tsx`

El usuario ve:
- Mensaje: "Sin Organización Asociada"
- Explicación de que necesita crear o ser invitado a una organización
- Botón "Crear Nueva Organización"
- Nota sobre invitaciones pendientes

**Acciones disponibles:**
- Crear nueva organización → Abre `CompanyRegistrationModal`
- Esperar invitación de un administrador

**Casos comunes:**
- Usuario que se registró directamente sin pasar por el flujo de empresa
- Usuario removido de todas sus organizaciones
- Usuario cuya membresía fue desactivada

### 3. Usuario Autenticado CON Tenant

**Vista**: Aplicación completa
**Ubicación**: Dashboard y módulos

El usuario ve:
- Header con selector de tenant (si tiene múltiples)
- Sidebar con navegación
- Dashboard o módulo activo
- Información de suscripción del tenant

**Acciones disponibles:**
- Navegar por todos los módulos permitidos por su rol
- Cambiar entre tenants (si tiene membresía en múltiples)
- Acceder a configuración según permisos

## Flujo de Registro de Nueva Empresa

### Paso 1: Información de la Empresa
```
Campos requeridos:
- Nombre de la empresa
- Slug (identificador único)
- Industria
- Tamaño de la empresa

Validación:
✓ Slug único en el sistema
✓ Todos los campos completos
```

### Paso 2: Información del Administrador
```
Campos requeridos:
- Nombre completo
- Email corporativo
- Cargo/Posición
- Contraseña (mínimo 6 caracteres)

Acciones:
✓ Crea usuario en Supabase Auth
✓ Crea perfil en tabla profiles
```

### Paso 3: Selección de Plan
```
Planes disponibles:
- Basic (Gratis - 30 días prueba)
- Professional ($49/mes)
- Enterprise (Personalizado)

Funcionalidad:
✓ Muestra características de cada plan
✓ Resumen del registro
```

### Paso 4: Creación Automática
```
El sistema crea automáticamente:
1. Usuario en Supabase Auth
2. Tenant (organización)
3. Perfil del usuario
4. Membresía del usuario al tenant (rol: owner)
5. Suscripción del tenant al plan seleccionado

Resultado:
→ Recarga la aplicación
→ TenantGuard detecta el nuevo tenant
→ Usuario accede a la aplicación
```

## Flujo de Login

### Usuario Existente con Tenant
```
1. Usuario ingresa email y contraseña
2. Supabase Auth valida credenciales
3. App.tsx actualiza estado de usuario
4. TenantProvider carga tenants del usuario
5. TenantGuard verifica tenant válido
6. Usuario accede a la aplicación
```

### Usuario Existente SIN Tenant
```
1. Usuario ingresa email y contraseña
2. Supabase Auth valida credenciales
3. App.tsx actualiza estado de usuario
4. TenantProvider intenta cargar tenants → Sin resultados
5. TenantGuard detecta ausencia de tenant
6. Muestra pantalla "Sin Organización Asociada"
7. Usuario debe crear organización o esperar invitación
```

## Verificaciones de Seguridad

### Row Level Security (RLS)

Todas las tablas con `tenant_id` tienen políticas RLS que:

```sql
-- Ejemplo: Tabla pets
CREATE POLICY "Users can only access their tenant's pets"
  ON pets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );
```

**Esto garantiza:**
- Los usuarios solo ven datos de sus tenants
- Las consultas sin tenant_id son automáticamente filtradas
- Imposible acceder a datos de otros tenants

### Verificación en Frontend

```typescript
// TenantGuard.tsx verifica:
if (!currentTenant || tenants.length === 0) {
  // Bloquea acceso a la aplicación
  return <PantallaSinTenant />;
}

// Cada operación verifica el tenant actual:
const pets = await petsService.getAllPets(currentTenant.id);
```

## Cambio de Tenant

Los usuarios pueden pertenecer a múltiples tenants:

```typescript
// Desde el Header
const { switchTenant, tenants } = useTenant();

// Cambiar de tenant
await switchTenant(nuevoTenantId);

// La aplicación:
1. Actualiza currentTenant en el contexto
2. Recarga la suscripción del nuevo tenant
3. Actualiza localStorage
4. Re-renderiza toda la aplicación con el nuevo contexto
```

## Manejo de Invitaciones

### Invitar Usuario a Tenant

```typescript
// Admin del tenant invita usuario
await tenantsService.addMember({
  tenant_id: currentTenant.id,
  user_id: usuarioInvitado.id,
  role: 'staff'
});

// Verifica límite de usuarios del plan
if (!canAddUser) {
  throw Error('Límite de usuarios alcanzado');
}
```

### Usuario Acepta Invitación

```
1. Usuario recibe notificación/email
2. Usuario inicia sesión
3. TenantProvider detecta nueva membresía
4. Usuario puede cambiar a ese tenant desde el selector
```

## Casos Especiales

### Usuario Removido de Tenant

```
Escenario: Admin desactiva membresía de un usuario

Efecto:
1. tenant_members.is_active = false
2. Usuario pierde acceso a ese tenant
3. Si era su único tenant:
   → TenantGuard bloquea acceso
   → Muestra pantalla "Sin Organización"
4. Si tiene otros tenants:
   → Cambia automáticamente a otro tenant disponible
```

### Suscripción Expirada

```
Escenario: Período de prueba termina sin actualizar plan

Efecto:
1. tenant_subscriptions.status = 'suspended'
2. Usuario mantiene acceso (vista de solo lectura)
3. Banner de advertencia en toda la aplicación
4. Algunas funcionalidades deshabilitadas

Solución:
- Admin actualiza plan de suscripción
- Status cambia a 'active'
- Funcionalidad completa restaurada
```

### Límites de Plan Alcanzados

```
Escenario: Tenant alcanza límite de usuarios/mascotas

Efecto:
1. petsService.createPet() o tenantsService.addMember() lanza error
2. Modal/Toast muestra mensaje de error
3. Sugiere actualizar plan

Mensaje:
"Has alcanzado el límite de [usuarios/mascotas] para tu plan actual.
Actualiza tu suscripción para agregar más."
```

## Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────────┐
│                         INICIO                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Verificar     │
            │  Auth State    │
            └────────┬───────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌─────────┐            ┌─────────────┐
   │   NO    │            │     SI      │
   │  AUTH   │            │   AUTH      │
   └────┬────┘            └──────┬──────┘
        │                        │
        ▼                        ▼
   ┌─────────────┐      ┌──────────────────┐
   │  Landing    │      │  Cargar Tenants  │
   │   Page      │      └────────┬─────────┘
   └─────────────┘               │
                        ┌────────┴────────┐
                        │                 │
                        ▼                 ▼
                   ┌─────────┐       ┌─────────┐
                   │ Tiene   │       │   No    │
                   │ Tenant  │       │ Tiene   │
                   └────┬────┘       └────┬────┘
                        │                 │
                        ▼                 ▼
                   ┌─────────┐       ┌──────────────┐
                   │  App    │       │ TenantGuard  │
                   │  Full   │       │   Bloqueado  │
                   └─────────┘       └──────────────┘
```

## Archivos Clave

| Archivo | Responsabilidad |
|---------|----------------|
| `src/App.tsx` | Control principal de autenticación y renderizado |
| `src/components/TenantGuard.tsx` | Verificación de tenant válido |
| `src/contexts/TenantContext.tsx` | Gestión de estado de tenant y suscripción |
| `src/components/auth/CompanyRegistrationModal.tsx` | Registro de nueva empresa |
| `src/components/auth/LoginModal.tsx` | Login de usuarios existentes |
| `src/components/landing/LandingPage.tsx` | Página de bienvenida |

## Conclusión

El sistema garantiza que:

1. **Sin tenant, no hay acceso** a la aplicación
2. **Todos los datos están aislados** por tenant
3. **Los límites de suscripción** se aplican automáticamente
4. **La seguridad es multicapa**: RLS en BD + Guards en frontend
5. **El flujo es intuitivo**: Landing → Registro → Aplicación

Este diseño asegura una verdadera arquitectura multi-tenant donde cada organización opera de forma completamente independiente y segura.
