import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { getMercadoPagoConfig, mercadoPagoRequest } from '../_shared/mercadopago.ts';

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error;
  }

  return { message: String(error) };
}

function resolveAppUrl(
  configuredAppUrl: string,
  requestOrigin: string | null,
  explicitReturnUrl: string | null,
  tenantDomain: string | null
) {
  if (explicitReturnUrl) {
    return explicitReturnUrl;
  }

  if (tenantDomain) {
    if (tenantDomain.startsWith('http://') || tenantDomain.startsWith('https://')) {
      return tenantDomain;
    }

    const fallbackBase = requestOrigin ?? configuredAppUrl;

    try {
      const fallbackUrl = new URL(fallbackBase);
      return `${fallbackUrl.protocol}//${tenantDomain}`;
    } catch {
      return tenantDomain;
    }
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return configuredAppUrl;
}

function getCheckoutRedirectUrls(appUrl: string) {
  try {
    const resolvedUrl = new URL(appUrl);
    const hostname = resolvedUrl.hostname.toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (!['http:', 'https:'].includes(resolvedUrl.protocol) || isLocalhost) {
      return null;
    }

    const normalizedBaseUrl = resolvedUrl.toString().replace(/\/$/, '');

    return {
      success: `${normalizedBaseUrl}?billing=success`,
      pending: `${normalizedBaseUrl}?billing=pending`,
      failure: `${normalizedBaseUrl}?billing=failure`,
    };
  } catch {
    return null;
  }
}

function resolveCheckoutEnvironment(
  requestedEnvironment: unknown,
  configuredEnvironment: 'sandbox' | 'production'
): 'sandbox' | 'production' {
  return requestedEnvironment === 'sandbox' || requestedEnvironment === 'production'
    ? requestedEnvironment
    : configuredEnvironment;
}

function getExpectedCountryByCurrency(currencyId: string): string | null {
  const normalizedCurrency = currencyId.toUpperCase();

  switch (normalizedCurrency) {
    case 'COP':
      return 'CO';
    case 'UYU':
      return 'UY';
    case 'ARS':
      return 'AR';
    case 'BRL':
      return 'BR';
    case 'CLP':
      return 'CL';
    case 'MXN':
      return 'MX';
    case 'PEN':
      return 'PE';
    default:
      return null;
  }
}

function getExpectedSiteByCurrency(currencyId: string): string | null {
  const normalizedCurrency = currencyId.toUpperCase();

  switch (normalizedCurrency) {
    case 'COP':
      return 'MCO';
    case 'UYU':
      return 'MLU';
    case 'ARS':
      return 'MLA';
    case 'BRL':
      return 'MLB';
    case 'CLP':
      return 'MLC';
    case 'MXN':
      return 'MLM';
    case 'PEN':
      return 'MPE';
    default:
      return null;
  }
}

function describeMarket(siteId: string | null, countryId: string | null) {
  if (siteId === 'MLU' || countryId === 'UY') {
    return 'Uruguay';
  }

  if (siteId === 'MCO' || countryId === 'CO') {
    return 'Colombia';
  }

  if (siteId === 'MLA' || countryId === 'AR') {
    return 'Argentina';
  }

  if (siteId === 'MLB' || countryId === 'BR') {
    return 'Brasil';
  }

  if (siteId === 'MLC' || countryId === 'CL') {
    return 'Chile';
  }

  if (siteId === 'MLM' || countryId === 'MX') {
    return 'México';
  }

  if (siteId === 'MPE' || countryId === 'PE') {
    return 'Perú';
  }

  return countryId ?? siteId ?? 'otro país';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables for edge function');
    }

    const authHeader = req.headers.get('Authorization');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.warn('[mercadopago-create-preference] unauthorized request', {
        authError: authError?.message ?? null,
      });

      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenantId, planId, payerEmail, checkoutEnvironment, returnUrl } = await req.json();
    console.info('[mercadopago-create-preference] request received', {
      userId: user.id,
      tenantId,
      planId,
      payerEmail: payerEmail ?? user.email ?? null,
      checkoutEnvironment: checkoutEnvironment ?? null,
      returnUrl: returnUrl ?? null,
    });

    if (!tenantId || !planId) {
      return new Response(JSON.stringify({ error: 'tenantId and planId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: membership }, { data: isPlatformAdmin }] = await Promise.all([
      userClient
        .from('tenant_members')
        .select('tenant_id, role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      userClient.rpc('is_platform_admin', { p_user_id: user.id }),
    ]);

    console.info('[mercadopago-create-preference] authorization resolved', {
      userId: user.id,
      tenantId,
      hasMembership: Boolean(membership),
      isPlatformAdmin: Boolean(isPlatformAdmin),
    });

    if (!membership && !isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: tenant, error: tenantError }, { data: plan, error: planError }] = await Promise.all([
      adminClient.from('tenants').select('id, name, slug, domain').eq('id', tenantId).single(),
      adminClient.from('subscription_plans').select('id, name, display_name, description').eq('id', planId).single(),
    ]);

    if (tenantError || planError || !tenant || !plan) {
      console.error('[mercadopago-create-preference] failed loading tenant or plan', {
        tenantError: serializeError(tenantError),
        planError: serializeError(planError),
        tenantId,
        planId,
      });
      throw tenantError ?? planError ?? new Error('Could not load tenant or plan');
    }

    const config = getMercadoPagoConfig();
    const resolvedCheckoutEnvironment = resolveCheckoutEnvironment(checkoutEnvironment, config.environment);
    const appUrl = resolveAppUrl(config.appUrl, req.headers.get('origin'), returnUrl ?? null, tenant.domain ?? null);
    const redirectUrls = getCheckoutRedirectUrls(appUrl);
    const sellerProfile = await mercadoPagoRequest<Record<string, unknown>>(config, '/users/me', {
      method: 'GET',
    });
    const sellerSiteId = typeof sellerProfile.site_id === 'string' ? sellerProfile.site_id.toUpperCase() : null;
    const sellerCountryId = typeof sellerProfile.country_id === 'string' ? sellerProfile.country_id.toUpperCase() : null;
    const expectedCountryId = getExpectedCountryByCurrency(config.currencyId);
    const expectedSiteId = getExpectedSiteByCurrency(config.currencyId);
    const payerEmailForCheckout = resolvedCheckoutEnvironment === 'production'
      ? payerEmail ?? user.email ?? null
      : null;
    console.info('[mercadopago-create-preference] app url resolved', {
      checkoutEnvironment: resolvedCheckoutEnvironment,
      configuredEnvironment: config.environment,
      configuredAppUrl: config.appUrl,
      requestOrigin: req.headers.get('origin'),
      resolvedAppUrl: appUrl,
      hasRedirectUrls: Boolean(redirectUrls),
      hasPayerEmail: Boolean(payerEmailForCheckout),
      sellerSiteId,
      sellerCountryId,
      configuredCurrencyId: config.currencyId,
    });

    const hasCountryMismatch = Boolean(expectedCountryId && sellerCountryId && sellerCountryId !== expectedCountryId);
    const hasSiteMismatch = Boolean(expectedSiteId && sellerSiteId && sellerSiteId !== expectedSiteId);

    if (hasCountryMismatch || hasSiteMismatch) {
      const sellerMarket = describeMarket(sellerSiteId, sellerCountryId);
      const expectedMarket = describeMarket(expectedSiteId, expectedCountryId);

      throw new Error(
        `Las credenciales actuales de Mercado Pago pertenecen a ${sellerMarket}, pero la aplicación está configurada con moneda ${config.currencyId} para ${expectedMarket}. Corrige MERCADO_PAGO_ACCESS_TOKEN y MERCADO_PAGO_CURRENCY_ID para usar el mismo país antes de generar el checkout.`
      );
    }

    if (!redirectUrls) {
      console.warn('[mercadopago-create-preference] missing public APP_BASE_URL or Origin, checkout will be created without back_urls/auto_return', {
        appUrl,
      });
    }

    const { data: sessionRow, error: sessionError } = await adminClient.rpc('create_billing_checkout_session', {
      p_tenant_id: tenantId,
      p_plan_id: planId,
      p_provider: 'mercadopago',
      p_currency_id: Deno.env.get('MERCADO_PAGO_CURRENCY_ID') ?? 'COP',
      p_payer_email: payerEmailForCheckout,
      p_created_by: user.id,
    });

    if (sessionError || !sessionRow) {
      console.error('[mercadopago-create-preference] create_billing_checkout_session failed', serializeError(sessionError));
      throw sessionError ?? new Error('Could not create billing checkout session');
    }

    const [session] = Array.isArray(sessionRow) ? sessionRow : [sessionRow];
    console.info('[mercadopago-create-preference] checkout session created', {
      sessionId: session.id,
      externalReference: session.external_reference,
      amount: session.amount,
      currencyId: session.currency_id,
      checkoutEnvironment: resolvedCheckoutEnvironment,
    });

    const preferencePayload: Record<string, unknown> = {
      items: [
        {
          id: plan.id,
          title: `Suscripción ${plan.display_name} - ${tenant.name}`,
          description: plan.description ?? `Suscripción SaaS ${plan.display_name}`,
          quantity: 1,
          currency_id: session.currency_id,
          unit_price: Number(session.amount),
        },
      ],
      external_reference: session.external_reference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      metadata: {
        tenant_id: tenantId,
        plan_id: planId,
        checkout_session_id: session.id,
      },
      expires: true,
    };

    if (payerEmailForCheckout) {
      preferencePayload.payer = {
        email: payerEmailForCheckout,
      };
    }

    if (redirectUrls) {
      preferencePayload.back_urls = redirectUrls;
      preferencePayload.auto_return = 'approved';
    }

    const preference = await mercadoPagoRequest<any>(config, '/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify(preferencePayload),
    });

    console.info('[mercadopago-create-preference] mercado pago preference created', {
      sessionId: session.id,
      preferenceId: preference.id ?? null,
      hasCheckoutUrl: Boolean(preference.init_point ?? preference.sandbox_init_point),
      checkoutEnvironment: resolvedCheckoutEnvironment,
    });

    const preferredCheckoutUrl = resolvedCheckoutEnvironment === 'sandbox'
      ? preference.sandbox_init_point ?? preference.init_point ?? null
      : preference.init_point ?? preference.sandbox_init_point ?? null;

    const { error: updateError } = await adminClient
      .from('billing_checkout_sessions')
      .update({
        preference_id: preference.id,
        checkout_url: preference.init_point ?? null,
        sandbox_checkout_url: preference.sandbox_init_point ?? null,
        expires_at: preference.expiration_date_to ?? null,
        raw_preference: preference,
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('[mercadopago-create-preference] failed updating billing_checkout_sessions', serializeError(updateError));
      throw updateError;
    }

    return new Response(JSON.stringify({
      sessionId: session.id,
      externalReference: session.external_reference,
      preferredCheckoutUrl,
      checkoutUrl: preference.init_point ?? null,
      sandboxCheckoutUrl: preference.sandbox_init_point ?? null,
      checkoutEnvironment: resolvedCheckoutEnvironment,
      preferenceId: preference.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const serializedError = serializeError(error);
    console.error('[mercadopago-create-preference] error', serializedError);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: serializedError,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});