-- Corrigir a lógica do trigger para não atualizar o status para published automaticamente
-- Isso evita loop infinito no trigger
CREATE OR REPLACE FUNCTION trigger_webhook_on_approved_post()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  response_result jsonb;
  execution_id text;
BEGIN
  -- Gerar ID único para esta execução
  execution_id := 'exec_' || extract(epoch from now()) || '_' || gen_random_uuid()::text;
  
  -- Log inicial com ID único
  RAISE LOG '[%] TRIGGER EXECUTADO - Post ID: %, Status OLD: %, Status NEW: %, Webhook URL: %', 
    execution_id, NEW.id, COALESCE(OLD.status, 'NULL'), NEW.status, NEW.webhook_url;
  
  -- IMPORTANTE: Só processar se o status mudou para 'approved' 
  -- E só se o status anterior era diferente (evitar loops)
  IF (NEW.status = 'approved') AND 
     (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'approved') AND 
     NEW.webhook_url IS NOT NULL THEN
    
    -- Construir payload incluindo dados do post para a edge function
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
    RAISE LOG '[%] Chamando edge function webhook-trigger com payload', execution_id;
    
    -- Chamar a NOSSA edge function webhook-trigger que processa múltiplas imagens
    BEGIN
      SELECT net.http_post(
        url := 'https://qigkqfhtmhivxrfongzm.supabase.co/functions/v1/webhook-trigger',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ2txZmh0bWhpdnhyZm9uZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDE1NzIsImV4cCI6MjA2ODUxNzU3Mn0.DDjYenQsYg6lbWqWFCC2m-BcW9LkuSBL5vgPz_JIJxo'
        ),
        body := webhook_payload
      ) INTO response_result;
      
      RAISE LOG '[%] Edge function webhook-trigger response: %', execution_id, response_result;
      
      -- REMOVIDO: Não atualizar mais automaticamente para published
      -- Deixar que a aplicação controle quando marcar como published
      
      RAISE LOG '[%] Webhook enviado com sucesso', execution_id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG '[%] ERRO ao chamar edge function webhook-trigger: %', execution_id, SQLERRM;
    END;
  ELSE
    RAISE LOG '[%] Post com status % - não enviando webhook (OLD: %)', execution_id, NEW.status, COALESCE(OLD.status, 'NULL');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;