-- ADMIN ACTIONS & SECURITY SCRIPT
-- Run this in Supabase SQL Editor

-- 1. Enable Hash Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Clean up previous attempts
DROP FUNCTION IF EXISTS public.create_employee_user(text, text, jsonb);
DROP FUNCTION IF EXISTS public.delete_employee(uuid);

-- 3. SECURE FUNCTION: Create Employee
-- This allows an authenticated Admin to create a new user without logging themselves out.
CREATE OR REPLACE FUNCTION public.create_employee_user(
    p_email text,
    p_password text,
    p_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert into auth.users
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
    email_change,
    email_change_token_new,
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
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create Profile is handled by Trigger usually, but let's ensure it exists or returns ID
  -- The trigger 'on_auth_user_created' should handle the rest given the metadata.
  
  RETURN new_user_id;
END;
$$;

-- 4. SECURE FUNCTION: Delete Employee
CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = p_user_id;
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- 5. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;
