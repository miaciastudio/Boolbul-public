BEGIN;

-- 1. RLS helpers stay callable by policies but leave the exposed REST schema.
--    Policies reference functions by OID, so moving them keeps every policy intact.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER FUNCTION public.is_tenant_member(UUID) SET SCHEMA private;
ALTER FUNCTION public.can_manage_tenant_widget(UUID) SET SCHEMA private;

-- 2. Workspace integration settings (written only by the server with the service role).
ALTER TABLE public.tenants
    ADD COLUMN gateway TEXT NOT NULL DEFAULT 'dodo_payments'
        CHECK (gateway IN ('dodo_payments', 'stripe')),
    ADD COLUMN primary_domain TEXT
        CHECK (primary_domain IS NULL OR primary_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$');
GRANT SELECT (gateway, primary_domain) ON public.tenants TO authenticated;

-- 3. Widget design fields rendered identically by the SDK and the customizer preview.
ALTER TABLE public.widget_configs
    ADD COLUMN survey_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN survey_reasons JSONB NOT NULL DEFAULT '[
        {"id": "too_expensive", "label": "It''s too expensive"},
        {"id": "unused", "label": "I''m not using it enough"},
        {"id": "missing_features", "label": "It''s missing features I need"},
        {"id": "switched_service", "label": "I''m switching to another tool"},
        {"id": "other", "label": "Something else"}
    ]'::JSONB
        CHECK (pg_catalog.jsonb_typeof(survey_reasons) = 'array'
            AND pg_catalog.jsonb_array_length(survey_reasons) BETWEEN 1 AND 8),
    ADD COLUMN success_text TEXT NOT NULL DEFAULT 'You''re all set. Thanks for sticking with us!'
        CHECK (pg_catalog.char_length(success_text) BETWEEN 1 AND 160),
    ADD COLUMN mobile_layout TEXT NOT NULL DEFAULT 'sheet' CHECK (mobile_layout IN ('sheet', 'modal')),
    ADD COLUMN logo_url TEXT
        CHECK (logo_url IS NULL OR (logo_url ~ '^https://[^[:space:]]+$' AND pg_catalog.char_length(logo_url) <= 512)),
    ADD COLUMN show_branding BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.widget_configs
    ADD CONSTRAINT widget_configs_text_lengths CHECK (
        pg_catalog.char_length(headline_text) BETWEEN 1 AND 120
        AND pg_catalog.char_length(body_text) BETWEEN 1 AND 400
        AND pg_catalog.char_length(escape_hatch_text) BETWEEN 1 AND 80
        AND pg_catalog.char_length(font_family) BETWEEN 1 AND 80
        AND border_radius_px <= 32
    ) NOT VALID;
GRANT UPDATE (survey_enabled, survey_reasons, success_text, mobile_layout, logo_url, show_branding)
    ON public.widget_configs TO authenticated;

-- 4. One ledger row per cancellation session; outcomes update it in place.
ALTER TABLE public.churn_events
    ADD COLUMN session_id TEXT CHECK (session_id IS NULL OR pg_catalog.char_length(session_id) BETWEEN 1 AND 64),
    ADD COLUMN offer_type TEXT CHECK (offer_type IS NULL OR offer_type IN ('discount', 'pause')),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    ADD CONSTRAINT churn_events_session_unique UNIQUE (tenant_id, session_id),
    ADD CONSTRAINT churn_events_text_lengths CHECK (
        (exit_reason IS NULL OR pg_catalog.char_length(exit_reason) <= 64)
        AND (exit_feedback IS NULL OR pg_catalog.char_length(exit_feedback) <= 1000)
    ) NOT VALID;

CREATE FUNCTION public.record_retention_event(
    p_tenant_id UUID, p_session_id TEXT, p_customer_id TEXT, p_subscription_id TEXT,
    p_gateway TEXT, p_mrr_cents INTEGER, p_status TEXT, p_offer_type TEXT,
    p_exit_reason TEXT, p_exit_feedback TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    stored_status TEXT;
BEGIN
    IF p_status NOT IN ('intercepted', 'rescued_discount', 'rescued_pause', 'cancelled') THEN
        RAISE EXCEPTION 'Unsupported retention status' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.churn_events AS event (
        tenant_id, session_id, customer_id, subscription_id, gateway, mrr_cents,
        status, offer_type, exit_reason, exit_feedback, event_scope
    ) VALUES (
        p_tenant_id, p_session_id, p_customer_id, p_subscription_id, p_gateway,
        GREATEST(COALESCE(p_mrr_cents, 0), 0), p_status, p_offer_type, p_exit_reason, p_exit_feedback, 'retention'
    )
    ON CONFLICT (tenant_id, session_id) DO UPDATE SET
        -- A late "shown" beacon must never overwrite a final outcome.
        status = CASE WHEN excluded.status = 'intercepted' THEN event.status ELSE excluded.status END,
        offer_type = COALESCE(excluded.offer_type, event.offer_type),
        exit_reason = COALESCE(excluded.exit_reason, event.exit_reason),
        exit_feedback = COALESCE(excluded.exit_feedback, event.exit_feedback),
        mrr_cents = GREATEST(event.mrr_cents, excluded.mrr_cents),
        updated_at = pg_catalog.now()
    WHERE event.event_scope = 'retention'
    RETURNING event.status INTO stored_status;
    RETURN stored_status;
END;
$$;

REVOKE ALL ON FUNCTION public.record_retention_event(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_retention_event(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT)
    TO service_role;

CREATE TRIGGER churn_events_set_updated_at BEFORE UPDATE ON public.churn_events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
