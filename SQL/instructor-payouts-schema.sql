-- Instructor Payouts Setup - Complete SQL Schema
-- Tech Stack: PostgreSQL (Supabase)
-- Purpose: Production-ready payout management for instructors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create instructor_payouts table
CREATE TABLE IF NOT EXISTS instructor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payout_provider VARCHAR(50) NOT NULL CHECK (payout_provider IN ('stripe', 'razorpay', 'bank_transfer')),
    payout_method VARCHAR(50) NOT NULL CHECK (payout_method IN ('upi', 'bank_account', 'debit_card')),
    payout_account_token TEXT,
    payout_account_last4 VARCHAR(4),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    tax_form_status VARCHAR(50) DEFAULT 'not_started' CHECK (tax_form_status IN ('not_started', 'in_progress', 'submitted', 'approved', 'rejected')),
    estimated_monthly_earnings NUMERIC(10,2) DEFAULT 0,
    payout_speed VARCHAR(50),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE instructor_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Instructors can view their own payout data"
    ON instructor_payouts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Instructors can insert their own payout data"
    ON instructor_payouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can update their own payout data"
    ON instructor_payouts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_instructor_payouts_user_id ON instructor_payouts(user_id);
CREATE INDEX idx_instructor_payouts_provider ON instructor_payouts(payout_provider);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instructor_payouts_updated_at
    BEFORE UPDATE ON instructor_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for instructor_payouts
ALTER PUBLICATION supabase_realtime ADD TABLE instructor_payouts;

-- Example INSERT (for reference)
-- INSERT INTO instructor_payouts (user_id, payout_provider, payout_method, payout_account_token, payout_account_last4, currency, tax_form_status, payout_speed)
-- VALUES (
--     'your-user-id-here',
--     'razorpay',
--     'upi',
--     'test-token-123',
--     '1234',
--     'INR',
--     'not_started',
--     'Instant'
-- );

-- Example UPSERT (for frontend integration)
-- INSERT INTO instructor_payouts (user_id, payout_provider, payout_method, payout_account_token, payout_account_last4, currency, tax_form_status, payout_speed)
-- VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
-- ON CONFLICT (user_id)
-- DO UPDATE SET
--     payout_provider = EXCLUDED.payout_provider,
--     payout_method = EXCLUDED.payout_method,
--     payout_account_token = EXCLUDED.payout_account_token,
--     payout_account_last4 = EXCLUDED.payout_account_last4,
--     currency = EXCLUDED.currency,
--     tax_form_status = EXCLUDED.tax_form_status,
--     payout_speed = EXCLUDED.payout_speed,
--     updated_at = NOW();
