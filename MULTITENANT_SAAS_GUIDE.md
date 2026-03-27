# Guía Completa: Sistema Multi-Tenant SaaS

## Concepto Fundamental

En un sistema **SaaS Multi-Tenant**, NO se registran usuarios individuales. Se registran **EMPRESAS/ORGANIZACIONES** que se convierten en tenants del sistema.

### ¿Qué es un Tenant?

Un **tenant** es una organización/empresa cliente que:
- Tiene su propio espacio aislado en la aplicación
- Gestiona sus propios usuarios internos
- Tiene su propia configuración y datos
- Paga por el servicio (suscripción)
- Está completamente aislado de otros tenants

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────┐
│         PLATAFORMA SAAS (PetCare)          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  Tenant A    │  │  Tenant B    │        │
│  │  Vet Central │  │  Vet Norte   │        │
│  ├──────────────┤  ├──────────────┤        │
│  │ Owner/Admin  │  │ Owner/Admin  │        │
│  │ User 1       │  │ User 1       │        │
│  │ User 2       │  │ User 2       │        │
│  │ User 3       │  │ User 3       │        │
│  │              │  │              │        │
│  │ Mascotas     │  │ Mascotas     │        │
│  │ Clientes     │  │ Clientes     │        │
│  │ Datos        │  │ Datos        │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

## Flujo de Registro Correcto

### 1. Landing Page Pública

**URL**: `petcare.com`

**Botones disponibles:**
- "Registrar empresa" → Abre registro de organización
- "Iniciar sesión" → Para usuarios existentes

**Importante:**
- NO hay registro de usuarios individuales
- Solo se pueden registrar empresas/organizaciones
- Los usuarios solo pueden ser creados DESPUÉS de que existe un tenant

### 2. Registro de Empresa (3 Pasos)

#### **Paso 1: Información de la Empresa**

Datos requeridos:
```
- Nombre de la empresa (ej: "Veterinaria Central")
- Slug único (ej: "vet-central") → URL: app.petcare.com/vet-central
- Industria/Sector (veterinaria, pet shop, etc.)
- Tamaño de la empresa (1-5, 6-10, 11-25, etc.)
```

**Validaciones:**
- Nombre no vacío
- Slug único en toda la base de datos
- Slug solo con letras minúsculas, números y guiones
- Industria y tamaño seleccionados

#### **Paso 2: Administrador Principal**

Datos del representante legal/admin principal:
```
- Nombre completo
- Email corporativo
- Cargo/Posición (Director, Gerente, etc.)
- Contraseña
```

**Importante:**
- Este es el PRIMER usuario del tenant
- Tendrá rol de "owner" (propietario)
- Puede crear/gestionar otros usuarios
- No puede ser eliminado mientras sea el único owner

#### **Paso 3: Selección de Plan**

Planes disponibles:
```
- Basic: Gratis 30 días (5 usuarios, 100 mascotas)
- Professional: $49/mes (50 usuarios, 1000 mascotas)
- Enterprise: Personalizado (ilimitado)
```

**Características:**
- Trial gratuito en todos los planes
- Sin tarjeta de crédito para trial
- Se puede cambiar el plan después

### 3. Proceso Técnico de Registro

```typescript
// 1. Crear usuario en Supabase Auth
const { data: authData } = await supabase.auth.signUp({
  email: adminData.email,
  password: adminData.password,
  options: {
    data: {
      display_name: adminData.fullName,
      position: adminData.position
    }
  }
});

// 2. Crear el TENANT (la empresa)
const { data: tenant } = await supabase
  .from('tenants')
  .insert({
    name: companyData.name,
    slug: companyData.slug,
    subscription_status: 'trial',
    subscription_plan: planData.plan,
    trial_ends_at: +30 días,
    settings: {
      industry: companyData.industry,
      company_size: companyData.size,
      max_users: según plan,
      max_pets: según plan
    }
  })
  .select()
  .single();

// 3. Crear perfil del admin
await supabase.from('profiles').insert({
  id: authData.user.id,
  email: adminData.email,
  display_name: adminData.fullName,
  is_owner: true,
  tenant_id: tenant.id,
  metadata: {
    position: adminData.position,
    is_primary_admin: true
  }
});

// 4. Crear membresía de owner
await supabase.from('tenant_members').insert({
  tenant_id: tenant.id,
  user_id: authData.user.id,
  role: 'owner',
  is_active: true,
  joined_at: now()
});

// 5. Redireccionar a la aplicación
```

### 4. Primera Sesión del Admin

Después del registro, el admin:

1. **Ve pantalla de éxito**: "Organización Creada"
2. **Es redirigido automáticamente** a la aplicación
3. **Tiene acceso completo** como owner
4. **Puede comenzar a configurar**:
   - Crear usuarios del equipo
   - Configurar sucursales
   - Agregar mascotas y clientes
   - Personalizar ajustes

## Gestión de Usuarios por el Admin

