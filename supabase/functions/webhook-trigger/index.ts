import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== WEBHOOK TRIGGER INICIADO ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse do body
    const body = await req.json();
    const execution_id = body.execution_id || 'unknown';
    console.log(`[${execution_id}] Received payload:`, body);
    
    const { post_id, content, image_url, published_at, user_id, webhook_url } = body;

    if (!webhook_url) {
      console.log(`[${execution_id}] Nenhum webhook_url fornecido`);
      return new Response(
        JSON.stringify({ success: false, error: 'webhook_url é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir payload para o webhook
    const webhookPayload = {
      post_id,
      content,
      image_url,
      published_at,
      user_id
    };

    console.log(`[${execution_id}] === CHAMANDO WEBHOOK ===`);
    console.log(`[${execution_id}] URL:`, webhook_url);
    console.log(`[${execution_id}] Payload:`, JSON.stringify(webhookPayload, null, 2));

    // Chamar o webhook
    const webhookResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`[${execution_id}] Webhook response status:`, webhookResponse.status);
    console.log(`[${execution_id}] Webhook response text:`, await webhookResponse.text());

    if (!webhookResponse.ok) {
      throw new Error(`Webhook call failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    console.log(`[${execution_id}] ✅ Webhook chamado com sucesso!`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_status: webhookResponse.status,
        message: 'Webhook chamado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${body?.execution_id || 'unknown'}] ❌ Erro ao chamar webhook:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro interno na chamada do webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});