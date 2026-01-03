-- UPDATED ID GENERATION LOGIC
-- Run this in Supabase SQL Editor

-- 1. Redefine logic for custom employee IDs
-- We keep the logic as is for EMPLOYEES, but ensure it doesn't conflict or look "Admin-like" if that was the concern.
-- But the user said "remove auto generated admin id".
-- Since Admins are created via our special script (or manually) and set to 'ADMIN-001',
-- this function is ONLY called by `CreateEmployee.tsx`.
-- So it inherently only affects Employees.
-- We will just make sure it's robust.

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
  -- Get company prefix (first letter of each word in company name)
  IF p_company_name IS NOT NULL AND p_company_name != '' THEN
    FOR v_word IN SELECT regexp_split_to_table(p_company_name, '\s+')
    LOOP
      IF v_word != '' THEN
        v_company_prefix := v_company_prefix || UPPER(LEFT(v_word, 1));
      END IF;
    END LOOP;
  ELSE
    v_company_prefix := 'DF'; -- Default: DayFlow
  END IF;
  
  -- Get first 2 letters of first name and last name (uppercase)
  v_name_prefix := UPPER(LEFT(COALESCE(p_first_name, 'XX'), 2)) || UPPER(LEFT(COALESCE(p_last_name, 'XX'), 2));
  
  -- Get year (use hire year if provided, otherwise current year)
  v_year := COALESCE(p_hire_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  -- Get next serial number for this year
  SELECT COALESCE(MAX(
    -- Improved regex to match strictly
    CASE 
      WHEN employee_id ~ ('^' || v_company_prefix || '[A-Z]{4}' || v_year::TEXT || '[0-9]{4}$')
      THEN SUBSTRING(employee_id FROM LENGTH(employee_id) - 3)::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_serial
  FROM profiles
  WHERE employee_id LIKE v_company_prefix || '%' || v_year::TEXT || '%';
  
  -- Construct the employee ID
  v_employee_id := v_company_prefix || v_name_prefix || v_year::TEXT || LPAD(v_serial::TEXT, 4, '0');
  
  RETURN v_employee_id;
END;
$$;
