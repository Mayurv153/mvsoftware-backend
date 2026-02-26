-- ============================================
-- MV Software — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- ── Enable UUID extension ───────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Plans ───────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_inr INTEGER NOT NULL,          -- price in paisa (399900 = ₹3,999)
  display_price TEXT NOT NULL,          -- "₹3,999"
  features JSONB NOT NULL DEFAULT '[]',
  delivery_days INTEGER NOT NULL DEFAULT 7,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Orders (Razorpay Orders) ────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  razorpay_order_id TEXT UNIQUE,
  amount INTEGER NOT NULL,              -- in paisa
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE,
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payments (Verified Transactions) ────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'failed', 'refunded')),
  method TEXT,                          -- card, upi, netbanking, etc.
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects (Client Workspaces) ────────────
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'review', 'delivered', 'completed', 'cancelled')),
  deadline TIMESTAMPTZ,
  assigned_to TEXT DEFAULT 'founder',
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Service Requests (Contact Form) ─────────
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  plan_slug TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tasks (Internal Team Tasks) ─────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT DEFAULT 'founder',
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Admin Metrics (Daily Dashboard) ─────────
CREATE TABLE IF NOT EXISTS admin_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_revenue INTEGER NOT NULL DEFAULT 0,     -- in paisa
  new_projects INTEGER NOT NULL DEFAULT 0,
  new_requests INTEGER NOT NULL DEFAULT 0,
  new_payments INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Idempotency Keys ────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  response JSONB NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ── Profiles (Extended User Data) ───────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan_slug TEXT DEFAULT 'free',
  phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_email ON service_requests(email);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_date ON admin_metrics(date);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Plans: readable by everyone, writable by service role only
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are publicly readable" ON plans FOR SELECT USING (true);

-- Orders: users can read their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on orders" ON orders FOR ALL USING (auth.role() = 'service_role');

-- Payments: users can read their own payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on payments" ON payments FOR ALL USING (auth.role() = 'service_role');

-- Projects: users can read their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on projects" ON projects FOR ALL USING (auth.role() = 'service_role');

-- Service Requests: no public read (admin only via service role)
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on service_requests" ON service_requests FOR ALL USING (auth.role() = 'service_role');

-- Tasks: admin only via service role
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on tasks" ON tasks FOR ALL USING (auth.role() = 'service_role');

-- Admin Metrics: admin only via service role
ALTER TABLE admin_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on admin_metrics" ON admin_metrics FOR ALL USING (auth.role() = 'service_role');

-- Idempotency Keys: service role only
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on idempotency_keys" ON idempotency_keys FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SEED DATA — Plans
-- ============================================
INSERT INTO plans (name, slug, price_inr, display_price, features, delivery_days, priority) VALUES
  (
    'Starter',
    'starter',
    399900,
    '₹3,999',
    '["1-page landing website", "Mobile responsive", "WhatsApp button", "Contact form", "3-day delivery"]'::jsonb,
    3,
    'normal'
  ),
  (
    'Growth',
    'growth',
    999900,
    '₹9,999',
    '["5-page website", "Basic SEO", "WhatsApp + contact form", "7-day delivery"]'::jsonb,
    7,
    'high'
  ),
  (
    'Pro',
    'pro',
    1999900,
    '₹19,999',
    '["Full custom website (8–10 pages)", "Admin dashboard for leads", "Razorpay integration", "SEO setup", "Performance optimization", "14-day delivery"]'::jsonb,
    14,
    'urgent'
  ),
  (
    'Custom',
    'custom',
    0,
    'Contact Us',
    '["Web apps", "SaaS", "Dashboards", "AI integrations", "Maintenance"]'::jsonb,
    30,
    'normal'
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FUNCTION: Auto-cleanup expired idempotency keys
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_admin_metrics_updated_at BEFORE UPDATE ON admin_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
