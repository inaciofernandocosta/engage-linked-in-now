import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== PUBLISH-POST FUNÇÃO INICIADA ===');
  console.log('Método:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Respondendo OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('SUPABASE_URL existe:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY existe:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente faltando!');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase com service role para bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Obter dados do body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Body recebido:', requestBody);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', e);
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { content, imageUrl, webhookUrl } = requestBody;

    if (!content?.trim()) {
      console.error('Conteúdo está vazio');
      return new Response(
        JSON.stringify({ error: 'Conteúdo é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obter usuário do JWT token
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.error('Header de autorização ausente');
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente com auth para obter usuário
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado', details: userError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Usuário autenticado:', user.id);

    let finalImageUrl = imageUrl;
    let imageStoragePath = null;

    // Processar imagem se fornecida
    if (imageUrl && imageUrl.startsWith('http')) {
      console.log('Processando imagem:', imageUrl);
      
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
        }

        const imageBlob = await imageResponse.blob();
        console.log('Imagem baixada, tamanho:', imageBlob.size);
        
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}.png`;
        imageStoragePath = fileName;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('post-images')
          .upload(fileName, imageBlob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        console.log('Upload realizado:', uploadData);

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('post-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
        console.log('URL pública gerada:', finalImageUrl);

      } catch (uploadError) {
        console.error('Erro ao processar imagem:', uploadError);
        // Continuar sem a imagem em caso de erro
        finalImageUrl = null;
        imageStoragePath = null;
      }
    }

    // Salvar post no banco
    console.log('Salvando post no banco...');
    const { data: postData, error: postError } = await supabaseAdmin
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
        JSON.stringify({ error: 'Erro ao salvar post', details: postError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Post salvo com sucesso:', postData.id);

    // Notificar webhook se fornecido
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

        console.log('Webhook response status:', webhookResponse.status);

        if (!webhookResponse.ok) {
          console.warn('Webhook falhou mas continuando...');
        } else {
          console.log('Webhook notificado com sucesso');
        }

      } catch (webhookError) {
        console.error('Erro no webhook (não crítico):', webhookError);
        // Não falhar a operação por causa do webhook
      }
    }

    console.log('=== PUBLICAÇÃO CONCLUÍDA COM SUCESSO ===');
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
    console.error('Erro:', error);
    console.error('Stack:', error?.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error?.message || 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});