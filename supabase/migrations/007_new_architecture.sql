-- ============================================================
-- 007: New webhook-first architecture
-- Replaces Twilio-tier model with native webhook integrations.
-- Adds Stripe billing + subscription enforcement columns.
-- ============================================================

-- Replace voip_tier with voip_provider (expanded to all 12 providers)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS voip_provider TEXT
  CHECK (voip_provider IN (
    'openphone',
    'ringcentral',
    'yeastar',
    'aircall',
    'dialpad',
    'zoom_phone',
    'goto_connect',
    '8x8',
    'nextiva',
    'justcall',
    'kixie',
    'cloudtalk',
    'microsoft_teams'
  ));

-- Migrate existing voip_tier values into voip_provider
UPDATE clients SET voip_provider = voip_tier WHERE voip_tier IN ('openphone', 'ringcentral');
UPDATE clients SET voip_provider = 'openphone' WHERE voip_tier = 'twilio' AND openphone_api_key IS NOT NULL;

-- Provider connection: API key path (most providers)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS provider_api_key TEXT;

-- Migrate existing openphone keys
UPDATE clients SET provider_api_key = openphone_api_key WHERE openphone_api_key IS NOT NULL;

-- Provider connection: OAuth path (RingCentral, Zoom Phone, GoTo Connect)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS oauth_access_token TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS oauth_token_expires_at TIMESTAMPTZ;

-- Webhook ID returned by provider on registration (used for deregistration)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS provider_webhook_id TEXT;

-- Stripe billing
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Subscription enforcement
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
  CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Track which number the provider uses to send SMS (set during onboarding)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS provider_phone_number TEXT;

-- Migrate owner_notify_number → provider_phone_number where twilio_number was the send-from
UPDATE clients SET provider_phone_number = twilio_number WHERE twilio_number IS NOT NULL AND voip_provider IS NOT NULL;

-- RLS: allow clients to update their own row (for dashboard settings)
CREATE POLICY IF NOT EXISTS "clients: update own data"
ON clients FOR UPDATE
USING (
  id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid()
  )
);

-- RLS: allow clients to update their own flow
CREATE POLICY IF NOT EXISTS "flows: update own data"
ON flows FOR UPDATE
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid()
  )
);
