import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== PUBLISH-POST INICIADO ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('ENV CHECK:');
    console.log('- SUPABASE_URL:', !!supabaseUrl);
    console.log('- SERVICE_KEY:', !!supabaseServiceKey);
    console.log('- ANON_KEY:', !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERRO: Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ error: 'Configuração incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse do body
    let body;
    try {
      const text = await req.text();
      console.log('Raw body:', text);
      body = JSON.parse(text);
      console.log('Parsed body:', body);
    } catch (e) {
      console.error('ERRO: Parse JSON falhou:', e);
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, imageUrl, imageBase64, webhookUrl } = body;
    console.log('Content:', content);
    console.log('ImageUrl:', imageUrl);
    console.log('ImageBase64:', imageBase64 ? 'presente' : 'não presente');
    console.log('WebhookUrl:', webhookUrl);

    if (!content?.trim()) {
      console.error('ERRO: Conteúdo vazio');
      return new Response(
        JSON.stringify({ error: 'Conteúdo obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader) {
      console.error('ERRO: Header de auth ausente');
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Obter usuário do JWT token
    console.log('Decodificando JWT token...');
    
    // Extrair o token do header Authorization
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído:', token ? 'presente' : 'ausente');
    
    // Criar client administrativo para decodificar o JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar o token JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('ERRO JWT verificação:', userError);
      return new Response(
        JSON.stringify({ error: 'Token inválido', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('ERRO: User não encontrado no token');
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado no token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', user.id);

    // 5. Testar conexão com o banco
    
    // Teste rápido de conexão
    console.log('Testando conexão admin...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('posts')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('ERRO: Teste conexão falhou:', testError);
      return new Response(
        JSON.stringify({ error: 'Falha conexão DB', details: testError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Conexão admin OK');

    // 6. Processar upload de imagem (se necessário)
    let finalImageUrl = imageUrl;
    let imagePath = null;
    
    if (imageBase64) {
      console.log('Fazendo upload da imagem para storage...');
      try {
        // Converter base64 para blob
        const base64Data = imageBase64.split(',')[1]; // Remove data:image/...;base64,
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Gerar nome único para o arquivo
        const fileName = `${user.id}/${Date.now()}.jpg`;
        imagePath = fileName;
        
        // Upload para storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('post-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
          
        if (uploadError) {
          console.error('ERRO upload storage:', uploadError);
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }
        
        // Obter URL pública
        const { data: urlData } = supabaseAdmin.storage
          .from('post-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = urlData.publicUrl;
        console.log('Upload realizado com sucesso. URL:', finalImageUrl);
        
      } catch (uploadError) {
        console.error('ERRO processamento imagem:', uploadError);
        return new Response(
          JSON.stringify({ 
            error: 'Falha no upload da imagem', 
            details: uploadError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 7. Inserir post
    console.log('Inserindo post...');
    const postData = {
      user_id: user.id,
      content: content,
      image_url: finalImageUrl || null,
      image_storage_path: imagePath,
      webhook_url: webhookUrl || null
    };
    
    console.log('Dados a inserir:', postData);

    const { data: insertedPost, error: insertError } = await supabaseAdmin
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (insertError) {
      console.error('ERRO INSERT:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao inserir post', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('POST INSERIDO COM SUCESSO:', insertedPost);

    // 7. Notificar webhook (se fornecido)
    if (webhookUrl) {
      console.log('Notificando webhook...');
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: insertedPost.id,
            content: content,
            image_url: finalImageUrl,
            published_at: insertedPost.published_at,
            user_id: user.id
          }),
        });
        console.log('Webhook status:', webhookResponse.status);
      } catch (webhookError) {
        console.error('Webhook falhou (não crítico):', webhookError);
      }
    }

    console.log('=== SUCESSO TOTAL ===');
    return new Response(
      JSON.stringify({ 
        success: true, 
        post: insertedPost,
        message: 'Post publicado!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== ERRO GERAL ===');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno', 
        details: error?.message,
        name: error?.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});