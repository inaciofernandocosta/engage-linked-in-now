-- Atualizar todos os posts existentes para usar o novo webhook n8n
UPDATE posts 
SET webhook_url = 'https://n8n-n8n-start.43ir9u.easypanel.host/webhook/instagran' 
WHERE webhook_url LIKE '%pipedream.net%';

-- Inserir um post de teste para o novo webhook n8n
INSERT INTO posts (user_id, content, webhook_url) 
VALUES (
  'ded843d2-0301-432c-aace-b899da79bbe5',
  '🚀 MIGRAÇÃO COMPLETA - Webhook agora está configurado para N8N! Este post deve aparecer no novo sistema. ✅ #MigraçãoN8N',
  'https://n8n-n8n-start.43ir9u.easypanel.host/webhook/instagran'
);