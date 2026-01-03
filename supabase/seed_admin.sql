-- Create a default admin user
-- Run this AFTER running cleanup_users.sql

-- 1. Insert the User into auth.users
-- We use pgcrypto for password hashing if available, otherwise this is tricky without it.
-- Assuming pgcrypto is enabled: CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    'admin-user-uid-1234-5678', -- Fixed UUID for easier reference
    'authenticated',
    'authenticated',
    'admin@daysflow.com',
    crypt('admin123', gen_salt('bf')), -- Password: admin123
    now(),
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Admin", "last_name": "User", "role": "admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- 2. Insert into public.profiles (if trigger doesn't handle it, or to force admin role)
-- Note: If you have a trigger on auth.users insert, this might duplicate or error.
-- Better to use ON CONFLICT or update the profile created by trigger.

-- Wait for trigger or insert manually if no trigger exists for this specific ID yet
INSERT INTO public.profiles (id, first_name, last_name, email, role, employee_id)
VALUES (
    'admin-user-uid-1234-5678',
    'Admin',
    'User',
    'admin@daysflow.com',
    'admin',
    'ADMIN-001'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', employee_id = 'ADMIN-001';

-- 3. Ensure User Role is set (if you use a separate user_roles table)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('admin-user-uid-1234-5678', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
