-- Verificar se a função existe e recriar o trigger
CREATE OR REPLACE FUNCTION public.trigger_webhook_on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_payload jsonb;
  response_result jsonb;
BEGIN
  -- Log inicial
  RAISE LOG 'TRIGGER EXECUTADO - Post ID: %, Webhook URL: %', NEW.id, NEW.webhook_url;
  
  -- Se o post tem webhook_url, vamos chamar o edge function
  IF NEW.webhook_url IS NOT NULL THEN
    -- Construir payload
    webhook_payload := jsonb_build_object(
      'post_id', NEW.id,
      'content', NEW.content,
      'image_url', NEW.image_url,
      'published_at', NEW.published_at,
      'user_id', NEW.user_id,
      'webhook_url', NEW.webhook_url
    );
    
    -- Log do payload
    RAISE LOG 'Payload para webhook: %', webhook_payload;
    
    -- Chamar o edge function webhook-trigger
    BEGIN
      SELECT net.http_post(
        url := 'https://qigkqfhtmhivxrfongzm.supabase.co/functions/v1/webhook-trigger',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ2txZmh0bWhpdnhyZm9uZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDE1NzIsImV4cCI6MjA2ODUxNzU3Mn0.DDjYenQsYg6lbWqWFCC2m-BcW9LkuSBL5vgPz_JIJxo'
        ),
        body := webhook_payload
      ) INTO response_result;
      
      RAISE LOG 'Webhook response: %', response_result;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'ERRO no webhook: %', SQLERRM;
    END;
  ELSE
    RAISE LOG 'Post sem webhook_url - não enviando notificação';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger existente (se houver) e criar novo
DROP TRIGGER IF EXISTS trigger_webhook_after_post_insert ON public.posts;
CREATE TRIGGER trigger_webhook_after_post_insert
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_webhook_on_post_insert();