### Roles Disponibles

```typescript
type Role = 'owner' | 'admin' | 'veterinarian' | 'receptionist' | 'groomer';
```

**Owner (Propietario):**
- Acceso total
- Gestiona suscripción y facturación
- Crea/edita/elimina usuarios
- Configura integraciones
- No puede ser eliminado (debe transferir ownership primero)

**Admin (Administrador):**
- Acceso casi total
- Gestiona usuarios (excepto owners)
- Configura módulos
- Ve reportes completos
- No puede cancelar suscripción

**Veterinarian (Veterinario):**
- Gestiona mascotas y salud
- Crea consultas y tratamientos
- Actualiza historial médico
- Ve sus propias citas

**Receptionist (Recepcionista):**
- Gestiona citas
- Registra clientes y mascotas
- Procesa pagos
- Ve agenda general

**Groomer (Peluquero):**
- Gestiona citas de grooming
- Registra servicios realizados
- Ve inventario de productos

### Crear Usuarios (Solo Admin/Owner)

El admin puede crear usuarios en:
**Administración → Usuarios → Nuevo Usuario**

Formulario:
```
- Nombre completo
- Email
- Rol (seleccionar del dropdown)
- Sucursal asignada (opcional)
- Estado: Activo/Inactivo
```

**Proceso:**
1. Admin completa formulario
2. Sistema crea usuario en auth.users
3. Se envía email de bienvenida con contraseña temporal
4. Usuario debe cambiar contraseña en primer login
5. Usuario queda asociado al tenant del admin

### Invitar Usuarios (Alternativa)

Flujo de invitación:
1. Admin envía invitación por email
2. Usuario recibe link único
3. Usuario completa su registro (nombre, contraseña)
4. Usuario queda asociado automáticamente al tenant

## Login de Usuarios

### Usuarios Existentes

**URL**: `petcare.com` → Click "Iniciar sesión"

**Proceso:**
```
1. Ingresa email y contraseña
2. Sistema valida credenciales
3. Sistema obtiene tenant_id del usuario
4. Carga contexto del tenant
5. Redirecciona a dashboard
```

**Importante:**
- NO pueden crear una cuenta por su cuenta
- Deben ser creados/invitados por un admin
- Solo pueden pertenecer a UN tenant (en esta implementación)
- Si no tienen cuenta, deben contactar a su admin

### Múltiples Tenants (Funcionalidad Avanzada)

Si un usuario pertenece a múltiples organizaciones:

```typescript
// En tenant_members
user_id: "abc-123"
tenant_id: "tenant-1" (Vet Central)
role: "admin"

user_id: "abc-123"
tenant_id: "tenant-2" (Vet Norte)
role: "veterinarian"
```

**Flujo:**
1. Usuario hace login
2. Sistema detecta múltiples tenants
3. Muestra selector: "¿A qué organización deseas acceder?"
4. Usuario selecciona tenant
5. Se carga contexto del tenant seleccionado
6. Usuario puede cambiar de tenant desde el header

## Aislamiento de Datos (RLS)

### Row Level Security Policies

Cada tabla tiene políticas que garantizan aislamiento:

```sql
-- Ejemplo: Tabla de mascotas
CREATE POLICY "Users can only see pets from their tenant"
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

**Resultado:**
- Usuario de Tenant A NUNCA puede ver datos de Tenant B
- Queries automáticamente filtradas por tenant_id
- Imposible acceder a datos de otros tenants, incluso con SQL directo

## Ciclo de Vida del Tenant

### 1. Trial (Prueba)

```typescript
subscription_status: 'trial'
trial_ends_at: +30 días
```

**Características:**
- Acceso completo a funcionalidades del plan
- Sin cobro
- 30 días de duración
- Recordatorios antes de vencer

### 2. Active (Activo)

```typescript
subscription_status: 'active'
payment_method: configurado
next_billing_date: fecha próximo cobro
```

**Características:**
- Acceso completo
- Cobro recurrente
- Puede actualizar/downgrade plan

### 3. Suspended (Suspendido)

```typescript
subscription_status: 'suspended'
```

**Razones:**
- Pago rechazado
- Problemas de facturación
- Admin suspendió temporalmente

**Acceso:**
- Solo lectura
- No puede crear/editar
- Puede exportar datos

### 4. Cancelled (Cancelado)

```typescript
subscription_status: 'cancelled'
cancelled_at: fecha
data_retention_until: +90 días
```

**Proceso:**
1. Owner cancela suscripción
2. Datos se mantienen 90 días
3. Usuario puede reactivar en esos 90 días
4. Después de 90 días: datos se eliminan

## Comparación: Modelo Incorrecto vs Correcto

### ❌ Modelo Incorrecto (Usuario Individual)

```
1. Usuario se registra con email/password
2. Se crea usuario en auth
3. Usuario crea "su tenant"
4. Usuario es el único del tenant
```

**Problemas:**
- No es un modelo B2B SaaS
- No representa una empresa
- Difícil gestionar equipos
- No tiene sentido facturar a "usuarios individuales"

### ✅ Modelo Correcto (Empresa/Organización)

```
1. EMPRESA se registra
2. Se crea TENANT (la empresa)
3. Se crea admin principal
4. Admin invita/crea usuarios de su equipo
5. Todos los usuarios pertenecen al tenant
```

**Ventajas:**
- Modelo B2B real
- Representa organizaciones
- Fácil gestionar equipos
- Facturación por organización
- Escalable

## Mejores Prácticas

### 1. Siempre Pensar en "Tenant First"

❌ Incorrecto:
```typescript
// Obtener TODAS las mascotas
const { data } = await supabase
  .from('pets')
  .select('*');
