# Guía de Onboarding - PetCare SaaS Multi-Tenant

Esta guía explica el flujo correcto de registro de empresas en un sistema SaaS multi-tenant.

## Concepto Clave

**En un SaaS Multi-Tenant, NO se registran usuarios individuales. Se registran EMPRESAS/ORGANIZACIONES.**

Cada empresa (tenant) tiene:
- Su propio espacio aislado
- Su administrador principal
- Su equipo de usuarios
- Su suscripción y facturación
- Sus datos completamente separados de otros tenants

## Flujo de Registro de Empresa

### 1. Landing Page

**URL**: `petcare.com`

Los visitantes ven:

**Opciones disponibles:**
- **"Registrar empresa"** → Para nuevas organizaciones
- **"Iniciar sesión"** → Para usuarios existentes de empresas ya registradas

**Importante:**
- NO hay registro individual de usuarios
- Los usuarios SOLO pueden ser creados por el administrador de su empresa
- Los empleados no pueden auto-registrarse

### 2. Registro de Empresa (3 Pasos)

#### **Paso 1: Información de la Empresa**

El formulario solicita:

```
📋 Datos de la Empresa:
- Nombre de la empresa (ej: "Veterinaria Central")
- Identificador único/slug (ej: "vet-central")
  → Generará URL: app.petcare.com/vet-central
- Industria/Sector:
  * Clínica Veterinaria
  * Tienda de Mascotas
  * Peluquería / Grooming
  * Hotel para Mascotas
  * Guardería
  * Rescate Animal
  * Otro
- Tamaño de la empresa:
  * 1-5 empleados
  * 6-10 empleados
  * 11-25 empleados
  * 26-50 empleados
  * 51+ empleados
```

**Validaciones:**
- Todos los campos son obligatorios
- El slug debe ser único en toda la plataforma
- Solo se permiten letras minúsculas, números y guiones en el slug
- El slug se genera automáticamente del nombre pero puede ser editado

**Proceso técnico:**
```typescript
1. Usuario ingresa nombre de empresa
2. Sistema genera slug automáticamente
3. Usuario puede personalizar el slug
4. Al hacer clic en "Siguiente":
   - Se valida que el slug no exista
   - Si existe: muestra error
   - Si es único: avanza al Paso 2
```

#### **Paso 2: Administrador Principal**

El formulario solicita los datos del **representante legal o administrador principal**:

```
👤 Administrador Principal:
- Nombre completo
- Email corporativo
- Cargo/Posición (Director, Gerente, Veterinario Principal, etc.)
- Contraseña (mínimo 6 caracteres)
```

**Importante:**
- Esta persona será el **OWNER** de la organización
- Tendrá acceso total y control completo
- Podrá crear y gestionar usuarios
- Podrá gestionar la suscripción y facturación
- Es el representante legal de la empresa en la plataforma

**Validaciones:**
- Email válido y único
- Contraseña de mínimo 6 caracteres
- Todos los campos son obligatorios

#### **Paso 3: Selección de Plan**

El usuario selecciona el plan inicial:

**Planes disponibles:**

**🆓 Basic (Gratis - 30 días)**
- 5 usuarios
- 100 mascotas
- Funcionalidades básicas
- Soporte por email

**💼 Professional ($49/mes)**
- 50 usuarios
- 1000 mascotas
- Todas las funcionalidades
- Soporte prioritario
- Integraciones API
- Personalización de marca

**🏢 Enterprise (Personalizado)**
- Usuarios ilimitados
- Mascotas ilimitadas
- Funcionalidades premium
- Soporte 24/7
- Consultoría dedicada
- SLA garantizado
- Dominio personalizado

**Características del Trial:**
- Todos los planes incluyen trial gratuito
- Basic: 30 días
- Professional: 14 días
- Enterprise: 7 días
- NO se requiere tarjeta de crédito
- Acceso completo durante el trial

**Resumen antes de confirmar:**
```
Empresa: Veterinaria Central
Administrador: Juan Pérez
Plan: Professional
```

### 3. Proceso de Creación (Backend)

Cuando el usuario completa el registro:

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

// 2. Crear el TENANT (la organización/empresa)
const { data: tenant } = await supabase
  .from('tenants')
  .insert({
    name: companyData.name,
    slug: companyData.slug,
    subscription_status: 'trial',
    subscription_plan: planData.plan,
    trial_ends_at: new Date(+30 días),
    settings: {
      industry: companyData.industry,
      company_size: companyData.size,
      max_users: según el plan,
      max_pets: según el plan
    }
  })
  .select()
  .single();

