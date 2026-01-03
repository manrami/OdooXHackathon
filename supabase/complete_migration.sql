-- =====================================================
-- COMPLETE DATABASE MIGRATION FOR DAYSFLOW
-- Run this in Lovable's Supabase SQL Editor
-- =====================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 2. CREATE SALARY DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.salary_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Wage Configuration
    wage_type TEXT NOT NULL DEFAULT 'monthly' CHECK (wage_type IN ('monthly', 'yearly')),
    wage NUMERIC(12, 2) NOT NULL DEFAULT 0,
    working_days INTEGER DEFAULT 22,
    break_time NUMERIC(4, 2) DEFAULT 1,
    
    -- Salary Components (stored as JSONB for flexibility)
    components JSONB DEFAULT '[]'::jsonb,
    
    -- Bank Details
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    pan_no TEXT,
    uan_no TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one config per employee
    UNIQUE(employee_id)
);

-- Add RLS Policies for salary_details
ALTER TABLE public.salary_details ENABLE ROW LEVEL SECURITY;

-- Admin can view all salary details
CREATE POLICY "Admins can view all salary details"
    ON public.salary_details
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admin can insert salary details
CREATE POLICY "Admins can insert salary details"
    ON public.salary_details
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admin can update salary details
CREATE POLICY "Admins can update salary details"
    ON public.salary_details
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Employees can view their own salary details
CREATE POLICY "Employees can view own salary details"
    ON public.salary_details
    FOR SELECT
    TO authenticated
    USING (employee_id = auth.uid());

-- =====================================================
-- 3. CREATE/UPDATE ADMIN USER & PROFILE
-- =====================================================

-- Delete existing admin if present
DELETE FROM auth.users WHERE email = 'admin@daysflow.com';

-- Create Admin User (Auto-confirmed)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
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

    -- Create Admin Profile
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
END $$;

-- =====================================================
-- 4. CREATE SECURE RPC FUNCTIONS
-- =====================================================

-- Function: Create Employee User (Auto-confirmed)
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
  
  RETURN new_user_id;
END;
$$;

-- Function: Get Email by Employee ID
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
  SELECT email INTO user_email
  FROM public.profiles
  WHERE UPPER(employee_id) = UPPER(p_employee_id)
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Function: Delete Employee
DROP FUNCTION IF EXISTS public.delete_employee(uuid);

CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_user(text, text, jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.salary_details TO authenticated;
GRANT ALL ON public.salary_details TO service_role;

-- =====================================================
-- 6. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_salary_details_updated_at ON public.salary_details;

CREATE TRIGGER update_salary_details_updated_at
    BEFORE UPDATE ON public.salary_details
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify Admin User
SELECT 
    'Admin user created successfully' as status,
    email,
    email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users 
WHERE email = 'admin@daysflow.com';
