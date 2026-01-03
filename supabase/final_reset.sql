-- FINAL FORCE RESET SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update password explicitly
-- This resets the password for 'admin@daysflow.com' to 'admin123'
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf')) 
WHERE email = 'admin@daysflow.com';

-- 3. Ensure the profile exists and has correct ID (Safety check)
INSERT INTO public.profiles (id, first_name, last_name, email, role, employee_id)
SELECT id, 'Admin', 'User', 'admin@daysflow.com', 'admin', 'ADMIN-001'
FROM auth.users WHERE email = 'admin@daysflow.com'
ON CONFLICT (id) DO UPDATE
SET employee_id = 'ADMIN-001';

-- 4. Verify it worked
SELECT email, employee_id, role FROM public.profiles WHERE email = 'admin@daysflow.com';
