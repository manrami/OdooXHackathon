-- ==========================================
-- MASTER FIX SCRIPT (Run this ONCE)
-- ==========================================

-- 1. Enable Cryptography
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. RESET ADMIN USER (Hard Reset)
DELETE FROM auth.users WHERE email = 'admin@daysflow.com';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for Admin
  'authenticated', 'authenticated', 
  'admin@daysflow.com', 
  crypt('admin123', gen_salt('bf')), -- Password: admin123
  NOW(), 
  '{"provider":"email","providers":["email"]}', 
  '{"role":"admin","first_name":"System","last_name":"Admin"}', 
  NOW(), NOW()
);

-- 3. ENSURE ADMIN PROFILE EXISTS
INSERT INTO public.profiles (id, first_name, last_name, email, role, employee_id)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
  'System', 'Admin', 'admin@daysflow.com', 'admin', 'ADMIN-001'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', employee_id = 'ADMIN-001';

-- 4. FIX EMPLOYEE LOGIN RPC (Case Insensitive)
DROP FUNCTION IF EXISTS public.get_email_by_employee_id(text);

CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Allows unauthenticated access
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

-- 5. GRANT PERMISSIONS (Critical for Login)
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO service_role;

-- 6. VERIFY
SELECT email, role, employee_id FROM public.profiles WHERE role = 'admin';
