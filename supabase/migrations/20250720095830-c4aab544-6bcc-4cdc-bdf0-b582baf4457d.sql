-- Diagnóstico completo do webhook
SELECT net.http_post(
  url := 'https://qigkqfhtmhivxrfongzm.supabase.co/functions/v1/diagnose-webhook',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) as response;