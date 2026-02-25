-- Add category and offer fields to plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS offer_title TEXT,
  ADD COLUMN IF NOT EXISTS offer_tagline TEXT,
  ADD COLUMN IF NOT EXISTS offer_discount INTEGER,
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;

-- Suggested enum values for category (not enforced here):
-- website, application, ecommerce, wordpress, other
