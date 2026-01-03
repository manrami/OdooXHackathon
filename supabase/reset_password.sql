-- FORCE PASSWORD RESET
-- Run this in Supabase SQL Editor

-- 1. Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update the password for the admin email directly
-- This works even if the previous DELETE failed due to database constraints.
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@daysflow.com';

-- 3. Verify the user exists (returns the user if found)
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@daysflow.com';
