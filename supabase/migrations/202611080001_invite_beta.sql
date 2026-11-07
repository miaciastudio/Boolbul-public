BEGIN;

-- 1. Workspace access gate for the invite-only beta.
--    New workspaces start 'pending'; existing ones are grandfathered as 'active'.
ALTER TABLE public.tenants
    ADD COLUMN access_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (access_status IN ('pending', 'active', 'rejected')),
    ADD COLUMN trial_ends_at TIMESTAMPTZ;
UPDATE public.tenants SET access_status = 'active';
GRANT SELECT (access_status, trial_ends_at) ON public.tenants TO authenticated;

-- 2. Beta applications (one per account). Rows are written by the server only.
CREATE TABLE public.invite_applications (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL CHECK (pg_catalog.char_length(pg_catalog.btrim(full_name)) BETWEEN 1 AND 100),
    email TEXT NOT NULL CHECK (pg_catalog.char_length(email) BETWEEN 3 AND 320),
    website_url TEXT NOT NULL
        CHECK (website_url ~ '^https?://[^[:space:]]+$' AND pg_catalog.char_length(website_url) <= 300),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    notes TEXT CHECK (notes IS NULL OR pg_catalog.char_length(notes) <= 2000),
    admin_notified_at TIMESTAMPTZ,
    edge_synced_at TIMESTAMPTZ,
    welcomed_at TIMESTAMPTZ
);
CREATE INDEX idx_invite_applications_status ON public.invite_applications(status, applied_at);

ALTER TABLE public.invite_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY invite_applications_own_select ON public.invite_applications
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY invite_applications_service_all ON public.invite_applications
    FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.invite_applications FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (id, full_name, email, website_url, status, applied_at, confirmed_at)
    ON public.invite_applications TO authenticated;
GRANT ALL ON public.invite_applications TO service_role;

-- 3. Changing `status` in the Supabase table editor is the approval action.
--    This runs in the same transaction, so the workspace flips instantly.
--    The 3-month Pro pass is a trial (plan_tier stays 'free' for billing).
CREATE FUNCTION public.apply_invite_decision()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;
    IF NEW.status = 'confirmed' THEN
        NEW.confirmed_at := COALESCE(NEW.confirmed_at, pg_catalog.now());
        NEW.rejected_at := NULL;
        NEW.edge_synced_at := NULL;
        UPDATE public.tenants
            SET access_status = 'active',
                trial_ends_at = GREATEST(COALESCE(trial_ends_at, pg_catalog.now()), pg_catalog.now() + INTERVAL '3 months')
            WHERE id = NEW.tenant_id;
    ELSIF NEW.status = 'rejected' THEN
        NEW.rejected_at := pg_catalog.now();
        NEW.edge_synced_at := NULL;
        UPDATE public.tenants SET access_status = 'rejected' WHERE id = NEW.tenant_id;
    ELSE
        NEW.edge_synced_at := NULL;
        UPDATE public.tenants SET access_status = 'pending' WHERE id = NEW.tenant_id;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_invite_decision() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER invite_applications_decision BEFORE UPDATE OF status ON public.invite_applications
    FOR EACH ROW EXECUTE FUNCTION public.apply_invite_decision();

COMMIT;
