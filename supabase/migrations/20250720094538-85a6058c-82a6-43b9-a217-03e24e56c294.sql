-- Inserir um post de teste para verificar se o webhook funciona
INSERT INTO posts (user_id, content, webhook_url) 
VALUES (
  'ded843d2-0301-432c-aace-b899da79bbe5',
  '🔔 TESTE DE WEBHOOK - Este é um post de teste para verificar se o webhook está funcionando corretamente. Se você receber esta notificação, significa que o sistema está enviando os dados para o endpoint correto! ✅ #Teste #Webhook',
  'https://eo6y8yafmyxp7kj.m.pipedream.net'
);