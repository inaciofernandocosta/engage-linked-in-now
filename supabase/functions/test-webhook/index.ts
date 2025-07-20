import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== TESTE WEBHOOK INICIADO ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = "https://eo6y8yafmyxp7kj.m.pipedream.net";
    
    const testPayload = {
      post_id: "test-123-456",
      content: "🔥 TESTE DIRETO - Se você receber esta mensagem, o sistema está 100% funcionando!",
      image_url: null,
      published_at: new Date().toISOString(),
      user_id: "test-user"
    };

    console.log('=== TESTE: CHAMANDO WEBHOOK DIRETO ===');
    console.log('URL:', webhookUrl);
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    // Chamar o webhook diretamente
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await webhookResponse.text();
    
    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response text:', responseText);

    if (!webhookResponse.ok) {
      throw new Error(`Webhook call failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    console.log('✅ TESTE CONCLUÍDO: Webhook chamado com sucesso!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_status: webhookResponse.status,
        webhook_response: responseText,
        message: 'Teste do webhook realizado com sucesso!',
        payload_sent: testPayload
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro no teste do webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});