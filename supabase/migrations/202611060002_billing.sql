BEGIN;

ALTER TABLE public.tenants
    ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'trialing'
        CHECK (billing_status IN ('trialing', 'active', 'paused', 'cancelled')),
    ADD COLUMN billing_mode TEXT CHECK (billing_mode IN ('test_mode', 'live_mode')),
    ADD COLUMN billing_event_at TIMESTAMPTZ;
ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_tier_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_tier_check CHECK (plan_tier IN ('free', 'starter', 'pro', 'scale'));
ALTER TABLE public.tenants ALTER COLUMN plan_tier SET DEFAULT 'free';
UPDATE public.tenants SET plan_tier = 'free'
WHERE plan_tier = 'starter' AND stripe_customer_id IS NULL AND stripe_subscription_id IS NULL
    AND dodo_customer_id IS NULL AND dodo_subscription_id IS NULL;
GRANT SELECT (billing_status, billing_mode) ON public.tenants TO authenticated;

ALTER TABLE public.churn_events ADD COLUMN event_scope TEXT NOT NULL DEFAULT 'retention'
    CHECK (event_scope IN ('retention', 'platform_billing'));
ALTER TABLE public.churn_events DROP CONSTRAINT churn_events_status_check;
ALTER TABLE public.churn_events ADD CONSTRAINT churn_events_status_check
    CHECK (status IN ('intercepted', 'rescued_discount', 'rescued_pause', 'paused', 'cancelled', 'failed_open'));
ALTER TABLE public.churn_events ADD CONSTRAINT churn_events_billing_status_check
    CHECK (event_scope <> 'platform_billing' OR status IN ('paused', 'cancelled'));

