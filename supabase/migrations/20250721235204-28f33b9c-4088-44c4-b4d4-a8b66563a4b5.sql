-- Remover o trigger que chama webhook para qualquer insert
-- Este trigger está causando o problema: chama webhook mesmo para posts pendentes
DROP TRIGGER IF EXISTS trigger_webhook_after_post_insert ON public.posts;

-- Manter apenas o trigger correto que verifica o status antes de chamar webhook
-- O trigger "trigger_post_webhook_on_approval" já tem a lógica correta