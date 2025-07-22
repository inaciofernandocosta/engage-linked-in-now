-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS trigger_post_webhook_on_approval ON posts;
DROP TRIGGER IF EXISTS webhook_on_approved_post ON posts;
DROP FUNCTION IF EXISTS trigger_webhook_on_approved_post() CASCADE;

-- Create the updated function that calls our edge function
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
    execution_id, NEW.id, OLD.status, NEW.status, NEW.webhook_url;
  
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
      
      -- Atualizar status para published apenas se webhook foi chamado com sucesso
      UPDATE posts SET status = 'published', published_at = now() 
      WHERE id = NEW.id AND status = 'approved';
      
      RAISE LOG '[%] Post marcado como published', execution_id;
      
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

-- Create the trigger on the posts table
CREATE TRIGGER webhook_on_approved_post
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhook_on_approved_post();