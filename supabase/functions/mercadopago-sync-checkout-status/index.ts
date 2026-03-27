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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenantId, checkoutSessionId } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: membership }, { data: isPlatformAdmin }] = await Promise.all([
      userClient
        .from('tenant_members')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      userClient.rpc('is_platform_admin', { p_user_id: user.id }),
    ]);

    if (!membership && !isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = adminClient
      .from('billing_checkout_sessions')
      .select('id, external_reference, payment_id, merchant_order_id, status')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'in_process'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkoutSessionId) {
      query = adminClient
        .from('billing_checkout_sessions')
        .select('id, external_reference, payment_id, merchant_order_id, status')
        .eq('tenant_id', tenantId)
        .eq('id', checkoutSessionId)
        .limit(1);
    }

    const { data: sessions, error: sessionError } = await query;

    if (sessionError) {
      throw sessionError;
    }

    const checkoutSession = sessions?.[0];

    if (!checkoutSession) {
      return new Response(JSON.stringify({ ok: true, synced: false, reason: 'no-open-session' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = getMercadoPagoConfig();
    const searchResult = await mercadoPagoRequest<any>(
      config,
      `/v1/payments/search?external_reference=${encodeURIComponent(checkoutSession.external_reference)}&sort=date_created&criteria=desc&limit=1`,
      { method: 'GET' }
    );

    const payment = Array.isArray(searchResult?.results) ? searchResult.results[0] : null;

    if (!payment) {
      return new Response(JSON.stringify({ ok: true, synced: false, reason: 'payment-not-found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: applyError } = await adminClient.rpc('apply_mercadopago_payment_result', {
      p_external_reference: checkoutSession.external_reference,
      p_payment_id: String(payment.id ?? checkoutSession.payment_id ?? ''),
      p_merchant_order_id: payment.order?.id ? String(payment.order.id) : checkoutSession.merchant_order_id ?? null,
      p_status: payment.status,
      p_status_detail: payment.status_detail ?? null,
      p_paid_at: payment.date_approved ?? null,
      p_payment_payload: payment,
    });

    if (applyError) {
      throw applyError;
    }

    return new Response(JSON.stringify({ ok: true, synced: true, paymentStatus: payment.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[mercadopago-sync-checkout-status] error', serializeError(error));

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: serializeError(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});