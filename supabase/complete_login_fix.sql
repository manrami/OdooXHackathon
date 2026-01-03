-- =====================================================
-- COMPLETE LOGIN FIX FOR ADMIN AND EMPLOYEES
-- Run this in Lovable's Supabase SQL Editor
-- =====================================================

-- 1. AUTO-CONFIRM ALL SYNTHETIC EMAIL USERS (EMPLOYEES)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@daysflow.sys'
AND email_confirmed_at IS NULL;

-- 2. ENSURE ADMIN USER EXISTS AND IS CONFIRMED
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin exists
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@daysflow.com';

    IF admin_user_id IS NULL THEN
        -- Create admin if doesn't exist
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@daysflow.com',
            crypt('admin123', gen_salt('bf')),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"role": "admin", "first_name": "System", "last_name": "Admin"}',
            now(),
            now(),
            '',
            ''
        ) RETURNING id INTO admin_user_id;

        -- Create admin profile
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            employee_id
        ) VALUES (
            admin_user_id,
            'admin@daysflow.com',
            'System',
            'Admin',
            'admin',
            'ADMIN-001'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = 'admin',
            employee_id = 'ADMIN-001';
    ELSE
        -- Admin exists, just confirm email and reset password
        UPDATE auth.users
        SET 
            email_confirmed_at = now(),
            encrypted_password = crypt('admin123', gen_salt('bf'))
        WHERE id = admin_user_id;
    END IF;
END $$;

-- 3. CREATE TRIGGER TO AUTO-CONFIRM FUTURE SYNTHETIC EMAILS
DROP TRIGGER IF EXISTS auto_confirm_synthetic_emails ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_synthetic_emails();

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

CREATE TRIGGER auto_confirm_synthetic_emails
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_confirm_synthetic_emails();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check Admin
SELECT 
    '=== ADMIN STATUS ===' as check_type,
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED'
        ELSE '❌ NOT CONFIRMED'
    END as status,
    created_at
FROM auth.users
WHERE email = 'admin@daysflow.com';

-- Check Admin Profile
SELECT 
    '=== ADMIN PROFILE ===' as check_type,
    email,
    role,
    employee_id,
    first_name,
    last_name
FROM public.profiles
WHERE email = 'admin@daysflow.com';

-- Check All Employees
SELECT 
    '=== EMPLOYEES ===' as check_type,
    u.email,
    CASE 
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED'
        ELSE '❌ NOT CONFIRMED'
    END as status,
    p.employee_id,
    p.first_name,
    p.last_name,
    u.raw_user_meta_data->>'force_password_change' as force_pwd_change
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%@daysflow.sys'
ORDER BY u.created_at DESC;

-- Summary
SELECT 
    '=== SUMMARY ===' as report,
    '' as details
UNION ALL
SELECT 
    'Admin User',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE email = 'admin@daysflow.com' 
            AND email_confirmed_at IS NOT NULL
        ) THEN '✅ Ready (admin@daysflow.com / admin123)'
        ELSE '❌ Not ready'
    END
UNION ALL
SELECT 
    'Employee Users',
    COUNT(*)::text || ' employees, ' ||
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END)::text || ' confirmed'
FROM auth.users
WHERE email LIKE '%@daysflow.sys';
