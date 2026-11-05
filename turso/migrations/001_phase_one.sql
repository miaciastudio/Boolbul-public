-- Foreign keys are connection-local in SQLite: enable them on runtime clients too.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

CREATE TABLE edge_tenants (
    tenant_id TEXT NOT NULL PRIMARY KEY CHECK (length(trim(tenant_id)) > 0),
    public_key TEXT NOT NULL UNIQUE CHECK (length(trim(public_key)) > 0),
    signing_secret_hash TEXT NOT NULL CHECK (length(trim(signing_secret_hash)) > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    monthly_intercept_quota INTEGER NOT NULL DEFAULT 1000
        CHECK (typeof(monthly_intercept_quota) = 'integer' AND monthly_intercept_quota >= 0),
    current_month_usage INTEGER NOT NULL DEFAULT 0
        CHECK (typeof(current_month_usage) = 'integer' AND current_month_usage >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (julianday(created_at) IS NOT NULL),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (julianday(updated_at) IS NOT NULL)
);

CREATE INDEX idx_edge_tenants_public_key ON edge_tenants(public_key);

CREATE TABLE edge_retention_rules (
    rule_id TEXT NOT NULL PRIMARY KEY CHECK (length(trim(rule_id)) > 0),
    tenant_id TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1 CHECK (typeof(priority) = 'integer' AND priority >= 0),
    trigger_condition TEXT NOT NULL CHECK (json_valid(trigger_condition) AND json_type(trigger_condition) = 'object'),
    offer_type TEXT NOT NULL CHECK (offer_type IN ('discount', 'pause', 'survey_only')),
    discount_percentage INTEGER NOT NULL DEFAULT 0
        CHECK (typeof(discount_percentage) = 'integer' AND discount_percentage BETWEEN 0 AND 10000),
    discount_duration_months INTEGER NOT NULL DEFAULT 0
        CHECK (typeof(discount_duration_months) = 'integer' AND discount_duration_months >= 0),
    pause_duration_days INTEGER NOT NULL DEFAULT 30
        CHECK (typeof(pause_duration_days) = 'integer' AND pause_duration_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT 1 CHECK (typeof(is_active) = 'integer' AND is_active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (julianday(created_at) IS NOT NULL),
    FOREIGN KEY (tenant_id) REFERENCES edge_tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_edge_rules_lookup ON edge_retention_rules(tenant_id, is_active, priority);

-- Compare ISO expiries using julianday to handle offsets correctly.
CREATE TABLE edge_used_nonces (
    nonce TEXT NOT NULL PRIMARY KEY CHECK (length(trim(nonce)) > 0),
    tenant_id TEXT NOT NULL CHECK (length(trim(tenant_id)) > 0),
    expires_at DATETIME NOT NULL CHECK (
        typeof(expires_at) = 'text'
        AND expires_at GLOB '????-??-??T??:??:??*'
        AND julianday(expires_at) IS NOT NULL
    ),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (julianday(created_at) IS NOT NULL)
);

CREATE INDEX idx_nonces_expiry ON edge_used_nonces(expires_at);

COMMIT;
