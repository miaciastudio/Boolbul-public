BEGIN;

-- Billing switches between Dodo test and live with DODO_PAYMENTS_ENVIRONMENT.
-- These replace the sandbox-only versions from 202611060002 and add the
-- beta "card after approval" flow: a trial until the free pass ends and an
-- auto-renew preference the customer controls in Settings.

ALTER TABLE public.tenants ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT true;
GRANT SELECT (auto_renew) ON public.tenants TO authenticated;

CREATE OR REPLACE FUNCTION public.begin_dodo_checkout(p_tenant_id UUID, p_user_id UUID, p_environment TEXT, p_product_id TEXT, p_plan TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    tenant public.tenants%ROWTYPE;
    attempt public.dodo_checkout_attempts%ROWTYPE;
    customer TEXT;
    email TEXT;
BEGIN
    IF p_environment IS NULL OR p_environment NOT IN ('test_mode', 'live_mode') OR p_plan IS NULL OR p_plan NOT IN ('starter', 'pro') THEN
        RAISE EXCEPTION 'Invalid billing configuration';
    END IF;
    SELECT * INTO tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.tenant_memberships
        WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND role IN ('owner', 'admin')) THEN
        RETURN pg_catalog.jsonb_build_object('result', 'forbidden');
    END IF;
    IF tenant.access_status IS DISTINCT FROM 'active' THEN
        RETURN pg_catalog.jsonb_build_object('result', 'not_approved');
    END IF;
    IF tenant.billing_status IN ('active', 'paused')
        OR (tenant.billing_mode IS NOT NULL AND tenant.billing_mode <> p_environment)
        OR tenant.stripe_customer_id IS NOT NULL OR tenant.stripe_subscription_id IS NOT NULL
        OR tenant.dodo_customer_id IS NOT NULL OR tenant.dodo_subscription_id IS NOT NULL
        OR (tenant.billing_mode IS NULL AND tenant.plan_tier <> 'free')
        OR EXISTS (SELECT 1 FROM public.dodo_subscriptions WHERE tenant_id = p_tenant_id AND environment = p_environment
            AND is_current AND status IN ('active', 'paused')) THEN
        RETURN pg_catalog.jsonb_build_object('result', 'subscription_exists');
    END IF;
    SELECT * INTO attempt FROM public.dodo_checkout_attempts
        WHERE tenant_id = p_tenant_id AND environment = p_environment AND status NOT IN ('completed', 'failed');
    IF FOUND THEN
        IF attempt.status = 'ready' AND attempt.plan = p_plan AND attempt.product_id = p_product_id THEN
            RETURN pg_catalog.jsonb_build_object('result', 'ready', 'url', attempt.checkout_url);
        END IF;
        RETURN pg_catalog.jsonb_build_object('result', 'reconcile');
    END IF;
    SELECT customer_id INTO customer FROM public.dodo_customers WHERE tenant_id = p_tenant_id AND environment = p_environment;
    SELECT users.email INTO email FROM auth.users AS users WHERE users.id = tenant.owner_user_id;
    IF email IS NULL OR pg_catalog.btrim(email) = '' THEN
        RETURN pg_catalog.jsonb_build_object('result', 'missing_email');
    END IF;
    INSERT INTO public.dodo_checkout_attempts(environment, tenant_id, requested_by, product_id, plan, status)
        VALUES (p_environment, p_tenant_id, p_user_id, p_product_id, p_plan,
            CASE WHEN customer IS NULL THEN 'customer_pending' ELSE 'customer_ready' END)
        RETURNING * INTO attempt;
    RETURN pg_catalog.jsonb_build_object('result', 'started', 'attempt_id', attempt.id,
        'customer_id', customer, 'name', tenant.name, 'email', email,
        'trial_ends_at', tenant.trial_ends_at, 'auto_renew', tenant.auto_renew);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_dodo_checkout(p_attempt_id UUID, p_session_id TEXT, p_checkout_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    target UUID;
    env TEXT;
BEGIN
    SELECT tenant_id, environment INTO target, env FROM public.dodo_checkout_attempts WHERE id = p_attempt_id;
    PERFORM 1 FROM public.tenants WHERE id = target FOR UPDATE;
    IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9_-]{1,200}$' OR p_checkout_url IS NULL
        OR (env = 'test_mode' AND p_checkout_url !~ '^https://test[.]checkout[.]dodopayments[.]com/')
        OR (env = 'live_mode' AND p_checkout_url !~ '^https://checkout[.]dodopayments[.]com/') THEN
        RAISE EXCEPTION 'Invalid checkout response';
    END IF;
    UPDATE public.dodo_checkout_attempts SET session_id = p_session_id, checkout_url = p_checkout_url,
        status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'ready' END
        WHERE id = p_attempt_id AND status IN ('checkout_pending', 'completed') AND session_id IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid checkout state'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_dodo_event(
    p_environment TEXT, p_webhook_id TEXT, p_type TEXT, p_event_at TIMESTAMPTZ,
    p_customer_id TEXT, p_subscription_id TEXT, p_product_id TEXT, p_plan TEXT,
    p_amount INTEGER, p_currency TEXT, p_frequency_count INTEGER, p_frequency_interval TEXT, p_quantity INTEGER
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    tenant public.tenants%ROWTYPE;
    subscription public.dodo_subscriptions%ROWTYPE;
    attempt public.dodo_checkout_attempts%ROWTYPE;
    next_status TEXT;
    prior_status TEXT;
    inserted INTEGER;
