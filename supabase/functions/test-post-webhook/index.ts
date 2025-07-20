import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== TESTE POST WEBHOOK INICIADO ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração incompleta');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Criar post de teste no banco
    console.log('Inserindo post de teste...');
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '🧪 TESTE DIRETO SEM JWT - ' + new Date().toISOString() + ' - Este post deve gerar webhook!',
        webhook_url: 'https://n8n-n8n-start.43ir9u.easypanel.host/webhook/instagran'
      })
      .select()
      .single();

    if (postError) {
      throw new Error(`Erro ao criar post: ${postError.message}`);
    }

    console.log('✅ Post criado:', post);

    // 2. Chamar webhook manualmente
    console.log('📡 Chamando webhook...');
    const webhookPayload = {
      post_id: post.id,
      content: post.content,
      image_url: post.image_url,
      published_at: post.published_at,
      user_id: post.user_id
    };

    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
    console.log('URL:', post.webhook_url);

    const webhookResponse = await fetch(post.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('Webhook status:', webhookResponse.status);
    const webhookText = await webhookResponse.text();
    console.log('Webhook response:', webhookText);

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    console.log('✅ SUCESSO TOTAL!');
    return new Response(
      JSON.stringify({ 
        success: true, 
        post: post,
        webhook_status: webhookResponse.status,
        webhook_response: webhookText,
        message: 'Post criado e webhook chamado com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});