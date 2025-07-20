-- Teste FINAL direto - chamando a função de teste via pg_net
SELECT net.http_post(
  url := 'https://qigkqfhtmhivxrfongzm.supabase.co/functions/v1/test-webhook',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) as response;