-- =====================================================
-- SCHEMA VERIFICATION SCRIPT
-- Run this in Lovable's Supabase SQL Editor to verify
-- =====================================================

-- 1. Check if salary_details table exists
SELECT 
    'salary_details table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'salary_details'
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status;

-- 2. Check salary_details columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'salary_details'
ORDER BY ordinal_position;

-- 3. Check if RPC functions exist
SELECT 
    routine_name as function_name,
    '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'create_employee_user',
    'get_email_by_employee_id',
    'delete_employee'
)
ORDER BY routine_name;

-- 4. Check Admin user
SELECT 
    'Admin User' as check_name,
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ Not Confirmed'
    END as email_status,
    created_at
FROM auth.users
WHERE email = 'admin@daysflow.com';

-- 5. Check Admin profile
SELECT 
    'Admin Profile' as check_name,
    email,
    role,
    employee_id,
    first_name,
    last_name
FROM public.profiles
WHERE email = 'admin@daysflow.com';

-- 6. Check RLS policies on salary_details
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'salary_details'
ORDER BY policyname;

-- 7. Summary Report
SELECT 
    '=== SCHEMA VERIFICATION SUMMARY ===' as report,
    '' as details
UNION ALL
SELECT 
    'Tables',
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_details')
        THEN '✅ salary_details exists'
        ELSE '❌ salary_details missing'
    END
UNION ALL
SELECT 
    'Functions',
    (SELECT COUNT(*)::text || ' of 3 functions found' 
     FROM information_schema.routines
     WHERE routine_schema = 'public'
     AND routine_name IN ('create_employee_user', 'get_email_by_employee_id', 'delete_employee'))
UNION ALL
SELECT 
    'Admin User',
    CASE 
        WHEN EXISTS (SELECT FROM auth.users WHERE email = 'admin@daysflow.com')
        THEN '✅ admin@daysflow.com exists'
        ELSE '❌ admin@daysflow.com missing'
    END
UNION ALL
SELECT 
    'RLS Policies',
    (SELECT COUNT(*)::text || ' policies on salary_details'
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'salary_details');
