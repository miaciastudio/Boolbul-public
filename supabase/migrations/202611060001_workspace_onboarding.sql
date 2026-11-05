BEGIN;

ALTER TABLE public.tenants ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
-- Do not broaden the existing column-level grants or expose signing material.
GRANT SELECT (onboarding_completed_at) ON public.tenants TO authenticated;

CREATE FUNCTION public.ensure_workspace_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    account auth.users%ROWTYPE;
    workspace_id UUID;
    workspace_owner UUID;
    user_name TEXT;
    slug_stem TEXT;
BEGIN
    -- Every login for this user takes the same lock before checking memberships.
    -- The signup trigger may already have provisioned all three public records.
    SELECT * INTO account FROM auth.users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace user does not exist' USING ERRCODE = 'P0002';
    END IF;

    SELECT membership.tenant_id INTO workspace_id
    FROM public.tenant_memberships AS membership
    WHERE membership.user_id = p_user_id
    ORDER BY membership.created_at ASC, membership.tenant_id ASC
    LIMIT 1;

    IF workspace_id IS NULL THEN
        SELECT tenant.id INTO workspace_id
        FROM public.tenants AS tenant
        WHERE tenant.owner_user_id = p_user_id
        ORDER BY tenant.created_at ASC, tenant.id ASC
        LIMIT 1;
    END IF;

    IF workspace_id IS NULL THEN
        -- Match Phase 1's bounded metadata/name + full UUID slug scheme.
        IF pg_catalog.jsonb_typeof(account.raw_user_meta_data -> 'full_name') = 'string' THEN
            user_name := NULLIF(pg_catalog.regexp_replace(
                account.raw_user_meta_data ->> 'full_name', '^[[:space:]]+|[[:space:]]+$', '', 'g'
            ), '');
        END IF;
        user_name := COALESCE(user_name, NULLIF(pg_catalog.regexp_replace(
            pg_catalog.split_part(account.email, '@', 1), '^[[:space:]]+|[[:space:]]+$', '', 'g'
        ), ''), 'User');
        user_name := pg_catalog.left(user_name, 100);
        slug_stem := COALESCE(NULLIF(pg_catalog.left(pg_catalog.lower(
            pg_catalog.regexp_replace(user_name, '[^a-zA-Z0-9]', '', 'g')
        ), 48), ''), 'workspace');

        INSERT INTO public.tenants (name, slug, owner_user_id)
        VALUES (user_name || '''s Workspace', slug_stem || '-' || p_user_id::TEXT, p_user_id)
        RETURNING id INTO workspace_id;
    END IF;

    SELECT tenant.owner_user_id INTO workspace_owner
    FROM public.tenants AS tenant WHERE tenant.id = workspace_id;
    -- Repair the actual owner's membership, never promote an invited viewer/admin.
    INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
    VALUES (workspace_id, workspace_owner, 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    INSERT INTO public.widget_configs (tenant_id) VALUES (workspace_id)
    ON CONFLICT (tenant_id) DO NOTHING;

    RETURN workspace_id;
END;
$$;

-- SECURITY DEFINER is an internal service entry point, not a self-enrollment API.
-- Revoke explicit grants too: Supabase installations can have broad defaults.
REVOKE ALL ON FUNCTION public.ensure_workspace_for_user(UUID)
    FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.ensure_workspace_for_user(UUID) TO service_role;

COMMIT;
