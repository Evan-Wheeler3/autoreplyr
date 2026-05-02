-- Allow OpenPhone / RingCentral clients who don't have a Twilio number
ALTER TABLE clients ALTER COLUMN twilio_number DROP NOT NULL;

-- Which integration tier this client uses
ALTER TABLE clients ADD COLUMN IF NOT EXISTS voip_tier TEXT NOT NULL DEFAULT 'twilio'
  CHECK (voip_tier IN ('openphone', 'ringcentral', 'twilio'));

-- OpenPhone credentials (Tier A)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS openphone_api_key TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS openphone_number_id TEXT;
