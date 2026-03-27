# Integracion SaaS con Mercado Pago

## Objetivo

Usar Mercado Pago como proveedor de cobro para activar o renovar suscripciones SaaS por tenant, dejando el cambio de licencias y estado de suscripción gobernado por la confirmación del webhook.

## Arquitectura

### Base de datos

La migración [supabase/migrations/20260325043000_add_mercadopago_billing.sql](c:/Proyectos/Pruebas/PetCore/supabase/migrations/20260325043000_add_mercadopago_billing.sql) agrega:

- `billing_customers`
- `billing_checkout_sessions`
- `billing_webhook_events`
- `create_billing_checkout_session(...)`
- `apply_mercadopago_payment_result(...)`

### Edge Functions

- `mercadopago-create-preference`
  - crea una sesión interna de checkout
  - llama a Mercado Pago y genera una `preference`
  - devuelve el `init_point` para abrir el checkout

- `mercadopago-webhook`
  - valida firma (`x-signature`) cuando existe secret configurado
  - consulta el pago real en la API de Mercado Pago
  - aplica el resultado a la suscripción del tenant
  - registra el evento en `billing_webhook_events`

### Frontend

La consola de plataforma en [src/components/modules/PlatformLicensing.tsx](c:/Proyectos/Pruebas/PetCore/src/components/modules/PlatformLicensing.tsx) ya puede generar un link de pago para el tenant seleccionado.

## Flujo operativo

1. Plataforma selecciona tenant y plan.
2. Plataforma pulsa `Generar link de pago`.
3. La app invoca `mercadopago-create-preference`.
4. Se crea una fila en `billing_checkout_sessions` con estado `pending`.
5. Mercado Pago devuelve una `preference` y la URL de checkout.
6. El usuario paga en Mercado Pago.
7. Mercado Pago llama al webhook `mercadopago-webhook`.
8. El webhook consulta el pago real y ejecuta `apply_mercadopago_payment_result(...)`.
9. Si el pago queda `approved` o `authorized`:
   - `tenant_subscriptions.status` pasa a `active`
   - se actualiza `plan_id`
   - se mueve el período actual
   - la sincronización existente actualiza el snapshot del tenant
10. El licenciamiento modular sigue resolviéndose desde plan + entitlements de plataforma.

## Variables necesarias

Estas variables deben configurarse en Supabase Edge Functions, no en el frontend:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_CURRENCY_ID=COP
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
MERCADO_PAGO_ENVIRONMENT=sandbox
APP_BASE_URL=http://localhost:5173
```

`APP_BASE_URL` debe apuntar al dominio real del frontend en producción.
Si no está configurada, la función intentará usar el header `Origin` de la petición para construir las `back_urls`, pero no conviene depender de eso como configuración principal.

`MERCADO_PAGO_ENVIRONMENT` permite fijar el modo por defecto de checkout.
Valores válidos: `sandbox`, `production`.
Si no se configura, la función intenta inferirlo desde el access token: tokens `TEST-...` se tratan como `sandbox`.

## Configuracion del webhook en Mercado Pago

Configura como URL de notificación:

```text
https://<tu-proyecto-supabase>.supabase.co/functions/v1/mercadopago-webhook
```

Mercado Pago enviará eventos como `payment` con `data.id`. El webhook luego consulta el detalle completo del pago desde la API oficial y no confía solo en el payload recibido.

## Validacion del webhook

La función valida:

- `x-signature`
- `x-request-id`
- `data.id`

Si `MERCADO_PAGO_WEBHOOK_SECRET` no está configurado, la función procesa el webhook pero deja un warning en logs. Para producción debes configurar el secret.

## Estados que afectan la suscripción

- `approved`
- `authorized`

Resultado:
- suscripción `active`
- plan sincronizado al checkout pagado

- `refunded`
- `charged_back`

Resultado:
- suscripción `suspended`

Estados como `pending`, `in_process`, `cancelled`, `expired` actualizan la sesión de checkout pero no activan la suscripción.

## Recomendaciones de producto

1. Mantener el cambio de plan final atado al webhook, no al clic del usuario.
2. Registrar auditoría adicional si quieres trazabilidad comercial completa.
3. Añadir una pantalla tenant para ver facturas y links pendientes sin permitir cambiar entitlements.
4. Agregar reintentos o cola si el webhook falla al actualizar Supabase.