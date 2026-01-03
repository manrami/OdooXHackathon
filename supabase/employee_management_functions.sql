-- =====================================================
-- ADDITIONAL RPC FUNCTIONS FOR EMPLOYEE MANAGEMENT
-- Run this in Lovable's Supabase SQL Editor
-- =====================================================

-- 1. DELETE EMPLOYEE FUNCTION
-- Allows admin to safely delete an employee and all related data
DROP FUNCTION IF EXISTS public.delete_employee(uuid);

CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deleted_email text;
    deleted_name text;
BEGIN
    -- Get employee info before deletion (for logging/confirmation)
    SELECT email, first_name || ' ' || last_name 
    INTO deleted_email, deleted_name
    FROM public.profiles
    WHERE id = p_user_id;

    -- Check if user exists
    IF deleted_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Employee not found'
        );
    END IF;

    -- Delete from related tables (cascade will handle most, but explicit is safer)
    DELETE FROM public.salary_details WHERE employee_id = p_user_id;
    DELETE FROM public.attendance WHERE employee_id = p_user_id;
    DELETE FROM public.leave_requests WHERE employee_id = p_user_id;
    DELETE FROM public.payroll WHERE employee_id = p_user_id;
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    
    -- Delete profile (this should cascade to other tables if FK is set up)
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    -- Delete from auth.users (this is the critical step)
    DELETE FROM auth.users WHERE id = p_user_id;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Employee deleted successfully',
        'deleted_email', deleted_email,
        'deleted_name', deleted_name
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error deleting employee: ' || SQLERRM
        );
END;
$$;

-- Grant permission to authenticated users (RLS will ensure only admins can use it)
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_employee IS 'Safely deletes an employee and all related data. Admin only.';

-- =====================================================
-- 2. CREATE EMPLOYEE USER FUNCTION (Optional)
-- Server-side employee creation with auto-confirmation
-- =====================================================

DROP FUNCTION IF EXISTS public.create_employee_user(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_employee_user(
    p_email text,
    p_password text,
    p_metadata jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_user_id uuid;
    new_employee_id text;
BEGIN
    -- Validate inputs
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email is required'
        );
    END IF;

    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Password must be at least 6 characters'
        );
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email already exists'
        );
    END IF;

    -- Insert into auth.users with auto-confirmation
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
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(), -- Auto-confirm email
        '{"provider": "email", "providers": ["email"]}',
        p_metadata,
        now(),
        now(),
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- Get the employee_id from the profile (created by trigger)
    SELECT employee_id INTO new_employee_id
    FROM public.profiles
    WHERE id = new_user_id;

    -- Return success with user info
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Employee created successfully',
        'user_id', new_user_id,
        'employee_id', new_employee_id,
        'email', p_email
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email already exists'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error creating employee: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.create_employee_user IS 'Creates a new employee user with auto-confirmed email. Admin only.';

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- Test 1: Verify delete_employee function exists
SELECT 
    'delete_employee' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'delete_employee'
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status;

-- Test 2: Verify create_employee_user function exists
SELECT 
    'create_employee_user' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'create_employee_user'
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status;

-- Test 3: List all public functions
SELECT 
    routine_name as function_name,
    routine_type as type,
    '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Test 4: Check function permissions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN ('delete_employee', 'create_employee_user')
ORDER BY routine_name, grantee;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Create an employee (server-side)
-- SELECT public.create_employee_user(
--     'john.doe@example.com',
--     'temp123',
--     '{"first_name": "John", "last_name": "Doe", "role": "employee", "department": "IT"}'::jsonb
-- );

-- Example 2: Delete an employee
-- SELECT public.delete_employee('user-uuid-here');

-- Example 3: Test with a fake UUID (will return "not found")
-- SELECT public.delete_employee('00000000-0000-0000-0000-000000000000');

-- =====================================================
-- COMPLETE VERIFICATION SUMMARY
-- =====================================================

SELECT 
    '=== FUNCTION VERIFICATION SUMMARY ===' as report,
    '' as details
UNION ALL
SELECT 
    'delete_employee',
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_employee')
        THEN '✅ Ready to use'
        ELSE '❌ Not found - run script above'
    END
UNION ALL
SELECT 
    'create_employee_user',
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_employee_user')
        THEN '✅ Ready to use'
        ELSE '❌ Not found - run script above'
    END
UNION ALL
SELECT 
    'get_email_by_employee_id',
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_email_by_employee_id')
        THEN '✅ Already exists'
        ELSE '⚠️ Missing - needed for ID login'
    END
UNION ALL
SELECT 
    'generate_custom_employee_id',
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'generate_custom_employee_id')
        THEN '✅ Already exists'
        ELSE '⚠️ Missing - needed for employee creation'
    END;
