import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    console.log('Starting content generation process...');

    // Check if OpenAI API key is configured
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { content, useEmojis, size, tone, objective } = await req.json();

    if (!content) {
      console.log('No content provided in request');
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Content received, length:', content.length);
    console.log('Parameters:', { useEmojis, size, tone, objective });
    console.log('Calling OpenAI API...');

    // Build the system prompt based on parameters
    let systemPrompt = `Você é um especialista em criação de conteúdo para LinkedIn. Sua tarefa é transformar as instruções/rascunho do usuário em um post profissional e engajante.

INSTRUÇÕES:
1. Transforme o texto fornecido em um post bem estruturado para LinkedIn
2. Mantenha o contexto e a mensagem principal do usuário
3. Melhore a gramática, ortografia e clareza
4. Use uma linguagem profissional mas acessível
5. Estruture o texto com quebras de linha adequadas
6. Adicione hashtags relevantes ao final do post`;

    // Add emoji instruction if requested
    if (useEmojis) {
      systemPrompt += `
7. Use emojis de forma estratégica para tornar o post mais visual e engajante`;
    } else {
      systemPrompt += `
7. NÃO use emojis no post`;
    }

    // Add size guidance
    switch (size) {
      case 'short':
        systemPrompt += `
8. Mantenha o post CURTO (máximo 500 caracteres) e direto ao ponto`;
        break;
      case 'medium':
        systemPrompt += `
8. Crie um post de tamanho MÉDIO (500-1500 caracteres) com boa estrutura`;
        break;
      case 'long':
        systemPrompt += `
8. Desenvolva um post LONGO (1500-3000 caracteres) com detalhes e storytelling`;
        break;
    }

    // Add tone guidance
    switch (tone) {
      case 'professional':
        systemPrompt += `
9. Use um tom PROFISSIONAL e corporativo`;
        break;
      case 'casual':
        systemPrompt += `
9. Use um tom CASUAL e amigável, mais próximo`;
        break;
      case 'inspirational':
        systemPrompt += `
9. Use um tom INSPIRACIONAL e motivador`;
        break;
    }

    // Add objective guidance
    switch (objective) {
      case 'engagement':
        systemPrompt += `
10. Foque em gerar ENGAJAMENTO - faça perguntas, incentive comentários e interações`;
        break;
      case 'information':
        systemPrompt += `
10. Foque em compartilhar INFORMAÇÃO valiosa e educativa`;
        break;
      case 'personal':
        systemPrompt += `
10. Foque no aspecto PESSOAL - conte uma história, compartilhe experiências`;
        break;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Transforme este rascunho/instruções em um post profissional para LinkedIn:\n\n${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate content', 
          details: errorData.error?.message || 'Unknown error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error('No generated content received from OpenAI');
      return new Response(
        JSON.stringify({ error: 'No generated content received' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Content generated successfully, length:', generatedContent.length);

    return new Response(
      JSON.stringify({ generatedContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});