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

// Função auxiliar para upload de imagem para storage
const uploadImageToStorage = async (
  base64Data: string, 
  fileName: string, 
  userId: string, 
  supabaseAdmin: any
): Promise<{ success: boolean; url?: string; path?: string }> => {
  try {
    console.log('Fazendo upload da imagem para storage...');
    
    // Extrair dados base64 e tipo MIME
    const [header, base64Content] = base64Data.split(',');
    if (!base64Content) {
      throw new Error('Dados base64 inválidos - não foi possível extrair dados após vírgula');
    }
    
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const extension = mimeType.includes('jpeg') ? 'jpg' : 
                     mimeType.includes('png') ? 'png' : 
                     mimeType.includes('webp') ? 'webp' : 'jpg';
    
    console.log('Base64 data length:', base64Content.length);
    console.log('MIME type detected:', mimeType);
    
    const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    console.log('Image buffer created, length:', imageBuffer.length);
    
    // Gerar nome único para o arquivo
    const fileBaseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extensão
    const uniqueFileName = `${userId}/${Date.now()}-${fileBaseName}.${extension}`;
    
    console.log('Upload filename:', uniqueFileName);
    
    // Upload para storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('post-images')
      .upload(uniqueFileName, imageBuffer, {
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
      .getPublicUrl(uniqueFileName);
      
    console.log('Upload realizado com sucesso. URL:', urlData.publicUrl);
    
    return {
      success: true,
      url: urlData.publicUrl,
      path: uniqueFileName
    };
    
  } catch (uploadError) {
    console.error('ERRO processamento imagem:', uploadError);
    return { success: false };
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

    const { content, images, imageUrl, imageBase64, webhookUrl, status } = body;
    console.log('Content:', content);
    console.log('Images:', images ? `${images.length} images` : 'não presente');
    console.log('ImageUrl (legacy):', imageUrl);
    console.log('ImageBase64 (legacy):', imageBase64 ? 'presente' : 'não presente');
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

    // 6. Processar upload de múltiplas imagens
    let finalImageUrl: string | null = null; // Manter para compatibilidade
    let imagePath: string | null = null; // Manter para compatibilidade
    let processedImages: Array<{ url: string; name: string; storage_path?: string }> = [];
    
    console.log('=== PROCESSAMENTO DE MÚLTIPLAS IMAGENS ===');
    
    // Processar novo formato de múltiplas imagens
    if (images && Array.isArray(images) && images.length > 0) {
      console.log('Processando múltiplas imagens:', images.length);
      
      try {
        for (const [index, imageData] of images.entries()) {
          console.log(`Processando imagem ${index + 1}/${images.length}`);
          
          let processedImageUrl: string | null = null;
          let processedImagePath: string | null = null;
          
          try {
            // Se é uma URL externa, converter para base64
            if (imageData.isExternal && imageData.url.startsWith('http')) {
              console.log('Convertendo URL externa para base64...');
              const convertedBase64 = await convertUrlToBase64(imageData.url);
              
              if (convertedBase64) {
                // Upload da imagem convertida
                const uploadResult = await uploadImageToStorage(convertedBase64, imageData.name, user.id, supabaseAdmin);
                if (uploadResult.success) {
                  processedImageUrl = uploadResult.url;
                  processedImagePath = uploadResult.path;
                }
              }
            } 
            // Se é base64, fazer upload direto
            else if (imageData.isBase64 && imageData.url.startsWith('data:')) {
              console.log('Fazendo upload de imagem base64...');
              const uploadResult = await uploadImageToStorage(imageData.url, imageData.name, user.id, supabaseAdmin);
              if (uploadResult.success) {
                processedImageUrl = uploadResult.url;
                processedImagePath = uploadResult.path;
              }
            }
            
            // Adicionar imagem processada ao array
            if (processedImageUrl) {
              processedImages.push({
                url: processedImageUrl,
                name: imageData.name,
                storage_path: processedImagePath
              });
              
              // Manter compatibilidade - usar primeira imagem como principal
              if (index === 0) {
                finalImageUrl = processedImageUrl;
                imagePath = processedImagePath;
              }
              
              console.log(`✅ Imagem ${index + 1} processada com sucesso: ${processedImageUrl.substring(0, 50)}...`);
            } else {
              console.warn(`⚠️ Falha ao processar imagem ${index + 1}: ${imageData.name}`);
            }
          } catch (imageError) {
            console.error(`❌ Erro ao processar imagem ${index + 1}:`, imageError);
            // Continuar processando as outras imagens
          }
        }
        
        console.log(`Total de imagens processadas: ${processedImages.length}`);
      } catch (batchError) {
        console.error('❌ Erro no processamento em lote de imagens:', batchError);
        // Continuar com o post mesmo se houver problema com as imagens
      }
    }
    // Fallback para formato legado (compatibilidade)
    else if (imageUrl || imageBase64) {
      console.log('Processando imagem legada (compatibilidade)...');
      let processedBase64: string | null = imageBase64;
      
      if (imageUrl && !imageBase64) {
        console.log('Convertendo URL legada para base64...');
        processedBase64 = await convertUrlToBase64(imageUrl);
      }
      
      if (processedBase64 && processedBase64.startsWith('data:')) {
        const uploadResult = await uploadImageToStorage(processedBase64, 'legacy-image.jpg', user.id, supabaseAdmin);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.url;
          imagePath = uploadResult.path;
          processedImages.push({
            url: uploadResult.url,
            name: 'legacy-image.jpg',
            storage_path: uploadResult.path
          });
        }
      }
    }
    
    console.log(`Total de imagens processadas: ${processedImages.length}`);

    // 7. Inserir post com status especificado
    console.log('Inserindo post...');
    const postData = {
      user_id: user.id,
      content: content,
      image_url: finalImageUrl || null, // Manter para compatibilidade
      image_storage_path: imagePath, // Manter para compatibilidade  
      images: processedImages.length > 0 ? processedImages : [],
      webhook_url: webhookUrl || null,
      status: status || 'pending'
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