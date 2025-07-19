import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== INÍCIO DA FUNÇÃO PUBLISH-POST ===');
    console.log('Headers recebidos:', Object.fromEntries(req.headers.entries()));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('SUPABASE_URL existe:', !!supabaseUrl);
    console.log('SUPABASE_ANON_KEY existe:', !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { content, imageUrl, webhookUrl } = await req.json();
    console.log('Iniciando processo de publicação do post...');
    console.log('Conteúdo:', content);
    console.log('URL da imagem:', imageUrl);
    console.log('Webhook URL:', webhookUrl);

    // Obter o usuário atual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Usuário autenticado:', user.id);

    let finalImageUrl = imageUrl;
    let imageStoragePath = null;

    // Se temos uma URL de imagem, baixar e salvar no storage
    if (imageUrl && imageUrl.startsWith('http')) {
      console.log('Baixando imagem da URL:', imageUrl);
      
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
        }

        const imageBlob = await imageResponse.blob();
        console.log('Imagem baixada com sucesso, tamanho:', imageBlob.size);
        
        // Criar nome único para o arquivo
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}.png`;
        imageStoragePath = fileName;

        // Upload para o storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('post-images')
          .upload(fileName, imageBlob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        console.log('Upload realizado com sucesso:', uploadData);

        // Obter URL pública da imagem
        const { data: publicUrlData } = supabaseClient.storage
          .from('post-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
        console.log('URL pública da imagem:', finalImageUrl);

      } catch (uploadError) {
        console.error('Erro ao processar imagem:', uploadError);
        // Continuar sem a imagem em caso de erro
        finalImageUrl = null;
        imageStoragePath = null;
      }
    }

    // Salvar post no banco de dados
    console.log('Salvando post no banco de dados...');
    const { data: postData, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        user_id: user.id,
        content: content,
        image_url: finalImageUrl,
        image_storage_path: imageStoragePath,
        webhook_url: webhookUrl
      })
      .select()
      .single();

    if (postError) {
      console.error('Erro ao salvar post:', postError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar post no banco de dados', details: postError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Post salvo com sucesso:', postData);

    // Notificar webhook
    if (webhookUrl) {
      console.log('Notificando webhook:', webhookUrl);
      
      try {
        const webhookPayload = {
          post_id: postData.id,
          content: content,
          image_url: finalImageUrl,
          published_at: postData.published_at,
          user_id: user.id
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('Erro no webhook:', webhookResponse.status, webhookResponse.statusText);
          throw new Error(`Webhook retornou status ${webhookResponse.status}`);
        }

        console.log('Webhook notificado com sucesso');

      } catch (webhookError) {
        console.error('Erro ao notificar webhook:', webhookError);
        // Não falhar a operação por causa do webhook
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: postData,
        message: 'Post publicado com sucesso!' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERRO GERAL NA FUNÇÃO ===');
    console.error('Tipo do erro:', typeof error);
    console.error('Nome do erro:', error?.name);
    console.error('Mensagem do erro:', error?.message);
    console.error('Stack trace:', error?.stack);
    console.error('Erro completo:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error?.message || 'Erro desconhecido',
        type: error?.name || 'Unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});