-- Remover o trigger duplicado que está causando webhooks duplos
DROP TRIGGER IF EXISTS trigger_webhook_after_post_update ON public.posts;

-- Confirmar que só temos o trigger de INSERT (que é o correto)
-- O trigger trigger_webhook_after_post_insert deve permanecer ativo