
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para converter URL em base64 no backend
const convertUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    console.log('Baixando imagem via Deno fetch:', url.substring(0, 50) + '...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Supabase-Function/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Converter usando chunks para evitar stack overflow
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 8192; // 8KB chunks
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64 = btoa(binaryString);
    
    // Detectar tipo MIME da imagem
    const contentType = response.headers.get('content-type') || 'image/png';
    
    console.log('Conversão concluída. Base64 length:', base64.length);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Erro ao converter URL para base64:', error);
    return null;
  }
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

    const { content, imageUrl, imageBase64, webhookUrl, status } = body;
    console.log('Content:', content);
    console.log('ImageUrl:', imageUrl);
    console.log('ImageBase64:', imageBase64 ? 'presente' : 'não presente');
    console.log('WebhookUrl:', webhookUrl);
    console.log('Status:', status || 'não especificado (default: pending)');

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
    let finalImageUrl: string | null = null;
    let imagePath: string | null = null;
    let processedBase64: string | null = imageBase64;
    
    console.log('=== PROCESSAMENTO DE IMAGEM ===');
    console.log('imageBase64 presente?:', !!imageBase64);
    console.log('imageBase64 length:', imageBase64 ? imageBase64.length : 0);
    console.log('imageBase64 é base64?:', imageBase64 && imageBase64.startsWith('data:'));
    console.log('imageUrl presente?:', !!imageUrl);

    // Se há uma URL de imagem mas não base64, converter URL para base64
    if (imageUrl && !imageBase64) {
      console.log('Convertendo URL para base64 no backend...');
      processedBase64 = await convertUrlToBase64(imageUrl);
      
      if (!processedBase64) {
        console.log('Falha na conversão URL->base64, continuando sem imagem');
      } else {
        console.log('Conversão URL->base64 realizada com sucesso');
      }
    }
    
    if (processedBase64 && processedBase64.startsWith('data:')) {
      console.log('Fazendo upload da imagem para storage...');
      try {
        // Extrair dados base64 e tipo MIME
        const [header, base64Data] = processedBase64.split(',');
        if (!base64Data) {
          throw new Error('Dados base64 inválidos - não foi possível extrair dados após vírgula');
        }
        
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const extension = mimeType.includes('jpeg') ? 'jpg' : 
                         mimeType.includes('png') ? 'png' : 
                         mimeType.includes('webp') ? 'webp' : 'jpg';
        
        console.log('Base64 data length:', base64Data.length);
        console.log('MIME type detected:', mimeType);
        
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        console.log('Image buffer created, length:', imageBuffer.length);
        
        // Gerar nome único para o arquivo
        const fileName = `${user.id}/${Date.now()}.${extension}`;
        imagePath = fileName;
        console.log('Upload filename:', fileName);
        
        // Upload para storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('post-images')
          .upload(fileName, imageBuffer, {
            contentType: mimeType,
            upsert: false
          });
          
        if (uploadError) {
          console.error('ERRO upload storage:', uploadError);
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }
        
        console.log('Upload data:', uploadData);
        
        // Obter URL pública
        const { data: urlData } = supabaseAdmin.storage
          .from('post-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = urlData.publicUrl;
        console.log('Upload realizado com sucesso. URL:', finalImageUrl);
        
      } catch (uploadError) {
        console.error('ERRO processamento imagem:', uploadError);
        // Continuar sem imagem se upload falhar, não retornar erro
        console.log('Continuando sem imagem devido ao erro de upload');
        finalImageUrl = null;
        imagePath = null;
      }
    } else {
      console.log('Nenhuma imagem para processar');
    }

    // 7. Inserir post com status especificado
    console.log('Inserindo post...');
    const postData = {
      user_id: user.id,
      content: content,
      image_url: finalImageUrl || null,
      image_storage_path: imagePath,
      webhook_url: webhookUrl || null, // Salvar webhook_url para que o trigger possa usar
      status: status || 'pending' // Default para pending se não especificado
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

    // WEBHOOK REMOVIDO - Agora é responsabilidade do trigger do banco de dados
    console.log('=== WEBHOOK SERÁ PROCESSADO PELO TRIGGER DO BANCO ===');
    console.log('Webhook URL salvo no post:', webhookUrl);
    console.log('Trigger do banco irá processar o webhook automaticamente');

    console.log('=== SUCESSO TOTAL ===');
    return new Response(
      JSON.stringify({ 
        success: true, 
        post: insertedPost,
        message: 'Post publicado! Webhook será processado pelo trigger do banco.' 
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
