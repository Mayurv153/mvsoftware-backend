-- ── Testimonials Table ────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    client_role TEXT,
    client_company TEXT,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    is_published BOOLEAN NOT NULL DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (admin access)
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on testimonials" ON testimonials FOR ALL USING (auth.role() = 'service_role');

-- Public read for published testimonials
CREATE POLICY "Published testimonials are publicly readable" ON testimonials FOR SELECT USING (is_published = true);

-- Auto-update trigger
CREATE TRIGGER trigger_testimonials_updated_at
    BEFORE UPDATE ON testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(is_published);
