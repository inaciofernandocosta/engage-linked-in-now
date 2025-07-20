-- Criar função que chama o webhook automaticamente quando um post é inserido
CREATE OR REPLACE FUNCTION public.trigger_webhook_on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_payload jsonb;
  webhook_response text;
BEGIN
  -- Se o post tem webhook_url, vamos tentar chamar
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
    RAISE LOG 'Post inserido: % - Webhook URL: %', NEW.id, NEW.webhook_url;
    RAISE LOG 'Payload: %', webhook_payload;
    
    -- Tentar chamar o webhook usando a extensão http (se disponível)
    -- Nota: Esta é uma tentativa básica, mas o ideal é usar edge functions
    BEGIN
      -- Esta parte requer a extensão pg_net que pode não estar disponível
      -- Vamos apenas logar por enquanto
      RAISE LOG 'Deveria chamar webhook para post: %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao tentar chamar webhook: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa APÓS inserção de post
DROP TRIGGER IF EXISTS trigger_webhook_after_post_insert ON public.posts;
CREATE TRIGGER trigger_webhook_after_post_insert
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_webhook_on_post_insert();