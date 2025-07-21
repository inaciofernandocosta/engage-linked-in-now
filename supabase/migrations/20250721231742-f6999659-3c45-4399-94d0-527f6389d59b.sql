-- Adicionar coluna status e scheduled_for na tabela posts
ALTER TABLE public.posts 
ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published')),
ADD COLUMN scheduled_for timestamp with time zone;

-- Criar índice para otimizar consultas por status
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_scheduled_for ON public.posts(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Atualizar posts existentes para status 'published'
UPDATE public.posts SET status = 'published' WHERE status IS NULL;

-- Modificar o trigger para só disparar webhook para posts aprovados
DROP TRIGGER IF EXISTS trigger_post_webhook ON public.posts;

-- Criar nova função do trigger que verifica status
CREATE OR REPLACE FUNCTION public.trigger_webhook_on_approved_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  RAISE LOG '[%] TRIGGER EXECUTADO - Post ID: %, Status: %, Webhook URL: %', execution_id, NEW.id, NEW.status, NEW.webhook_url;
  
  -- Só processar se o status mudou para 'approved' ou 'published' E tem webhook_url
  IF (NEW.status IN ('approved', 'published')) AND 
     (OLD.status IS NULL OR OLD.status != NEW.status) AND 
     NEW.webhook_url IS NOT NULL THEN
    
    -- Se há image_storage_path, buscar os dados da imagem
    image_base64 := NULL;
    image_content_type := NULL;
    
    IF NEW.image_storage_path IS NOT NULL THEN
      BEGIN
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
      
      -- Atualizar status para 'published' após sucesso do webhook
      UPDATE public.posts SET status = 'published', published_at = now() WHERE id = NEW.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG '[%] ERRO no webhook: %', execution_id, SQLERRM;
    END;
  ELSE
    RAISE LOG '[%] Post com status % - não enviando webhook', execution_id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o novo trigger
CREATE TRIGGER trigger_post_webhook_on_approval
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_webhook_on_approved_post();

-- Função para aprovar posts agendados (para uso com cron job)
CREATE OR REPLACE FUNCTION public.approve_scheduled_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  posts_approved integer := 0;
BEGIN
  UPDATE public.posts 
  SET status = 'approved'
  WHERE status = 'pending' 
    AND scheduled_for IS NOT NULL 
    AND scheduled_for <= now();
    
  GET DIAGNOSTICS posts_approved = ROW_COUNT;
  
  RAISE LOG 'Approved % scheduled posts', posts_approved;
  
  RETURN posts_approved;
END;
$function$;