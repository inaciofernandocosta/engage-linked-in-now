import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para baixar imagem do storage e converter para base64
const getImageAsBase64 = async (imagePath: string): Promise<{content: string, contentType: string, filename: string} | null> => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🖼️ Baixando imagem do storage:', imagePath);
    
    // Fazer download da imagem
    const { data, error } = await supabase.storage
      .from('post-images')
      .download(imagePath);
    
    if (error) {
      console.error('Erro ao baixar imagem:', error);
      return null;
    }
    
    if (!data) {
      console.error('Nenhum dado de imagem retornado');
      return null;
    }
    
    // Converter para ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Converter para base64 usando chunks
    const chunkSize = 8192;
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64 = btoa(binaryString);
    
    // Detectar tipo MIME
    const contentType = data.type || 'image/png';
    
    // Gerar filename
    const extension = contentType.includes('jpeg') ? 'jpg' : 
                     contentType.includes('png') ? 'png' : 
                     contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `post_image_${Date.now()}.${extension}`;
    
    console.log('✅ Imagem convertida para base64:', {
      contentType,
      filename,
      contentLength: base64.length
    });
    
    return {
      content: base64,
      contentType,
      filename
    };
    
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return null;
  }
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
    
    const { post_id, content, image_url, image_storage_path, published_at, user_id, webhook_url } = body;

    if (!webhook_url) {
      console.log(`[${execution_id}] Nenhum webhook_url fornecido`);
      return new Response(
        JSON.stringify({ success: false, error: 'webhook_url é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados da imagem se image_storage_path estiver presente
    let imageData = null;
    if (image_storage_path) {
      console.log(`[${execution_id}] 🖼️ Processando imagem do storage:`, image_storage_path);
      imageData = await getImageAsBase64(image_storage_path);
      
      if (imageData) {
        console.log(`[${execution_id}] ✅ Imagem processada com sucesso para LinkedIn`);
      } else {
        console.log(`[${execution_id}] ⚠️ Falha ao processar imagem - continuando sem image_data`);
      }
    }

    // Construir payload para o webhook
    const webhookPayload = {
      post_id,
      content,
      image_url, // manter para compatibilidade
      image_data: imageData, // dados binários para LinkedIn
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
    
    const responseText = await webhookResponse.text();
    console.log(`[${execution_id}] Webhook response text:`, responseText);

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
    const execution_id = 'unknown';
    console.error(`[${execution_id}] ❌ Erro ao chamar webhook:`, error);
    
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