// 3. Crear perfil del administrador
await supabase.from('profiles').insert({
  id: authData.user.id,
  email: adminData.email,
  display_name: adminData.fullName,
  is_owner: true,
  tenant_id: tenant.id,  // ← Asociado al tenant
  metadata: {
    position: adminData.position,
    is_primary_admin: true
  }
});

// 4. Crear membresía como OWNER
await supabase.from('tenant_members').insert({
  tenant_id: tenant.id,
  user_id: authData.user.id,
  role: 'owner',
  is_active: true,
  joined_at: new Date()
});

// 5. Mostrar pantalla de éxito
// 6. Redireccionar a la aplicación
```

**Orden importante:**
1. PRIMERO se crea el tenant (la empresa)
2. DESPUÉS se crea el usuario administrador
3. El usuario queda asociado al tenant desde el inicio

### 4. Pantalla de Éxito

Después de completar el registro:

```
✅ Organización Creada

Tu empresa "Veterinaria Central" ha sido
registrada exitosamente.

Redirigiendo al panel de configuración...
```

Después de 2 segundos, redirecciona automáticamente.

### 5. Primera Sesión - Dashboard

El administrador principal accede a:

**Panel de Control** con acceso completo a:
- Dashboard general
- Gestión de mascotas
- Gestión de dueños
- Salud veterinaria
- Servicios y citas
- Comercio y pagos
- Reportes
- **Administración** (crear usuarios)
- **Configuración** (ajustes del tenant)

**Primeros pasos sugeridos:**
1. Completar perfil de la empresa
2. Configurar sucursales (si aplica)
3. Crear usuarios del equipo
4. Agregar primeras mascotas/clientes
5. Personalizar ajustes

## Login de Usuarios

### Para el Administrador Principal

El owner puede hacer login en cualquier momento:

1. Ir a `petcare.com`
2. Click en "Iniciar sesión"
3. Ingresar email y contraseña
4. Acceso al dashboard

### Para Usuarios Creados por el Admin

Los empleados/usuarios del equipo:

**NO pueden auto-registrarse**. Deben:

1. Esperar a que el admin los cree
2. Recibir credenciales por email
3. Ir a `petcare.com` → "Iniciar sesión"
4. Usar credenciales proporcionadas
5. Cambiar contraseña en primer login

**Si no tienen cuenta:**
- Contactar al administrador de su organización
- NO pueden crear cuenta por su cuenta
- NO hay opción de "registro" para empleados

## Gestión de Usuarios (Solo Admin/Owner)

### Crear Nuevo Usuario

El administrador accede a:
**Administración → Usuarios → Nuevo Usuario**

**Formulario:**
```
- Nombre completo
- Email
- Rol:
  * Admin (administrador)
  * Veterinarian (veterinario)
  * Receptionist (recepcionista)
  * Groomer (peluquero)
