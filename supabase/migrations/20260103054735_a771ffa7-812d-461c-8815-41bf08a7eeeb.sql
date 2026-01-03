-- Update the handle_new_user function to use the correct ID generator based on role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  new_employee_id text;
BEGIN
  -- Get the role from user metadata
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'employee');
  
  -- Generate the appropriate ID based on role
  IF user_role = 'admin' THEN
    new_employee_id := public.generate_admin_id();
  ELSE
    new_employee_id := public.generate_employee_id();
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, phone, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    new_employee_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'employee')
  );
  
  RETURN NEW;
END;
$$;