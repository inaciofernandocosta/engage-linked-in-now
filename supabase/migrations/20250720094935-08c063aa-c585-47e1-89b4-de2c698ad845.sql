-- Inserir outro post de teste para verificar se o novo sistema funciona
INSERT INTO posts (user_id, content, webhook_url) 
VALUES (
  'ded843d2-0301-432c-aace-b899da79bbe5',
  '🚀 TESTE FINAL DO WEBHOOK - Este post deve chamar o edge function webhook-trigger que irá notificar o endpoint no Pipedream. Funcionou? ✅ #TesteFinal',
  'https://eo6y8yafmyxp7kj.m.pipedream.net'
);