```

✅ Correcto:
```typescript
// Obtener mascotas DEL TENANT actual
const { data } = await supabase
  .from('pets')
  .select('*')
  .eq('tenant_id', currentTenant.id);
```

**Nota:** Con RLS bien configurado, esto se hace automático.

### 2. Validar Permisos por Rol

```typescript
// Verificar si usuario puede crear otros usuarios
const canManageUsers = ['owner', 'admin'].includes(userRole);

if (!canManageUsers) {
  throw new Error('No tienes permisos para esta acción');
}
```

### 3. Limitar por Plan

```typescript
// Verificar límites del plan
const { data: userCount } = await supabase
  .from('tenant_members')
  .select('id', { count: 'exact' })
  .eq('tenant_id', tenantId);

if (userCount >= currentTenant.settings.max_users) {
  throw new Error('Has alcanzado el límite de usuarios de tu plan');
}
```

### 4. Logs de Auditoría

```typescript
// Registrar acciones importantes
await supabase.from('audit_logs').insert({
  tenant_id: tenantId,
  user_id: userId,
  action: 'user_created',
  details: { new_user_id, role },
  ip_address: req.ip,
  timestamp: new Date()
});
```

## Casos de Uso Comunes

### Usuario Cambia de Organización

**Escenario:** Veterinario trabaja en 2 clínicas diferentes

```typescript
// Usuario tiene 2 membresías
tenant_members:
  - tenant_id: "clinic-a", role: "veterinarian"
  - tenant_id: "clinic-b", role: "admin"

// Flujo de cambio
1. Usuario hace login
2. Ve selector de organizaciones
3. Selecciona "Clínica A"
4. TenantContext carga datos de Clínica A
5. Usuario ve datos SOLO de Clínica A
```

### Transfer de Ownership

**Escenario:** Dueño original vende la empresa

```typescript
1. Owner actual designa nuevo owner
2. Sistema valida que nuevo usuario existe
3. Se cambia role del nuevo usuario a "owner"
4. Owner anterior baja a "admin"
5. Se notifica a ambos usuarios
```

### Downgrade de Plan

**Escenario:** Empresa reduce de Professional a Basic

```typescript
1. Verificar que cumple límites de Basic:
   - Usuarios actuales <= 5
   - Mascotas actuales <= 100

2. Si NO cumple:
   - Mostrar error
   - "Debes reducir a 5 usuarios primero"

3. Si cumple:
   - Actualizar plan
   - Ajustar facturación
   - Enviar confirmación
```

## Seguridad

### 1. Nunca Confiar en el Cliente

```typescript
// ❌ NUNCA hacer esto
const tenantId = req.body.tenant_id; // ¡Usuario puede modificar esto!

// ✅ Siempre obtener de sesión
const { data: { user } } = await supabase.auth.getUser();
const { data: member } = await supabase
  .from('tenant_members')
  .select('tenant_id')
  .eq('user_id', user.id)
  .single();

const tenantId = member.tenant_id;
```

### 2. Validar Pertenencia al Tenant

```typescript
// Antes de cualquier operación
const userBelongsToTenant = await supabase
  .from('tenant_members')
  .select('id')
  .eq('user_id', userId)
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .maybeSingle();

if (!userBelongsToTenant) {
  throw new Error('Unauthorized');
}
```

### 3. Encriptar Datos Sensibles

```typescript
// Ejemplo: Datos de pago
settings: {
  payment_method_encrypted: encrypt(cardData),
  billing_email: email
}
```

## Resumen

**Sistema Multi-Tenant SaaS = Plataforma para EMPRESAS, no usuarios individuales**

**Flujo Correcto:**
1. Empresa se registra → Crea tenant
2. Primer usuario (admin) se crea con el tenant
3. Admin gestiona usuarios de su equipo
4. Cada usuario pertenece a un tenant
5. Datos completamente aislados por tenant
6. Facturación a nivel de tenant/empresa

**Nunca:**
- Permitir registro de usuarios individuales sin tenant
- Dar acceso antes de crear el tenant
- Mezclar datos entre tenants
- Confiar en datos del cliente para tenant_id
- Saltarse validaciones de límites de plan
