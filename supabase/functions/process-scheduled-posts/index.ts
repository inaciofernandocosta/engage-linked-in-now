import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== PROCESS-SCHEDULED-POSTS INICIADO ===');
  console.log('Method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERRO: Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ error: 'Configuração incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar client administrativo
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Verificando posts agendados...');
    
    // Buscar posts pendentes com agendamento que já venceu
    const { data: scheduledPosts, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) {
      console.error('Erro ao buscar posts agendados:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Falha ao buscar posts agendados', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${scheduledPosts?.length || 0} posts para processar`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0,
          message: 'Nenhum post agendado para processar' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    const errors: any[] = [];

    // Processar cada post agendado
    for (const post of scheduledPosts) {
      try {
        console.log(`Processando post ${post.id} agendado para ${post.scheduled_for}`);
        
        // Atualizar status para aprovado, o que irá triggerar o webhook
        const { error: updateError } = await supabaseAdmin
          .from('posts')
          .update({ status: 'approved' })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Erro ao aprovar post ${post.id}:`, updateError);
          errors.push({ postId: post.id, error: updateError.message });
        } else {
          console.log(`Post ${post.id} aprovado com sucesso`);
          processedCount++;
        }
      } catch (error) {
        console.error(`Erro inesperado ao processar post ${post.id}:`, error);
        errors.push({ postId: post.id, error: error.message });
      }
    }

    console.log(`=== PROCESSAMENTO CONCLUÍDO ===`);
    console.log(`Posts processados: ${processedCount}`);
    console.log(`Erros: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: processedCount,
        total: scheduledPosts.length,
        errors: errors,
        message: `Processados ${processedCount} de ${scheduledPosts.length} posts agendados`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== ERRO GERAL ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno', 
        details: error?.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});