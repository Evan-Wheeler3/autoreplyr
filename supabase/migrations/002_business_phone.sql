-- Add business_phone as the per-client routing key for missed-call forwarding.
-- When a caller dials the business's real number and *71 forwards to the toll-free
-- Twilio number, Twilio sends ForwardedFrom = the business's real number.
-- We look up the client by business_phone = ForwardedFrom.
ALTER TABLE clients ADD COLUMN business_phone text UNIQUE;

-- All clients now share one toll-free number, so the unique constraint is wrong.
ALTER TABLE clients DROP CONSTRAINT clients_twilio_number_key;