CREATE TABLE public.dodo_customers (
    environment TEXT NOT NULL CHECK (environment IN ('test_mode', 'live_mode')),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL CHECK (customer_id ~ '^[A-Za-z0-9_-]{1,200}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    PRIMARY KEY (environment, tenant_id),
    UNIQUE (environment, customer_id),
    UNIQUE (environment, tenant_id, customer_id)
);

CREATE TABLE public.dodo_checkout_attempts (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    environment TEXT NOT NULL CHECK (environment IN ('test_mode', 'live_mode')),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    product_id TEXT NOT NULL CHECK (product_id ~ '^[A-Za-z0-9_-]{1,200}$'),
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
    status TEXT NOT NULL CHECK (status IN ('customer_pending', 'customer_ready', 'checkout_pending', 'ready', 'reconcile', 'completed', 'failed')),
    session_id TEXT,
    checkout_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    UNIQUE (environment, session_id)
);
CREATE UNIQUE INDEX dodo_one_open_attempt ON public.dodo_checkout_attempts (environment, tenant_id)
    WHERE status NOT IN ('completed', 'failed');

CREATE TABLE public.dodo_subscriptions (
    environment TEXT NOT NULL,
    subscription_id TEXT NOT NULL CHECK (subscription_id ~ '^[A-Za-z0-9_-]{1,200}$'),
    tenant_id UUID NOT NULL,
    customer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled')),
    is_current BOOLEAN NOT NULL DEFAULT true,
    event_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (environment, subscription_id),
    FOREIGN KEY (environment, tenant_id, customer_id)
        REFERENCES public.dodo_customers(environment, tenant_id, customer_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX dodo_one_current_subscription ON public.dodo_subscriptions(environment, tenant_id) WHERE is_current;

CREATE TABLE public.dodo_webhook_receipts (
    environment TEXT NOT NULL CHECK (environment IN ('test_mode', 'live_mode')),
    webhook_id TEXT NOT NULL CHECK (webhook_id ~ '^[A-Za-z0-9_-]{1,200}$'),
    event_type TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'ignored' CHECK (outcome IN ('ignored', 'applied')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    PRIMARY KEY (environment, webhook_id)
);

ALTER TABLE public.dodo_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dodo_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dodo_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dodo_webhook_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY dodo_customers_service ON public.dodo_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY dodo_attempts_service ON public.dodo_checkout_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY dodo_subscriptions_service ON public.dodo_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY dodo_receipts_service ON public.dodo_webhook_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.dodo_customers, public.dodo_checkout_attempts, public.dodo_subscriptions, public.dodo_webhook_receipts
    FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON public.dodo_customers, public.dodo_checkout_attempts, public.dodo_subscriptions, public.dodo_webhook_receipts TO service_role;

CREATE FUNCTION public.begin_dodo_checkout(p_tenant_id UUID, p_user_id UUID, p_environment TEXT, p_product_id TEXT, p_plan TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    tenant public.tenants%ROWTYPE;
    attempt public.dodo_checkout_attempts%ROWTYPE;
    customer TEXT;
    email TEXT;
BEGIN
    IF p_environment IS DISTINCT FROM 'test_mode' OR p_plan IS NULL OR p_plan NOT IN ('starter', 'pro') THEN
        RAISE EXCEPTION 'Invalid billing configuration';
    END IF;
    SELECT * INTO tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.tenant_memberships
        WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND role IN ('owner', 'admin')) THEN
        RETURN pg_catalog.jsonb_build_object('result', 'forbidden');
    END IF;
    IF tenant.billing_status IN ('active', 'paused') OR tenant.billing_mode = 'live_mode'
        OR tenant.stripe_customer_id IS NOT NULL OR tenant.stripe_subscription_id IS NOT NULL
        OR tenant.dodo_customer_id IS NOT NULL OR tenant.dodo_subscription_id IS NOT NULL
        OR (tenant.billing_mode IS NULL AND tenant.plan_tier <> 'free')
        OR EXISTS (SELECT 1 FROM public.dodo_subscriptions WHERE tenant_id = p_tenant_id AND is_current AND status IN ('active', 'paused')) THEN
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
        'customer_id', customer, 'name', tenant.name, 'email', email);
END;
$$;

CREATE FUNCTION public.bind_dodo_customer(p_attempt_id UUID, p_customer_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    attempt public.dodo_checkout_attempts%ROWTYPE;
    target UUID;
    customer TEXT;
BEGIN
    SELECT tenant_id INTO target FROM public.dodo_checkout_attempts WHERE id = p_attempt_id;
    PERFORM 1 FROM public.tenants WHERE id = target FOR UPDATE;
    SELECT * INTO attempt FROM public.dodo_checkout_attempts WHERE id = p_attempt_id FOR UPDATE;
    IF NOT FOUND OR attempt.status NOT IN ('customer_pending', 'customer_ready') THEN
        RAISE EXCEPTION 'Invalid checkout state';
    END IF;
    SELECT customer_id INTO customer FROM public.dodo_customers
        WHERE environment = attempt.environment AND tenant_id = attempt.tenant_id;
    IF customer IS NULL THEN
        INSERT INTO public.dodo_customers(environment, tenant_id, customer_id)
            VALUES (attempt.environment, attempt.tenant_id, p_customer_id);
    ELSIF customer IS DISTINCT FROM p_customer_id THEN
        RAISE EXCEPTION 'Customer binding conflict';
    END IF;
    UPDATE public.dodo_checkout_attempts SET status = 'checkout_pending' WHERE id = p_attempt_id;
END;
$$;

CREATE FUNCTION public.finish_dodo_checkout(p_attempt_id UUID, p_session_id TEXT, p_checkout_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    target UUID;
BEGIN
    SELECT tenant_id INTO target FROM public.dodo_checkout_attempts WHERE id = p_attempt_id;
    PERFORM 1 FROM public.tenants WHERE id = target FOR UPDATE;
    IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9_-]{1,200}$'
        OR p_checkout_url IS NULL OR p_checkout_url !~ '^https://test[.]checkout[.]dodopayments[.]com/' THEN
        RAISE EXCEPTION 'Invalid checkout response';
    END IF;
    UPDATE public.dodo_checkout_attempts SET session_id = p_session_id, checkout_url = p_checkout_url,
        status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'ready' END
        WHERE id = p_attempt_id AND status IN ('checkout_pending', 'completed') AND session_id IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid checkout state'; END IF;
END;
$$;

CREATE FUNCTION public.reconcile_dodo_checkout(p_attempt_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    target UUID;
BEGIN
    SELECT tenant_id INTO target FROM public.dodo_checkout_attempts WHERE id = p_attempt_id;
    PERFORM 1 FROM public.tenants WHERE id = target FOR UPDATE;
    UPDATE public.dodo_checkout_attempts SET status = 'reconcile'
        WHERE id = p_attempt_id AND status IN ('customer_pending', 'customer_ready', 'checkout_pending');
END;
$$;

CREATE FUNCTION public.process_dodo_event(
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
    IF p_environment IS DISTINCT FROM 'test_mode' OR p_event_at IS NULL OR NOT pg_catalog.isfinite(p_event_at)
        OR p_plan IS NULL OR p_plan NOT IN ('starter', 'pro') OR p_type IS NULL
        OR p_type NOT IN ('subscription.active', 'subscription.renewed', 'subscription.paused', 'subscription.cancelled')
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
        WHEN 'subscription.cancelled' THEN 'cancelled' ELSE 'active' END;
    IF FOUND THEN
        IF subscription.tenant_id <> tenant.id OR subscription.customer_id <> p_customer_id
            OR subscription.product_id <> p_product_id OR subscription.plan <> p_plan
            OR NOT subscription.is_current OR p_event_at <= subscription.event_at THEN RETURN 'ignored'; END IF;
        prior_status := subscription.status;
    ELSE
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
    public.bind_dodo_customer(UUID, TEXT), public.finish_dodo_checkout(UUID, TEXT, TEXT), public.reconcile_dodo_checkout(UUID),
    public.process_dodo_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, INTEGER)
    FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.begin_dodo_checkout(UUID, UUID, TEXT, TEXT, TEXT),
    public.bind_dodo_customer(UUID, TEXT), public.finish_dodo_checkout(UUID, TEXT, TEXT), public.reconcile_dodo_checkout(UUID),
    public.process_dodo_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, INTEGER)
    TO service_role;

COMMIT;
