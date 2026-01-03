-- BULLETPROOF FIX FOR ADMIN LOGIN
-- Run this in Supabase SQL Editor

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update the RPC function to be CASE INSENSITIVE
DROP FUNCTION IF EXISTS public.get_email_by_employee_id(text);

CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Case-insensitive search using ILIKE or UPPER
  SELECT email INTO user_email
  FROM public.profiles
  WHERE UPPER(employee_id) = UPPER(p_employee_id)
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO authenticated;


-- 3. Nuke and Re-create the Admin User safely
-- We try to update first. If that affects 0 rows, we insert.

DO $$
DECLARE
  admin_uid uuid := 'admin-user-uid-1234-5678';
  found_id uuid;
BEGIN
  -- Check if user exists by email
  SELECT id INTO found_id FROM auth.users WHERE email = 'admin@daysflow.com';
  
  IF found_id IS NOT NULL THEN
    -- User exists, update password and metadata
    UPDATE auth.users 
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        raw_user_meta_data = '{"first_name": "Admin", "last_name": "User", "role": "admin"}'::jsonb
    WHERE id = found_id;
    
    -- Ensure using the known UUID for profiles consistency
    admin_uid := found_id;
  ELSE
    -- Create new user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated', 
      'admin@daysflow.com', crypt('admin123', gen_salt('bf')), 
      now(), '{"first_name": "Admin", "last_name": "User", "role": "admin"}'::jsonb, now(), now()
    );
  END IF;

  -- 4. Fix the Profile
  -- Delete potential duplicates or bad data first (optional, safer to upsert)
  
  INSERT INTO public.profiles (id, first_name, last_name, email, role, employee_id)
  VALUES (admin_uid, 'Admin', 'User', 'admin@daysflow.com', 'admin', 'ADMIN-001')
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    employee_id = 'ADMIN-001',
    email = 'admin@daysflow.com';
    
END $$;

-- 5. Verification Output
SELECT * FROM public.profiles WHERE email = 'admin@daysflow.com';
