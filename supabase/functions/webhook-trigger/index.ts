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

// Função auxiliar para enviar webhook com retry e logs detalhados
const sendWebhook = async (webhook_url: string, payload: any, execution_id: string) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${execution_id}] === CHAMANDO WEBHOOK (Tentativa ${attempt}/${maxRetries}) ===`);
      console.log(`[${execution_id}] URL: ${webhook_url}`);
      console.log(`[${execution_id}] Payload size: ${JSON.stringify(payload).length} chars`);
      console.log(`[${execution_id}] Images count: ${payload.images?.length || 0}`);
      
      // Log detalhado do payload (resumido)
      const payloadSummary = {
        post_id: payload.post_id,
        content_preview: payload.content?.substring(0, 100) + '...',
        images_count: payload.images?.length || 0,
        has_images: (payload.images?.length || 0) > 0,
        timestamp: payload.timestamp || new Date().toISOString()
      };
      console.log(`[${execution_id}] Payload summary:`, JSON.stringify(payloadSummary, null, 2));

      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Webhook/1.0',
        },
        body: JSON.stringify(payload)
      });

      console.log(`[${execution_id}] Webhook response status: ${response.status}`);
      console.log(`[${execution_id}] Webhook response headers:`, Object.fromEntries(response.headers.entries()));

      // Sempre ler a resposta, mesmo que seja erro
      const responseText = await response.text();
      console.log(`[${execution_id}] Webhook response text: ${responseText}`);

      if (response.ok) {
        console.log(`[${execution_id}] ✅ Webhook enviado com sucesso na tentativa ${attempt}`);
        return { success: true, status: response.status, data: responseText };
      } else {
        // Se for erro 4xx, não retry (erro do cliente/configuração)
        if (response.status >= 400 && response.status < 500) {
          console.log(`[${execution_id}] ❌ Erro 4xx - não retentando: ${response.status} ${responseText}`);
          console.log(`[${execution_id}] 💡 DICA: Verifique se o webhook n8n está configurado corretamente e ativo`);
          throw new Error(`Webhook call failed: ${response.status} ${response.statusText}. Response: ${responseText}`);
        }
        
        // Se for erro 5xx, vamos tentar novamente
        lastError = new Error(`Webhook call failed: ${response.status} ${response.statusText}. Response: ${responseText}`);
        console.log(`[${execution_id}] ⚠️ Erro 5xx na tentativa ${attempt}: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[${execution_id}] 🔄 Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`[${execution_id}] ❌ Erro na tentativa ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[${execution_id}] 🔄 Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.log(`[${execution_id}] ❌ Todas as ${maxRetries} tentativas falharam`);
  console.log(`[${execution_id}] 🔧 DEBUGGING INFO: Verifique se seu n8n workflow está:`);
  console.log(`[${execution_id}]    1. ✅ Ativo/ativado`);
  console.log(`[${execution_id}]    2. ✅ Configurado para aceitar POST requests`);
  console.log(`[${execution_id}]    3. ✅ Retornando status 200`);
  console.log(`[${execution_id}]    4. ✅ Processando o payload corretamente`);
  throw lastError || new Error('Failed to send webhook after all retries');
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

    // Buscar o post completo do banco para obter o array de imagens
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar o post com o array de imagens
    console.log(`[${execution_id}] 🔍 Buscando post no banco: ${post_id}`);
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('images')
      .eq('id', post_id)
      .single();

    if (postError) {
      console.error(`[${execution_id}] Erro ao buscar post:`, postError);
      // Se não conseguir buscar o post, usar formato correto como fallback
      const fallbackImages = image_url ? [{
        id: "image_1",
        url: image_url,
        name: "image.jpg",
        index: 0
      }] : [];
      
      const webhookPayload = {
        content,
        images: fallbackImages,
        images_count: fallbackImages.length,
        has_images: fallbackImages.length > 0,
        first_image: fallbackImages.length > 0 ? fallbackImages[0].url : null,
        timestamp: published_at || new Date().toISOString(),
        // Manter campos originais para compatibilidade
        post_id,
        user_id,
        published_at
      };
      
      console.log(`[${execution_id}] ⚠️ Usando fallback sem múltiplas imagens`);
      await sendWebhook(webhook_url, webhookPayload, execution_id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook enviado com fallback (sem múltiplas imagens)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar múltiplas imagens
    let imagesData = [];
    const imagesArray = postData?.images || [];
    
    console.log(`[${execution_id}] 🖼️ Processando ${imagesArray.length} imagens`);
    
    for (let i = 0; i < imagesArray.length; i++) {
      const imageInfo = imagesArray[i];
      if (imageInfo.storage_path) {
        console.log(`[${execution_id}] Processando imagem ${i + 1}/${imagesArray.length}:`, imageInfo.storage_path);
        const imageData = await getImageAsBase64(imageInfo.storage_path);
        
        if (imageData) {
          imagesData.push({
            ...imageData,
            original_name: imageInfo.name,
            url: imageInfo.url
          });
          console.log(`[${execution_id}] ✅ Imagem ${i + 1} processada com sucesso`);
        } else {
          console.log(`[${execution_id}] ⚠️ Falha ao processar imagem ${i + 1}`);
        }
      }
    }

    // Construir payload no formato que o n8n espera
    const formattedImages = imagesArray.map((imageInfo, index) => ({
      id: `image_${index + 1}`,
      url: imageInfo.url || image_url, // usar URL pública da imagem
      name: imageInfo.name || `image_${index + 1}.jpg`,
      index: index
    }));

    const webhookPayload = {
      content,
      images: formattedImages,
      images_count: formattedImages.length,
      has_images: formattedImages.length > 0,
      first_image: formattedImages.length > 0 ? formattedImages[0].url : null,
      timestamp: published_at || new Date().toISOString(),
      // Manter campos originais para compatibilidade
      post_id,
      user_id,
      published_at
    };

    console.log(`[${execution_id}] ✅ Processadas ${imagesData.length} imagens de ${imagesArray.length} disponíveis`);
    
    // Chamar o webhook usando a função auxiliar
    await sendWebhook(webhook_url, webhookPayload, execution_id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook chamado com múltiplas imagens' 
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