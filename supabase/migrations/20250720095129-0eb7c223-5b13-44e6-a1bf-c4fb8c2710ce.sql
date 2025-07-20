-- Teste manual do webhook para o post das tarifas
SELECT net.http_post(
  url := 'https://qigkqfhtmhivxrfongzm.supabase.co/functions/v1/webhook-trigger',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"post_id": "a3e2c793-edf6-40b6-a69e-5c81679cb3c7", "content": "🌎💼 Vamos falar sobre as tarifas impostas pelo governo americano ao Brasil. Como essas medidas impactam o comércio internacional e o desenvolvimento econômico?", "image_url": null, "published_at": "2025-07-20T09:33:41.403619+00:00", "user_id": "ded843d2-0301-432c-aace-b899da79bbe5", "webhook_url": "https://eo6y8yafmyxp7kj.m.pipedream.net"}'::jsonb
) as response;