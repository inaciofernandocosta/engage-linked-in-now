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
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não está configurada');
    }

    const { postContent } = await req.json();

    if (!postContent) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo do post é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analisando conteúdo do post para gerar prompt de imagem...');

    // Primeiro, usar GPT para analisar o conteúdo e criar um prompt otimizado para imagem
    const promptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em criar prompts para geração de imagens baseados em conteúdo de posts do LinkedIn. 

Sua tarefa é analisar o conteúdo do post e criar um prompt detalhado e visual que capture a essência do post para gerar uma imagem complementar.

Diretrizes:
- Crie prompts visuais e descritivos
- Foque em elementos que representem o tema principal
- Use estilo profissional adequado para LinkedIn
- Inclua elementos visuais como pessoas, objetos, cenários
- Evite texto na imagem
- Prefira cenas realistas e profissionais
- Use descrições detalhadas de cores, iluminação e composição

Exemplos:
- Post sobre produtividade → "Professional workspace with organized desk, laptop, notebook, and natural lighting, minimalist modern office environment"
- Post sobre liderança → "Confident business leader presenting to team in modern conference room, natural lighting, professional atmosphere"
- Post sobre tecnologia → "Modern tech startup office with developers working on computers, multiple monitors, collaborative environment"

Responda APENAS com o prompt em inglês, sem explicações adicionais.`
          },
          {
            role: 'user',
            content: `Analise este post do LinkedIn e crie um prompt para gerar uma imagem relacionada:\n\n${postContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!promptResponse.ok) {
      const errorData = await promptResponse.text();
      console.error('Erro ao gerar prompt:', errorData);
      throw new Error(`Erro ao analisar conteúdo: ${promptResponse.status}`);
    }

    const promptData = await promptResponse.json();
    const imagePrompt = promptData.choices[0].message.content.trim();
    
    console.log('Prompt gerado:', imagePrompt);

    // Agora gerar a imagem com o prompt criado
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      }),
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.text();
      console.error('Erro da API OpenAI para imagem:', errorData);
      throw new Error(`Erro na geração de imagem: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    console.log('Imagem gerada com sucesso baseada no conteúdo');

    if (!imageData.data || !imageData.data[0] || !imageData.data[0].url) {
      throw new Error('Resposta inválida da API OpenAI para imagem');
    }

    // Retorna a URL da imagem junto com o prompt usado
    return new Response(
      JSON.stringify({ 
        success: true,
        image: imageData.data[0].url,
        prompt: imagePrompt,
        originalContent: postContent.substring(0, 100) + '...' // Preview do conteúdo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na análise e geração de imagem:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao analisar post e gerar imagem', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});