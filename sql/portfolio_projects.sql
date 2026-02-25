-- ── Portfolio Projects (Showcase) ──────────────
-- Projects to display on the public /projects page
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS portfolio_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Website',
    description TEXT NOT NULL,
    tech TEXT[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    live_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin)
CREATE POLICY "Service role full access on portfolio_projects"
    ON portfolio_projects FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read published projects
CREATE POLICY "Published portfolio projects are publicly readable"
    ON portfolio_projects FOR SELECT
    USING (is_published = true);

-- Auto-update trigger
CREATE TRIGGER trigger_portfolio_projects_updated_at
    BEFORE UPDATE ON portfolio_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolio_published ON portfolio_projects(is_published, sort_order);

-- Seed existing hardcoded projects
INSERT INTO portfolio_projects (title, category, description, tech, image_url, is_published, sort_order)
SELECT * FROM (VALUES
    ('Nova Dashboard', 'Application', 'Real-time analytics dashboard for a SaaS startup with live data visualization and team management.', ARRAY['Next.js','Node.js','MongoDB','Chart.js'], 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80', true, 1),
    ('Urban Threads', 'E-Commerce', 'Fashion e-commerce store with Razorpay checkout, inventory management, and customer accounts.', ARRAY['Shopify','Liquid','JavaScript','Razorpay'], 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80', true, 2),
    ('Vortex Studio', 'Website', 'Portfolio website for a creative agency with scroll animations and cinematic page transitions.', ARRAY['Next.js','Framer Motion','Tailwind CSS'], 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&q=80', true, 3),
    ('MedCare Clinic', 'WordPress', 'Healthcare practice website with appointment booking, doctor profiles, and patient portal.', ARRAY['WordPress','Elementor','PHP','MySQL'], 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80', true, 4),
    ('Ascend Holdings', 'Website', 'Corporate website for a financial services firm with investor relations and team showcase.', ARRAY['Next.js','React','Tailwind CSS','Vercel'], 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80', true, 5),
    ('FreshKart', 'E-Commerce', 'Grocery delivery app with real-time order tracking, multi-vendor support, and UPI payments.', ARRAY['React Native','Node.js','PostgreSQL','Stripe'], 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=900&q=80', true, 6),
    ('TravelBlog Pro', 'WordPress', 'High-traffic travel blog with SEO optimization, ad integration, and newsletter system.', ARRAY['WordPress','Yoast SEO','WP Rocket','Mailchimp'], 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80', true, 7),
    ('TaskFlow', 'Application', 'Project management tool with Kanban boards, team chat, and automated workflows.', ARRAY['React','Firebase','Tailwind CSS','WebSockets'], 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80', true, 8)
) AS v(title, category, description, tech, image_url, is_published, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM portfolio_projects p WHERE p.title = v.title
);
