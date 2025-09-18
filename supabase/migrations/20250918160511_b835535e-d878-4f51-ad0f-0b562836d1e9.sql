-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to process scheduled emails every 5 minutes
SELECT cron.schedule(
  'process-scheduled-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://ogzdqhvpsobpwxteqpnx.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nemRxaHZwc29icHd4dGVxcG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTYyMjgsImV4cCI6MjA3MzY5MjIyOH0.jRYL7948dYqxPu0V5NyW3v-3J_wlUPrvktGK3SU9yV4"}'::jsonb,
    body := '{"automated": true}'::jsonb
  ) as request_id;
  $$
);