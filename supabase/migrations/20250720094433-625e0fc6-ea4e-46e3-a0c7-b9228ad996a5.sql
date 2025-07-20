-- Trigger um update para forçar notificação do post sobre tarifas
UPDATE posts 
SET updated_at = now() 
WHERE id = 'a3e2c793-edf6-40b6-a69e-5c81679cb3c7';