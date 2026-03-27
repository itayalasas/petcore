# Sistema de Multi-Tenancy con Subdominios

Este documento explica cómo funciona el sistema híbrido de multi-tenancy que soporta tanto el modo de desarrollo (context-based) como el modo de producción (subdomain-based).

## Descripción General

El sistema puede operar en dos modos:

1. **Context-Based (Desarrollo)**: Los usuarios acceden a través de una URL única y el sistema detecta el tenant basado en el usuario autenticado.
2. **Subdomain-Based (Producción)**: Cada tenant tiene su propio subdominio (ej: `vet-central.tuapp.com`).

## Cómo Funciona

### Modo de Desarrollo (Context-Based)

**Estado actual por defecto**

- Todos los usuarios acceden a: `http://localhost:5173`
- El tenant se detecta automáticamente según el usuario autenticado
- Los datos están completamente separados por `tenant_id` mediante Row Level Security (RLS)
- El usuario puede cambiar entre tenants desde la interfaz si pertenece a múltiples organizaciones

**Ventajas:**
- ✅ Fácil de desarrollar localmente
- ✅ No requiere configuración DNS
- ✅ Funciona inmediatamente

**Desventajas:**
- ❌ Menos profesional para producción
- ❌ Sin aislamiento visual por URL

### Modo de Producción (Subdomain-Based)

**Activación cuando tengas DNS configurado**

- Cada tenant tiene su URL única: `tenant-slug.tuapp.com`
- El sistema detecta el tenant por el subdominio en la URL
- Si un usuario intenta acceder a un tenant al que no pertenece, se muestra un error
- Más profesional y da sensación de "tu propio espacio"

**Ventajas:**
- ✅ Más profesional
- ✅ Mejor aislamiento visual
- ✅ Branding personalizado por URL
- ✅ Ideal para SaaS B2B

**Desventajas:**
- ❌ Requiere configuración DNS
- ❌ No funciona en desarrollo local sin configuración adicional

## Configuración

### Variables de Entorno

Edita tu archivo `.env`:

```bash
# Multi-tenant subdomain configuration
VITE_ENABLE_SUBDOMAIN_TENANCY=false  # Cambiar a 'true' para activar subdominios
VITE_BASE_DOMAIN=localhost:5173      # Tu dominio base (ej: tuapp.com)
```

### Activar Subdominios en Producción

#### 1. Configurar DNS

Configura un wildcard DNS record en tu proveedor de dominios:

```
Type: A
Name: *
Value: [IP de tu servidor]
TTL: Auto
```

O para cada subdominio específico:

```
Type: CNAME
Name: vet-central
Value: tuapp.com
TTL: Auto
```

#### 2. Configurar Variables de Entorno en Producción

```bash
VITE_ENABLE_SUBDOMAIN_TENANCY=true
VITE_BASE_DOMAIN=tuapp.com
```

#### 3. Configurar SSL/TLS

Si usas servicios como Vercel, Netlify, o Cloudflare, necesitarás:

- **Vercel/Netlify**: Agregar dominio wildcard en la configuración del proyecto
- **Cloudflare**: Configurar proxy y SSL flexible/full

#### 4. Deploy

Después de configurar DNS y variables de entorno, haz deploy de tu aplicación.

## Validación de Slugs

El sistema valida automáticamente los slugs durante el registro:

### Reglas de Validación

- **Longitud**: 3-63 caracteres
- **Caracteres permitidos**: Solo letras minúsculas (a-z), números (0-9), y guiones (-)
- **Formato**: Debe empezar y terminar con letra o número (no guiones)
- **Sin espacios ni caracteres especiales**

### Slugs Reservados

Los siguientes slugs están reservados y no se pueden usar:

```
www, api, admin, app, mail, ftp, localhost,
staging, dev, test, demo, support, help,
docs, blog, status, cdn, assets, static
```

### Ejemplos de Slugs Válidos

- ✅ `vet-central`
- ✅ `clinica-paws`
- ✅ `pet-hotel-123`
- ✅ `mi-veterinaria`

### Ejemplos de Slugs Inválidos

- ❌ `Vet Central` (mayúsculas y espacios)
- ❌ `-vet-central` (empieza con guion)
- ❌ `vet_central` (guiones bajos no permitidos)
- ❌ `vc` (muy corto)
- ❌ `www` (reservado)
- ❌ `admin` (reservado)

