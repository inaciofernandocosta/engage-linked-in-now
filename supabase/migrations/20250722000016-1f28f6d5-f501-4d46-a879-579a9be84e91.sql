-- Corrigir função do trigger para evitar execução dupla
-- O problema: após enviar webhook, o trigger atualiza o status para 'published'
-- isso causa o trigger ser executado novamente, enviando webhook duplicado

CREATE OR REPLACE FUNCTION public.trigger_webhook_on_approved_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_payload jsonb;
  response_result jsonb;
  execution_id text;
BEGIN
  -- Gerar ID único para esta execução
  execution_id := 'exec_' || extract(epoch from now()) || '_' || gen_random_uuid()::text;
  
  -- Log inicial com ID único
  RAISE LOG '[%] TRIGGER EXECUTADO - Post ID: %, Status: %, Webhook URL: %', execution_id, NEW.id, NEW.status, NEW.webhook_url;
  
  -- IMPORTANTE: Só processar se o status mudou para 'approved' (não 'published')
  -- E só se o status anterior era diferente (evitar loops)
  IF (NEW.status = 'approved') AND 
     (OLD.status IS NULL OR OLD.status != 'approved') AND 
     NEW.webhook_url IS NOT NULL THEN
    
    -- Construir payload incluindo path da imagem para o edge function processar
    webhook_payload := jsonb_build_object(
      'post_id', NEW.id,
      'content', NEW.content,
      'image_url', NEW.image_url,
      'image_storage_path', NEW.image_storage_path,
      'published_at', NEW.published_at,
      'user_id', NEW.user_id,
      'webhook_url', NEW.webhook_url,
      'status', NEW.status,
      'execution_id', execution_id
    );
    
    -- Log do payload com ID
    RAISE LOG '[%] Payload para webhook: %', execution_id, webhook_payload;
    
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
      
      RAISE LOG '[%] Webhook response: %', execution_id, response_result;
      
      -- REMOVER esta linha que estava causando o loop:
      -- UPDATE public.posts SET status = 'published', published_at = now() WHERE id = NEW.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG '[%] ERRO no webhook: %', execution_id, SQLERRM;
    END;
  ELSE
    RAISE LOG '[%] Post com status % - não enviando webhook', execution_id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;