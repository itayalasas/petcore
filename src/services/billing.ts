import { supabase } from '../lib/supabase';

export interface MercadoPagoCheckoutResponse {
  sessionId: string;
  externalReference: string;
  preferredCheckoutUrl: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  checkoutEnvironment: 'sandbox' | 'production';
  preferenceId: string;
}

export type MercadoPagoCheckoutEnvironment = 'sandbox' | 'production';

export interface OpenBillingCheckoutSession {
  id: string;
  externalReference: string;
  planId: string;
  planName: string | null;
  planDisplayName: string | null;
  status: 'pending' | 'in_process';
  amount: number;
  currencyId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  preferredCheckoutUrl: string | null;
  checkoutEnvironment: MercadoPagoCheckoutEnvironment;
  createdAt: string;
  expiresAt: string | null;
}

function isResponseLike(value: unknown): value is { clone: () => { json: () => Promise<unknown>; text: () => Promise<string> } } {
  return typeof value === 'object'
    && value !== null
    && 'clone' in value
    && typeof (value as { clone?: unknown }).clone === 'function';
}

async function getFunctionsErrorMessage(error: unknown): Promise<string> {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = (error as { context?: unknown }).context;

    if (isResponseLike(context)) {
      try {
        const payload = await context.clone().json();

        if (payload && typeof payload === 'object') {
          const message = 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : null;

          const details = 'details' in payload && payload.details && typeof payload.details === 'object' && 'message' in payload.details
            && typeof (payload.details as { message?: unknown }).message === 'string'
            ? (payload.details as { message: string }).message
            : null;

          if (message) {
            return message;
          }

          if (details) {
            return details;
          }
        }
      } catch {
        const text = await context.clone().text();
        if (text) {
          return text;
        }
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export async function createMercadoPagoCheckout(
  tenantId: string,
  planId: string,
  checkoutEnvironment: MercadoPagoCheckoutEnvironment,
  payerEmail?: string | null,
  returnUrl?: string | null
): Promise<MercadoPagoCheckoutResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente para generar el link de pago.');
  }

  const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      tenantId,
      planId,
      checkoutEnvironment,
      payerEmail: payerEmail ?? null,
      returnUrl: returnUrl ?? null,
    },
  });

  if (error) {
    const message = await getFunctionsErrorMessage(error);
    console.error('[billing] createMercadoPagoCheckout failed', { error, message });
    throw new Error(message);
  }

  return data as MercadoPagoCheckoutResponse;
}

export async function getLatestOpenBillingCheckout(tenantId: string): Promise<OpenBillingCheckoutSession | null> {
  const { data, error } = await supabase
    .from('billing_checkout_sessions')
    .select(`
      id,
      external_reference,
      plan_id,
      status,
      amount,
      currency_id,
      checkout_url,
      sandbox_checkout_url,
      created_at,
      expires_at,
      plan:subscription_plans(name, display_name)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'in_process'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const preferredCheckoutUrl = data.sandbox_checkout_url ?? data.checkout_url ?? null;
  const checkoutEnvironment: MercadoPagoCheckoutEnvironment = data.sandbox_checkout_url ? 'sandbox' : 'production';

  return {
    id: data.id,
    externalReference: data.external_reference,
    planId: data.plan_id,
    planName: data.plan?.name ?? null,
    planDisplayName: data.plan?.display_name ?? null,
    status: data.status,
    amount: Number(data.amount ?? 0),
    currencyId: data.currency_id,
    checkoutUrl: data.checkout_url,
    sandboxCheckoutUrl: data.sandbox_checkout_url,
    preferredCheckoutUrl,
    checkoutEnvironment,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

export async function syncMercadoPagoCheckoutStatus(tenantId: string, checkoutSessionId?: string | null): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente para actualizar el estado del pago.');
  }

  const { error } = await supabase.functions.invoke('mercadopago-sync-checkout-status', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      tenantId,
      checkoutSessionId: checkoutSessionId ?? null,
    },
  });

  if (error) {
    const message = await getFunctionsErrorMessage(error);
    console.error('[billing] syncMercadoPagoCheckoutStatus failed', { error, message });
    throw new Error(message);
  }
}