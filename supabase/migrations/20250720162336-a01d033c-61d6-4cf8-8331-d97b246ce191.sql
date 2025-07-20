-- Atualizar função do trigger para incluir dados da imagem em base64
CREATE OR REPLACE FUNCTION public.trigger_webhook_on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_payload jsonb;
  response_result jsonb;
  execution_id text;
  image_base64 text;
  image_content_type text;
BEGIN
  -- Gerar ID único para esta execução
  execution_id := 'exec_' || extract(epoch from now()) || '_' || gen_random_uuid()::text;
  
  -- Log inicial com ID único
  RAISE LOG '[%] TRIGGER EXECUTADO - Post ID: %, Webhook URL: %', execution_id, NEW.id, NEW.webhook_url;
  
  -- Se o post tem webhook_url, vamos chamar o edge function
  IF NEW.webhook_url IS NOT NULL THEN
    
    -- Se há image_storage_path, buscar os dados da imagem
    image_base64 := NULL;
    image_content_type := NULL;
    
    IF NEW.image_storage_path IS NOT NULL THEN
      BEGIN
        -- Buscar dados da imagem do storage usando pg_net (se disponível)
        -- Como não podemos acessar diretamente o storage aqui, vamos incluir o path para o edge function processar
        RAISE LOG '[%] Imagem encontrada no path: %', execution_id, NEW.image_storage_path;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG '[%] Erro ao processar imagem: %', execution_id, SQLERRM;
      END;
    END IF;
    
    -- Construir payload incluindo path da imagem para o edge function processar
    webhook_payload := jsonb_build_object(
      'post_id', NEW.id,
      'content', NEW.content,
      'image_url', NEW.image_url,
      'image_storage_path', NEW.image_storage_path,
      'published_at', NEW.published_at,
      'user_id', NEW.user_id,
      'webhook_url', NEW.webhook_url,
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
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG '[%] ERRO no webhook: %', execution_id, SQLERRM;
    END;
  ELSE
    RAISE LOG '[%] Post sem webhook_url - não enviando notificação', execution_id;
  END IF;
  
  RETURN NEW;
END;
$$;