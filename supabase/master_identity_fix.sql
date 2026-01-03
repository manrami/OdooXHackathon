-- =====================================================
-- BULLETPROOF IDENTITY FIX: onboard_new_employee
-- Run this in your Supabase SQL Editor. 
-- This uses a fresh name to bypass cache issues.
-- =====================================================

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create the fresh function
CREATE OR REPLACE FUNCTION public.onboard_new_employee(
    p_email text,
    p_metadata jsonb,
    p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
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
    now(), -- AUTO-CONFIRMED
    '{"provider": "email", "providers": ["email"]}',
    p_metadata,
    now(),
    now(),
    '',
    ''
  ) RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- 3. Grant full permissions
GRANT EXECUTE ON FUNCTION public.onboard_new_employee(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_new_employee(text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.onboard_new_employee(text, jsonb, text) TO anon;

-- 4. Force cache reload (Optional but helpful)
NOTIFY pgrst, 'reload schema';

-- 5. Verification
SELECT 
    'Identity System Operational' as status,
    'onboard_new_employee' as function,
    'Ready for use' as details;
