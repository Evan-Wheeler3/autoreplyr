-- 009: add notes field to leads for manual CRM notes
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS notes TEXT;
