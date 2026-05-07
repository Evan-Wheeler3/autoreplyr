-- 008: provider_phone_number_id + flexible metadata per provider
--
-- provider_phone_number_id: used by providers that identify numbers by an
--   opaque ID rather than an E.164 string (e.g. OpenPhone phoneNumberId).
--
-- provider_metadata: JSONB bag for anything provider-specific that doesn't
--   belong in a top-level column (Dialpad subscription IDs, Aircall line ID,
--   8x8 subAccountId, Kixie businessId, etc.).  Each provider documents its
--   own keys in the corresponding src/lib/providers/<provider>.ts file.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS provider_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_metadata        JSONB NOT NULL DEFAULT '{}';
