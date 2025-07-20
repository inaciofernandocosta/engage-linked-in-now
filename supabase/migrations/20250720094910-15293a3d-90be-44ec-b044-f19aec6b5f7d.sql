-- Atualizar função para chamar edge function em vez de pg_net diretamente
CREATE OR REPLACE FUNCTION public.trigger_webhook_on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_payload jsonb;
  response_result jsonb;
BEGIN
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
    
    -- Log para debugging
    RAISE LOG 'Post inserido via trigger: % - Webhook URL: %', NEW.id, NEW.webhook_url;
    RAISE LOG 'Chamando edge function webhook-trigger com payload: %', webhook_payload;
    
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
      
      RAISE LOG 'Edge function webhook-trigger response: %', response_result;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao chamar edge function webhook-trigger para post %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;