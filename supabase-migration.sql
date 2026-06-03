-- Supabase Migration: PrimeCV schema
-- Run this in the Supabase SQL Editor to set up your database.

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  preview_count INTEGER NOT NULL DEFAULT 0,
  last_preview_reset TEXT NOT NULL DEFAULT '',
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'free',
  plan_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent_date TIMESTAMPTZ,
  marketing_consent BOOLEAN
);

-- 2. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
-- Users can read their own record
CREATE POLICY "Users can read own record"
  ON users
  FOR SELECT
  USING (auth.uid()::text = uid);

-- Users can insert their own record (sign-up)
CREATE POLICY "Users can insert own record"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = uid);

-- Admin can read/update all (for Stripe webhooks, etc.)
-- The service_role key bypasses RLS entirely, so this policy
-- is for the admin UI. Adjust admin email as needed.
CREATE POLICY "Admin full access"
  ON users
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'rjcosta@gmail.com');

-- 4. Create index for Stripe customer ID lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- 5. CVs table (per-user CV storage)
CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid TEXT NOT NULL,
  cv_id TEXT NOT NULL,
  job_role TEXT NOT NULL,
  data JSONB NOT NULL,
  generated_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_uid, cv_id)
);

ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own CVs"
  ON cvs FOR ALL
  USING (auth.uid()::text = user_uid);

CREATE INDEX IF NOT EXISTS idx_cvs_user_uid ON cvs(user_uid);

-- 6. Helpful view for debugging
CREATE OR REPLACE VIEW user_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_pro) as pro_users,
  AVG(preview_count) as avg_previews
FROM users;