BEGIN
    IF p_environment IS NULL OR p_environment NOT IN ('test_mode', 'live_mode')
        OR p_event_at IS NULL OR NOT pg_catalog.isfinite(p_event_at)
        OR p_plan IS NULL OR p_plan NOT IN ('starter', 'pro') OR p_type IS NULL
        OR p_type NOT IN ('subscription.active', 'subscription.renewed', 'subscription.paused', 'subscription.cancelled', 'subscription.expired')
        OR p_amount IS DISTINCT FROM (CASE WHEN p_plan = 'starter' THEN 1900 ELSE 4900 END)
        OR p_currency IS DISTINCT FROM 'USD' OR p_frequency_count IS DISTINCT FROM 1
        OR p_frequency_interval IS DISTINCT FROM 'Month' OR p_quantity IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'Invalid billing event';
    END IF;
    INSERT INTO public.dodo_webhook_receipts(environment, webhook_id, event_type, event_at)
        VALUES (p_environment, p_webhook_id, p_type, p_event_at) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted = 0 THEN RETURN 'duplicate'; END IF;
    SELECT t.* INTO tenant FROM public.tenants AS t
        JOIN public.dodo_customers AS c ON c.tenant_id = t.id
        WHERE c.environment = p_environment AND c.customer_id = p_customer_id FOR UPDATE OF t;
    IF NOT FOUND THEN RETURN 'ignored'; END IF;
    IF (tenant.billing_mode IS NOT NULL AND tenant.billing_mode <> p_environment)
        OR tenant.stripe_customer_id IS NOT NULL OR tenant.stripe_subscription_id IS NOT NULL
        OR tenant.dodo_customer_id IS NOT NULL OR tenant.dodo_subscription_id IS NOT NULL
        OR (tenant.billing_mode IS NULL AND tenant.plan_tier <> 'free')
        OR (tenant.billing_event_at IS NOT NULL AND p_event_at <= tenant.billing_event_at) THEN
        RETURN 'ignored';
    END IF;
    SELECT * INTO subscription FROM public.dodo_subscriptions
        WHERE environment = p_environment AND subscription_id = p_subscription_id;
    next_status := CASE p_type WHEN 'subscription.paused' THEN 'paused'
        WHEN 'subscription.cancelled' THEN 'cancelled' WHEN 'subscription.expired' THEN 'cancelled' ELSE 'active' END;
    IF FOUND THEN
        IF subscription.tenant_id <> tenant.id OR subscription.customer_id <> p_customer_id
            OR subscription.product_id <> p_product_id OR subscription.plan <> p_plan
            OR NOT subscription.is_current OR p_event_at <= subscription.event_at THEN RETURN 'ignored'; END IF;
        prior_status := subscription.status;
    ELSE
        IF next_status <> 'active' THEN RETURN 'ignored'; END IF;
        IF EXISTS (SELECT 1 FROM public.dodo_subscriptions WHERE environment = p_environment
            AND tenant_id = tenant.id AND is_current AND status <> 'cancelled') THEN RETURN 'ignored'; END IF;
        SELECT * INTO attempt FROM public.dodo_checkout_attempts WHERE environment = p_environment
            AND tenant_id = tenant.id AND product_id = p_product_id AND plan = p_plan
            AND status IN ('checkout_pending', 'ready', 'reconcile') AND created_at <= p_event_at;
        IF NOT FOUND THEN RETURN 'ignored'; END IF;
        UPDATE public.dodo_subscriptions SET is_current = false
            WHERE environment = p_environment AND tenant_id = tenant.id AND is_current;
        INSERT INTO public.dodo_subscriptions(environment, subscription_id, tenant_id, customer_id, product_id, plan, status, event_at)
            VALUES (p_environment, p_subscription_id, tenant.id, p_customer_id, p_product_id, p_plan, next_status, p_event_at);
        UPDATE public.dodo_checkout_attempts SET status = 'completed' WHERE id = attempt.id;
    END IF;
    UPDATE public.dodo_subscriptions SET status = next_status, event_at = p_event_at
        WHERE environment = p_environment AND subscription_id = p_subscription_id;
    UPDATE public.tenants SET billing_status = next_status, billing_mode = p_environment, billing_event_at = p_event_at,
        plan_tier = CASE WHEN next_status = 'active' THEN p_plan ELSE 'free' END WHERE id = tenant.id;
    IF next_status IN ('paused', 'cancelled') AND prior_status IS DISTINCT FROM next_status THEN
        INSERT INTO public.churn_events(tenant_id, customer_id, subscription_id, gateway, status, mrr_cents, event_scope, created_at)
            VALUES (tenant.id, p_customer_id, p_subscription_id, 'dodo_payments', next_status, p_amount, 'platform_billing', p_event_at);
    END IF;
    UPDATE public.dodo_webhook_receipts SET outcome = 'applied' WHERE environment = p_environment AND webhook_id = p_webhook_id;
    RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.begin_dodo_checkout(UUID, UUID, TEXT, TEXT, TEXT),
    public.finish_dodo_checkout(UUID, TEXT, TEXT),
    public.process_dodo_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, INTEGER)
    FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.begin_dodo_checkout(UUID, UUID, TEXT, TEXT, TEXT),
    public.finish_dodo_checkout(UUID, TEXT, TEXT),
    public.process_dodo_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, INTEGER)
    TO service_role;

COMMIT;
