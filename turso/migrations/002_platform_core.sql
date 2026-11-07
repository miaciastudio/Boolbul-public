-- Gateway travels in the signed init token so outcome events need no extra lookup.
ALTER TABLE edge_tenants ADD COLUMN gateway TEXT NOT NULL DEFAULT 'dodo_payments'
    CHECK (gateway IN ('dodo_payments', 'stripe'));
-- Monthly deflection counter resets lazily when the UTC month (YYYY-MM) changes.
ALTER TABLE edge_tenants ADD COLUMN usage_month TEXT NOT NULL DEFAULT '';
