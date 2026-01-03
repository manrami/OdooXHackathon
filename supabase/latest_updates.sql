-- LATEST UPDATES (Run this in Supabase SQL Editor)

-- 1. Enable pgcrypto (should be on, but good to ensure)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update Employee ID Generation (Safe for admins, robust for employees)
CREATE OR REPLACE FUNCTION public.generate_custom_employee_id(
  p_first_name TEXT,
  p_last_name TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_hire_year INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_prefix TEXT := '';
  v_name_prefix TEXT;
  v_year INTEGER;
  v_serial INTEGER;
  v_employee_id TEXT;
  v_word TEXT;
BEGIN
  IF p_company_name IS NOT NULL AND p_company_name != '' THEN
    FOR v_word IN SELECT regexp_split_to_table(p_company_name, '\s+')
    LOOP
      IF v_word != '' THEN
        v_company_prefix := v_company_prefix || UPPER(LEFT(v_word, 1));
      END IF;
    END LOOP;
  ELSE
    v_company_prefix := 'DF';
  END IF;
  
  v_name_prefix := UPPER(LEFT(COALESCE(p_first_name, 'XX'), 2)) || UPPER(LEFT(COALESCE(p_last_name, 'XX'), 2));
  v_year := COALESCE(p_hire_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN employee_id ~ ('^' || v_company_prefix || '[A-Z]{4}' || v_year::TEXT || '[0-9]{4}$')
      THEN SUBSTRING(employee_id FROM LENGTH(employee_id) - 3)::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_serial
  FROM profiles
  WHERE employee_id LIKE v_company_prefix || '%' || v_year::TEXT || '%';
  
  v_employee_id := v_company_prefix || v_name_prefix || v_year::TEXT || LPAD(v_serial::TEXT, 4, '0');
  
  RETURN v_employee_id;
END;
$$;

-- 3. Create Delete Employee Function (Allows Admin to delete accounts)
CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We attempt to delete from profiles first
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  -- Then from auth.users (requires permission, usually works in Supabase via SECURITY DEFINER)
  -- Note: If this fails, the user remains in Auth but profile is gone.
  -- Ideally, run: delete from auth.users where id = p_user_id
  
  -- IMPORTANT: Standard Postgres roles cannot delete from auth.users directly.
  -- This line might fail depending on your project configuration.
  -- If it fails, the profile deletion above is still a good "soft" removal from the app.
  BEGIN
    DELETE FROM auth.users WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- If auth delete fails, we just ignore it (profile is already gone)
    RAISE NOTICE 'Could not delete from auth.users: %', SQLERRM;
  END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;
