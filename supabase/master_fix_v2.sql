-- ==========================================
-- MASTER FIX V2 (Run this to fix Login & Creation)
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. SECURE FUNCTION: Create Employee (Auto-confirmed)
DROP FUNCTION IF EXISTS public.create_employee_user(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_employee_user(
    p_email text,
    p_password text,
    p_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), -- << THIS IS THE FIX: Auto-confirms email so they can login immediately
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

-- 2. FIX EMPLOYEE ID LOGIN RPC
DROP FUNCTION IF EXISTS public.get_email_by_employee_id(text);

CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE UPPER(employee_id) = UPPER(p_employee_id)
  LIMIT 1;
  RETURN user_email;
END;
$$;

-- 3. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO service_role;
