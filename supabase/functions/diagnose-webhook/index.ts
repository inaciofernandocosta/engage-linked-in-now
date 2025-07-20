import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== DIAGNÓSTICO WEBHOOK ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = "https://eo6y8yafmyxp7kj.m.pipedream.net";
    
    // Teste 1: Verificar se o endpoint responde
    console.log('=== TESTE 1: Verificando se endpoint responde ===');
    
    let test1Result;
    try {
      const simpleTest = await fetch(webhookUrl, {
        method: 'GET',
      });
      test1Result = {
        status: simpleTest.status,
        statusText: simpleTest.statusText,
        headers: Object.fromEntries(simpleTest.headers.entries()),
        text: await simpleTest.text()
      };
      console.log('GET Test Result:', JSON.stringify(test1Result, null, 2));
    } catch (error) {
      test1Result = { error: error.message };
      console.log('GET Test Error:', error.message);
    }

    // Teste 2: POST simples
    console.log('=== TESTE 2: POST simples ===');
    
    let test2Result;
    try {
      const postTest = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: "hello world", timestamp: new Date().toISOString() }),
      });
      test2Result = {
        status: postTest.status,
        statusText: postTest.statusText,
        headers: Object.fromEntries(postTest.headers.entries()),
        text: await postTest.text()
      };
      console.log('POST Test Result:', JSON.stringify(test2Result, null, 2));
    } catch (error) {
      test2Result = { error: error.message };
      console.log('POST Test Error:', error.message);
    }

    // Teste 3: POST com payload completo de LinkedIn
    console.log('=== TESTE 3: POST com payload LinkedIn ===');
    
    const linkedinPayload = {
      post_id: "diagnostic-test-001",
      content: "🚨 DIAGNÓSTICO URGENTE - Se você receber este teste, responda imediatamente que funcionou!",
      image_url: null,
      published_at: new Date().toISOString(),
      user_id: "diagnostic-user"
    };

    let test3Result;
    try {
      const linkedinTest = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Function/1.0',
        },
        body: JSON.stringify(linkedinPayload),
      });
      test3Result = {
        status: linkedinTest.status,
        statusText: linkedinTest.statusText,
        headers: Object.fromEntries(linkedinTest.headers.entries()),
        text: await linkedinTest.text()
      };
      console.log('LinkedIn Test Result:', JSON.stringify(test3Result, null, 2));
    } catch (error) {
      test3Result = { error: error.message };
      console.log('LinkedIn Test Error:', error.message);
    }

    console.log('=== DIAGNÓSTICO COMPLETO ===');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        webhook_url: webhookUrl,
        tests: {
          get_test: test1Result,
          simple_post_test: test2Result,
          linkedin_payload_test: test3Result
        },
        message: 'Diagnóstico completo realizado'
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ERRO NO DIAGNÓSTICO:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro no diagnóstico do webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});