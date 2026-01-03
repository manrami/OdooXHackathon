-- =====================================================
-- DIAGNOSE EMPLOYEE LOGIN ISSUES
-- Run this in Lovable's Supabase SQL Editor
-- =====================================================

-- 1. Check the specific employee that can't login
SELECT 
    'Employee Auth Status' as check_type,
    u.email,
    u.email_confirmed_at,
    CASE 
        WHEN u.email_confirmed_at IS NULL THEN '❌ NOT CONFIRMED'
        ELSE '✅ CONFIRMED'
    END as confirmation_status,
    u.created_at,
    u.raw_user_meta_data->>'force_password_change' as force_pwd_change
FROM auth.users u
WHERE u.email = 'DFBHPA20260016@daysflow.sys';

-- 2. Check if profile exists
SELECT 
    'Employee Profile' as check_type,
    p.employee_id,
    p.email,
    p.first_name,
    p.last_name,
    p.department,
    p.created_at
FROM public.profiles p
WHERE p.employee_id = 'DFBHPA20260016';

-- 3. Check all unconfirmed users
SELECT 
    'All Unconfirmed Users' as check_type,
    email,
    created_at,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name
FROM auth.users
WHERE email_confirmed_at IS NULL
AND email LIKE '%@daysflow.sys'
ORDER BY created_at DESC;

-- =====================================================
-- FIX: AUTO-CONFIRM ALL SYNTHETIC EMAIL USERS
-- =====================================================

-- This will confirm all employees with @daysflow.sys emails
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@daysflow.sys'
AND email_confirmed_at IS NULL;

-- Verify the fix
SELECT 
    '=== VERIFICATION ===' as status,
    COUNT(*) as total_synthetic_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users
FROM auth.users
WHERE email LIKE '%@daysflow.sys';

-- =====================================================
-- PERMANENT FIX: CREATE TRIGGER TO AUTO-CONFIRM
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_synthetic_emails ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_synthetic_emails();

-- Create function to auto-confirm synthetic emails
CREATE OR REPLACE FUNCTION auto_confirm_synthetic_emails()
RETURNS TRIGGER AS $$
BEGIN
    -- If email ends with @daysflow.sys, auto-confirm it
    IF NEW.email LIKE '%@daysflow.sys' AND NEW.email_confirmed_at IS NULL THEN
        NEW.email_confirmed_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER auto_confirm_synthetic_emails
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_confirm_synthetic_emails();

COMMENT ON FUNCTION auto_confirm_synthetic_emails IS 'Automatically confirms email for synthetic @daysflow.sys addresses';

-- Test: Check if trigger was created
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'auto_confirm_synthetic_emails'
        ) THEN '✅ Trigger Created'
        ELSE '❌ Trigger Not Found'
    END as status;
