-- Supabase-only (needs pg_net + Vault); skipped by the in-memory Postgres tests.
-- Calls https://boolbul.com/api/beta/invite-webhook whenever an application's
-- status changes, so approval activates the edge and sends the welcome email at once.
-- The URL and shared secret live in Vault (never in git):
--   select vault.create_secret('<secret>', 'boolbul_invite_webhook_secret');
--   select vault.create_secret('https://boolbul.com/api/beta/invite-webhook', 'boolbul_invite_webhook_url');
-- A Worker cron re-runs anything this misses.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE FUNCTION private.notify_invite_decision()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    secret TEXT;
    endpoint TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;
    SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'boolbul_invite_webhook_secret';
    SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name = 'boolbul_invite_webhook_url';
    IF secret IS NULL OR endpoint IS NULL THEN
        RETURN NEW;
    END IF;
    -- The body carries only the id; the server re-reads the row with the service role.
    PERFORM net.http_post(
        url := endpoint,
        body := pg_catalog.jsonb_build_object('applicationId', NEW.id),
        headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json', 'X-BoolBul-Webhook-Secret', secret),
        timeout_milliseconds := 8000
    );
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notify_invite_decision() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER invite_applications_webhook AFTER UPDATE OF status ON public.invite_applications
    FOR EACH ROW EXECUTE FUNCTION private.notify_invite_decision();

COMMIT;