## Detección Automática de Tenant

El sistema usa la función `detectTenantFromUrl()` para determinar cómo detectar el tenant:

```typescript
// En desarrollo (VITE_ENABLE_SUBDOMAIN_TENANCY=false)
detectTenantFromUrl() // => { method: 'context' }

// En producción en la landing page (tuapp.com)
detectTenantFromUrl() // => { method: 'none' }

// En producción en un subdominio (vet-central.tuapp.com)
detectTenantFromUrl() // => { method: 'subdomain', slug: 'vet-central' }
```

## Flujo de Registro

1. Usuario completa el formulario de registro
2. Sistema genera un slug automáticamente desde el nombre de la empresa
3. Usuario puede editar el slug manualmente
4. Sistema valida el slug en tiempo real:
   - ✅ Formato correcto
   - ✅ No está reservado
   - ✅ No está en uso por otro tenant
5. Sistema muestra preview de la URL que tendrá el tenant
6. Al completar registro, el tenant queda registrado con ese slug único

## URLs Generadas

La función `getTenantUrl(slug)` genera la URL correcta según el modo:

```typescript
// En desarrollo
getTenantUrl('vet-central')
// => http://localhost:5173

// En producción
getTenantUrl('vet-central')
// => https://vet-central.tuapp.com
```

## Seguridad

- ✅ **Row Level Security (RLS)**: Todos los datos están protegidos por políticas RLS
- ✅ **Validación de Slug**: Slugs reservados y formato validado
- ✅ **Verificación de Acceso**: El usuario debe ser miembro del tenant para acceder
- ✅ **Sesiones por Tenant**: No hay cross-tenant data leakage

## Testing en Desarrollo Local

Si quieres probar subdominios en desarrollo local:

### Opción 1: Archivo /etc/hosts (Mac/Linux)

Edita `/etc/hosts` y agrega:

```
127.0.0.1 vet-central.localhost
127.0.0.1 clinica-paws.localhost
```

Luego accede a: `http://vet-central.localhost:5173`

### Opción 2: Usar ngrok o similar

```bash
ngrok http 5173 --subdomain=vet-central
```

### Opción 3: Mantener Context-Based

La forma más simple es mantener `VITE_ENABLE_SUBDOMAIN_TENANCY=false` durante desarrollo.

## Migración de Context-Based a Subdomain-Based

Para migrar de un sistema context-based a subdomain-based:

1. ✅ Todos los tenants ya tienen un slug único en la base de datos
2. ✅ No requiere migración de datos
3. ✅ Solo cambiar variables de entorno y configurar DNS
4. ✅ Los usuarios existentes seguirán funcionando

## Mejores Prácticas

1. **Desarrollo**: Mantén `VITE_ENABLE_SUBDOMAIN_TENANCY=false`
2. **Staging**: Puedes activar subdominios si tienes DNS configurado
3. **Producción**: Activa `VITE_ENABLE_SUBDOMAIN_TENANCY=true` con DNS configurado
4. **Slugs**: Anima a los clientes a elegir slugs cortos y memorables
5. **Branding**: Considera permitir custom domains como feature premium

## Troubleshooting

### "Subdomain X does not match any accessible tenant"

- Verifica que el slug en la URL coincida con un tenant en la BD
- Verifica que el usuario autenticado sea miembro de ese tenant
- Revisa la consola del navegador para más detalles

### "Este identificador ya está en uso"

- El slug que intentas usar ya existe
- Prueba con otro slug o agrega un número/sufijo

### DNS no resuelve

- Espera propagación DNS (puede tomar hasta 48 horas)
- Verifica configuración en tu proveedor DNS
- Usa herramientas como `nslookup` o `dig` para verificar

### SSL/TLS errors en subdominios

- Verifica que tu certificado SSL cubra wildcard (*.tuapp.com)
- En Vercel/Netlify, agrega el wildcard domain en configuración
- En Cloudflare, verifica que SSL esté en modo "Full" o "Flexible"

## Soporte

Si tienes problemas:

1. Revisa los logs del navegador (Console y Network)
2. Verifica las variables de entorno
3. Confirma configuración DNS
4. Revisa la documentación de tu proveedor de hosting
