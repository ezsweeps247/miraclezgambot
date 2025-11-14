-- Fix Railway database schema issues
-- Run this on your Railway PostgreSQL database

-- Create jackpot_pools table if it doesn't exist
CREATE TABLE IF NOT EXISTS jackpot_pools (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR NOT NULL,
    currency VARCHAR NOT NULL,
    amount DECIMAL(20, 2) DEFAULT 100.00,
    seed_amount DECIMAL(20, 2) DEFAULT 100.00,
    contribution_rate DECIMAL(8, 4) DEFAULT 0.0050,
    seed_growth_rate DECIMAL(8, 4) DEFAULT 0.0200,
    last_won_at TIMESTAMP,
    last_winner_id VARCHAR,
    total_wins INTEGER DEFAULT 0,
    game_eligibility TEXT[] DEFAULT ARRAY['all'],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add is_instant column to withdrawals if it doesn't exist
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS is_instant BOOLEAN DEFAULT FALSE;

-- Insert default jackpot pools if they don't exist
INSERT INTO jackpot_pools (id, tier, currency, amount, seed_amount, contribution_rate, seed_growth_rate, game_eligibility)
VALUES 
    (gen_random_uuid(), 'MINI', 'GC', 100.00, 100.00, 0.0050, 0.0200, ARRAY['all']),
    (gen_random_uuid(), 'MINOR', 'GC', 500.00, 500.00, 0.0100, 0.0150, ARRAY['all']),
    (gen_random_uuid(), 'MAJOR', 'GC', 2500.00, 2500.00, 0.0200, 0.0100, ARRAY['all']),
    (gen_random_uuid(), 'MEGA', 'GC', 10000.00, 10000.00, 0.0250, 0.0050, ARRAY['all']),
    (gen_random_uuid(), 'MINI', 'SC', 100.00, 100.00, 0.0050, 0.0200, ARRAY['all']),
    (gen_random_uuid(), 'MINOR', 'SC', 500.00, 500.00, 0.0100, 0.0150, ARRAY['all']),
    (gen_random_uuid(), 'MAJOR', 'SC', 2500.00, 2500.00, 0.0200, 0.0100, ARRAY['all']),
    (gen_random_uuid(), 'MEGA', 'SC', 10000.00, 10000.00, 0.0250, 0.0050, ARRAY['all'])
ON CONFLICT DO NOTHING;