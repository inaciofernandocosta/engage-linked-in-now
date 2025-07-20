-- Atualizar função para chamar o edge function publish-post quando um post é inserido diretamente
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
      'user_id', NEW.user_id
    );
    
    -- Log para debugging
    RAISE LOG 'Post inserido via trigger: % - Webhook URL: %', NEW.id, NEW.webhook_url;
    RAISE LOG 'Chamando webhook para payload: %', webhook_payload;
    
    -- Chamar o webhook usando pg_net se disponível
    BEGIN
      -- Chamar o webhook diretamente
      SELECT net.http_post(
        url := NEW.webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := webhook_payload
      ) INTO response_result;
      
      RAISE LOG 'Webhook chamado com sucesso para post: % - Response: %', NEW.id, response_result;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao chamar webhook para post %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;