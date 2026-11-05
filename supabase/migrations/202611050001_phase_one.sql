BEGIN;

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    name TEXT NOT NULL CHECK (pg_catalog.btrim(name) <> ''),
    slug TEXT UNIQUE NOT NULL CHECK (pg_catalog.btrim(slug) <> ''),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT UNIQUE NOT NULL DEFAULT ('bb_pub_' || pg_catalog.replace(pg_catalog.gen_random_uuid()::TEXT, '-', '')),
    signing_secret TEXT NOT NULL DEFAULT (
        'bb_sec_' || pg_catalog.replace(pg_catalog.gen_random_uuid()::TEXT || pg_catalog.gen_random_uuid()::TEXT, '-', '')
    ),
    plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'scale')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    dodo_customer_id TEXT,
    dodo_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenants_owner_user_id ON public.tenants(owner_user_id);
CREATE INDEX idx_tenant_memberships_user_id ON public.tenant_memberships(user_id, tenant_id);

CREATE TABLE public.widget_configs (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    theme_preset TEXT NOT NULL DEFAULT 'neo_brutalist'
        CHECK (theme_preset IN ('neo_brutalist', 'minimal_slate', 'midnight_oled', 'high_contrast')),
    accent_color TEXT NOT NULL DEFAULT '#CCFF00' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
    background_color TEXT NOT NULL DEFAULT '#FFFFFF' CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
    text_color TEXT NOT NULL DEFAULT '#0A0A0A' CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
    border_radius_px INTEGER NOT NULL DEFAULT 0 CHECK (border_radius_px >= 0),
    font_family TEXT NOT NULL DEFAULT 'JetBrains Mono',
    headline_text TEXT NOT NULL DEFAULT 'WAIT! DON''T LEAVE JUST YET.',
    body_text TEXT NOT NULL DEFAULT 'We would love to keep you around. Pick a rescue package below:',
    escape_hatch_text TEXT NOT NULL DEFAULT 'No thanks, proceed to complete cancellation →',
    primary_offer_type TEXT NOT NULL DEFAULT 'discount_and_pause'
        CHECK (primary_offer_type IN ('discount_and_pause', 'discount_only', 'pause_only', 'survey_only')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE public.churn_events (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    gateway TEXT NOT NULL CHECK (gateway IN ('dodo_payments', 'stripe', 'lemon_squeezy')),
    mrr_cents INTEGER NOT NULL DEFAULT 0 CHECK (mrr_cents >= 0),
    status TEXT NOT NULL CHECK (status IN ('intercepted', 'rescued_discount', 'rescued_pause', 'cancelled', 'failed_open')),
    exit_reason TEXT,
    exit_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX idx_churn_events_tenant_time ON public.churn_events(tenant_id, created_at DESC);
CREATE INDEX idx_churn_events_mrr ON public.churn_events(tenant_id, status, mrr_cents);

-- Definer-owned lookups avoid recursive membership RLS while binding auth.uid().
CREATE FUNCTION public.is_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships AS membership
        WHERE membership.tenant_id = target_tenant_id
          AND membership.user_id = auth.uid()
    );
$$;

CREATE FUNCTION public.can_manage_tenant_widget(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships AS membership
        WHERE membership.tenant_id = target_tenant_id
          AND membership.user_id = auth.uid()
          AND membership.role IN ('owner', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_tenant_member(UUID), public.can_manage_tenant_widget(UUID)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(UUID), public.can_manage_tenant_widget(UUID)
    TO authenticated, service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_member_select ON public.tenants
    FOR SELECT TO authenticated USING (public.is_tenant_member(id));
CREATE POLICY memberships_member_select ON public.tenant_memberships
    FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY widgets_member_select ON public.widget_configs
    FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY widgets_manager_update ON public.widget_configs
    FOR UPDATE TO authenticated
    USING (public.can_manage_tenant_widget(tenant_id))
    WITH CHECK (public.can_manage_tenant_widget(tenant_id));
CREATE POLICY churn_member_select ON public.churn_events
    FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- Explicit backend policies also support a service role without BYPASSRLS.
CREATE POLICY tenants_service_all ON public.tenants
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY memberships_service_all ON public.tenant_memberships
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY widgets_service_all ON public.widget_configs
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY churn_service_all ON public.churn_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Remove broad defaults because RLS alone cannot hide the signing-secret column.
REVOKE ALL ON TABLE public.tenants, public.tenant_memberships, public.widget_configs, public.churn_events
    FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT (id, name, slug, public_key, owner_user_id, plan_tier, created_at, updated_at)
    ON public.tenants TO authenticated;
GRANT SELECT ON public.tenant_memberships, public.widget_configs, public.churn_events TO authenticated;
GRANT UPDATE (
    theme_preset, accent_color, background_color, text_color, border_radius_px,
    font_family, headline_text, body_text, escape_hatch_text, primary_offer_type
) ON public.widget_configs TO authenticated;
GRANT ALL ON TABLE public.tenants, public.tenant_memberships, public.widget_configs, public.churn_events
    TO service_role;

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER widget_configs_set_updated_at BEFORE UPDATE ON public.widget_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_tenant_id UUID;
    user_name TEXT;
    slug_stem TEXT;
BEGIN
    -- Bound untrusted OAuth metadata to keep generated slugs within index limits.
    IF pg_catalog.jsonb_typeof(NEW.raw_user_meta_data -> 'full_name') = 'string' THEN
        user_name := NULLIF(pg_catalog.regexp_replace(
            NEW.raw_user_meta_data ->> 'full_name', '^[[:space:]]+|[[:space:]]+$', '', 'g'
        ), '');
    END IF;
    user_name := COALESCE(user_name, NULLIF(pg_catalog.regexp_replace(
        pg_catalog.split_part(NEW.email, '@', 1), '^[[:space:]]+|[[:space:]]+$', '', 'g'
    ), ''), 'User');
    user_name := pg_catalog.left(user_name, 100);
    slug_stem := COALESCE(NULLIF(pg_catalog.left(pg_catalog.lower(
        pg_catalog.regexp_replace(user_name, '[^a-zA-Z0-9]', '', 'g')
    ), 48), ''), 'workspace');

    INSERT INTO public.tenants (name, slug, owner_user_id)
    VALUES (user_name || '''s Workspace', slug_stem || '-' || NEW.id::TEXT, NEW.id)
    RETURNING id INTO new_tenant_id;

    INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
    VALUES (new_tenant_id, NEW.id, 'owner');

    INSERT INTO public.widget_configs (tenant_id) VALUES (new_tenant_id);
    RETURN NEW;
END;
$$;

-- Trigger-only entry point: API callers must never invoke provisioning directly.
REVOKE ALL ON FUNCTION public.handle_new_user_provisioning() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();

COMMIT;