- Sucursal (opcional)
- Estado: Activo/Inactivo
```

**Proceso:**
1. Admin completa formulario
2. Sistema crea usuario en auth.users
3. Sistema asocia usuario al mismo tenant del admin
4. Se envía email de bienvenida con contraseña temporal
5. Usuario debe cambiar contraseña en primer acceso

**Límites:**
- Plan Basic: máximo 5 usuarios
- Plan Professional: máximo 50 usuarios
- Plan Enterprise: ilimitado

### Roles y Permisos

**Owner (Propietario):**
- Acceso total
- Gestiona suscripción
- Crea/elimina usuarios
- No puede ser eliminado

**Admin (Administrador):**
- Casi acceso total
- Gestiona usuarios (excepto owners)
- No puede cancelar suscripción

**Veterinarian (Veterinario):**
- Gestiona mascotas y salud
- Crea consultas y tratamientos
- Ve sus propias citas

**Receptionist (Recepcionista):**
- Gestiona citas
- Registra clientes
- Procesa pagos

**Groomer (Peluquero):**
- Gestiona servicios de grooming
- Registra trabajos realizados

## Aislamiento de Datos

**Cada tenant está completamente aislado:**

- Veterinaria Central **NUNCA** puede ver datos de Veterinaria Norte
- Cada organización solo ve sus propios:
  - Mascotas
  - Clientes
  - Usuarios
  - Citas
  - Pagos
  - Reportes

**Implementado mediante:**
- Row Level Security (RLS) en todas las tablas
- Filtros automáticos por `tenant_id`
- Validaciones a nivel de aplicación y base de datos

## Cambio de Organización

Si un usuario pertenece a múltiples organizaciones:

1. Hace login normalmente
2. Ve selector: "¿A qué organización deseas acceder?"
3. Selecciona la organización
4. Se carga el contexto de esa organización
5. Puede cambiar desde el header (selector de tenants)

**Ejemplo de caso de uso:**
- Un veterinario que trabaja en 2 clínicas diferentes
- Un contador que gestiona varias empresas
- Un desarrollador que da soporte a múltiples clientes

## Trial y Suscripciones

### Período de Trial

**Al registrarse:**
```
subscription_status: 'trial'
subscription_plan: 'basic' | 'professional' | 'enterprise'
trial_ends_at: fecha (30 días después)
```

**Durante el trial:**
- Acceso completo a funcionalidades del plan
- Sin cobro
- Recordatorios antes de vencer (7, 3, 1 día)

**Cuando vence el trial:**
- Si NO agregó método de pago → Cuenta suspendida
- Si agregó método de pago → Cobra y activa suscripción

### Suscripción Activa

```
subscription_status: 'active'
payment_method_id: configurado
next_billing_date: fecha próximo cobro
```

**Facturación:**
- Mensual o anual
- Cargos automáticos
- Facturas enviadas por email
- Historial en Configuración → Facturación

### Actualizar Plan

El owner puede:
- Upgrade: Inmediato, se cobra diferencia prorrateada
- Downgrade: Se aplica en próximo ciclo de facturación
- Cancelar: Acceso hasta fin del período pagado

**Límites al hacer downgrade:**
- Si tiene 20 usuarios y baja a Basic (5 max):
  - Debe eliminar/desactivar 15 usuarios primero
  - Sistema no permite downgrade hasta cumplir límites

## Errores Comunes y Soluciones

### "Este identificador ya está en uso"

**Problema:** El slug elegido ya existe

**Solución:**
- Cambiar el slug a uno único
- Probar variaciones: vet-central, vet-central-mx, vet-central-cdmx

### "Email o contraseña incorrectos"

**Problema:** Credenciales inválidas en login

**Solución:**
- Verificar email y contraseña
- Usar "¿Olvidaste tu contraseña?"
- Si eres empleado: contactar a tu admin

### "No tienes permisos para esta acción"

**Problema:** Usuario sin permisos intentó acción restringida

**Solución:**
- Contactar al administrador
- Solicitar upgrade de rol si es necesario

### "Has alcanzado el límite de usuarios de tu plan"

**Problema:** Plan actual no permite más usuarios

**Solución:**
- Actualizar a plan superior
- O desactivar usuarios inactivos

## Seguridad

### Buenas Prácticas

**Para Administradores:**
- Usar contraseñas fuertes
- Activar 2FA cuando esté disponible
- No compartir credenciales de owner
- Revisar usuarios activos regularmente
- Desactivar usuarios que ya no trabajan en la empresa

**Para Usuarios:**
- Cambiar contraseña temporal inmediatamente
- No compartir credenciales
- Cerrar sesión en equipos compartidos
- Reportar actividad sospechosa

### Privacidad de Datos

- Datos encriptados en tránsito (HTTPS)
- Datos encriptados en reposo
- Backups automáticos diarios
- Cumplimiento GDPR
- Los datos son propiedad del tenant
- Al cancelar, datos se guardan 90 días

## Resumen del Flujo Correcto

```
┌─────────────────────────────────────────┐
│  1. Visita petcare.com                  │
│     ↓                                   │
│  2. Click "Registrar empresa"           │
│     ↓                                   │
│  3. Completa 3 pasos:                   │
│     - Datos de empresa                  │
│     - Datos de admin principal          │
│     - Selección de plan                 │
│     ↓                                   │
│  4. Sistema crea:                       │
│     - TENANT (la empresa)               │
│     - Usuario admin (owner)             │
│     - Membresía del admin               │
│     ↓                                   │
│  5. Redirección a la aplicación         │
│     ↓                                   │
│  6. Admin configura:                    │
│     - Crea usuarios del equipo          │
│     - Configura ajustes                 │
│     - Agrega datos iniciales            │
│     ↓                                   │
│  7. Usuarios del equipo:                │
│     - Reciben credenciales              │
│     - Hacen login                       │
│     - Trabajan en la plataforma         │
└─────────────────────────────────────────┘
```

## Soporte

**Para registrar tu empresa:**
- Web: petcare.com → "Registrar empresa"
- Email: ventas@petcare.com
- Tel: +52 55 1234 5678

**Para soporte técnico:**
- Email: soporte@petcare.com
- Chat: Esquina inferior derecha
- Horario: Lun-Vie 9am-6pm
