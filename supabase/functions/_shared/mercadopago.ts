export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string | null;
  appUrl: string;
  currencyId: string;
  apiBaseUrl: string;
  environment: 'sandbox' | 'production';
}

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? '';
  const configuredEnvironment = Deno.env.get('MERCADO_PAGO_ENVIRONMENT');

  if (!accessToken) {
    throw new Error('Missing MERCADO_PAGO_ACCESS_TOKEN');
  }

  const inferredEnvironment = accessToken.startsWith('TEST-') ? 'sandbox' : 'production';

  return {
    accessToken,
    webhookSecret: Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') ?? null,
    appUrl: Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173',
    currencyId: Deno.env.get('MERCADO_PAGO_CURRENCY_ID') ?? 'COP',
    apiBaseUrl: Deno.env.get('MERCADO_PAGO_API_BASE_URL') ?? 'https://api.mercadopago.com',
    environment: configuredEnvironment === 'sandbox' || configuredEnvironment === 'production'
      ? configuredEnvironment
      : inferredEnvironment,
  };
}

export async function mercadoPagoRequest<T>(
  config: MercadoPagoConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const cause = Array.isArray(data?.cause)
      ? data.cause
          .map((item) => {
            if (item && typeof item === 'object' && 'description' in item && typeof item.description === 'string') {
              return item.description;
            }

            if (item && typeof item === 'object' && 'code' in item && typeof item.code === 'string') {
              return item.code;
            }

            return null;
          })
          .filter(Boolean)
          .join(', ')
      : null;
    const message = typeof data?.message === 'string' ? data.message : null;
    const error = typeof data?.error === 'string' ? data.error : null;
    const detail = cause || message || error;

    console.error('[mercadopago] request failed', { path, status: response.status, data });
    throw new Error(detail
      ? `Mercado Pago request failed: ${response.status} - ${detail}`
      : `Mercado Pago request failed: ${response.status}`);
  }

  return data as T;
}

export async function verifyMercadoPagoSignature(
  signatureHeader: string | null,
  requestId: string | null,
  body: Record<string, unknown>,
  secret: string | null
): Promise<boolean> {
  if (!secret) {
    console.warn('[mercadopago] webhook secret not configured, skipping signature verification');
    return true;
  }

  if (!signatureHeader || !requestId) {
    return false;
  }

  const signatureParts = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

  const ts = signatureParts.ts;
  const receivedSignature = signatureParts.v1;
  const data = body.data as Record<string, unknown> | undefined;
  const dataId = String(data?.id ?? body.id ?? '');

  if (!ts || !receivedSignature || !dataId) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === receivedSignature;
}