import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { getMercadoPagoConfig, mercadoPagoRequest, verifyMercadoPagoSignature } from '../_shared/mercadopago.ts';

function isMercadoPagoWebhookProbe(
  payload: Record<string, unknown>,
  signature: string | null,
  requestId: string | null
): boolean {
  if (signature || requestId) {
    return false;
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  const type = typeof payload.type === 'string' ? payload.type : '';
  const liveMode = payload.live_mode;

  return action === 'payment.updated' && type === 'payment' && liveMode === false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing service role configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const config = getMercadoPagoConfig();
  const rawBody = await req.text();
  const payload = rawBody ? JSON.parse(rawBody) : {};
  const url = new URL(req.url);
  const eventType = url.searchParams.get('type') ?? payload.type ?? payload.topic ?? 'unknown';
  const action = payload.action ?? url.searchParams.get('action') ?? null;
  const externalId = String((payload.data?.id ?? payload.id ?? url.searchParams.get('data.id') ?? '') || '');
  const signature = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');

  let webhookEventId: string | null = null;

  try {
    if (isMercadoPagoWebhookProbe(payload, signature, requestId)) {
      console.info('[mercadopago-webhook] ignored unsigned Mercado Pago probe');

      return new Response(JSON.stringify({ ok: true, ignored: true, reason: 'mercadopago-probe' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValidSignature = await verifyMercadoPagoSignature(signature, requestId, payload, config.webhookSecret);

    if (!isValidSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: webhookEvent, error: insertError } = await adminClient
      .from('billing_webhook_events')
      .insert({
        provider: 'mercadopago',
        event_type: eventType,
        action,
        external_id: externalId || null,
        signature,
        payload,
      })
      .select('id')
      .single();

    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }

    webhookEventId = webhookEvent?.id ?? null;

    if (eventType !== 'payment' || !externalId) {
      if (webhookEventId) {
        await adminClient.from('billing_webhook_events').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', webhookEventId);
      }

      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await mercadoPagoRequest<any>(config, `/v1/payments/${externalId}`);
    const externalReference = payment.external_reference ?? payment.metadata?.external_reference ?? null;

    if (!externalReference) {
      throw new Error('Payment does not contain external_reference');
    }

    const { error: applyError } = await adminClient.rpc('apply_mercadopago_payment_result', {
      p_external_reference: externalReference,
      p_payment_id: String(payment.id ?? externalId),
      p_merchant_order_id: payment.order?.id ? String(payment.order.id) : null,
      p_status: payment.status,
      p_status_detail: payment.status_detail ?? null,
      p_paid_at: payment.date_approved ?? null,
      p_payment_payload: payment,
    });

    if (applyError) {
      throw applyError;
    }

    if (webhookEventId) {
      await adminClient
        .from('billing_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: null,
        })
        .eq('id', webhookEventId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[mercadopago-webhook] error', error);

    if (webhookEventId) {
      await adminClient
        .from('billing_webhook_events')
        .update({
          processed: false,
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', webhookEventId);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});