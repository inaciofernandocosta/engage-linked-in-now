
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
    console.log('Starting content correction process...');

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

    const { content } = await req.json();

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
    console.log('Calling OpenAI API...');

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
            content: `Você é um editor profissional de conteúdo para posts do LinkedIn. Sua tarefa é corrigir gramática, ortografia e melhorar a clareza do texto mantendo:
            1. A formatação EXATA (quebras de linha, emojis, hashtags, bullet points)
            2. O tom e estilo originais
            3. A mesma estrutura e organização
            4. Fazendo apenas correções necessárias de gramática, ortografia e clareza
            5. Não adicionar ou remover conteúdo a menos que seja absolutamente necessário para clareza
            6. Manter todos os emojis, hashtags e caracteres especiais em suas posições originais`
          },
          {
            role: 'user',
            content: `Por favor, corrija este conteúdo de post do LinkedIn preservando sua formatação exata:\n\n${content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to correct content', 
          details: errorData.error?.message || 'Unknown error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const correctedContent = data.choices?.[0]?.message?.content;

    if (!correctedContent) {
      console.error('No corrected content received from OpenAI');
      return new Response(
        JSON.stringify({ error: 'No corrected content received' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Content corrected successfully, length:', correctedContent.length);

    return new Response(
      JSON.stringify({ correctedContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in correct-content function:', error);
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
