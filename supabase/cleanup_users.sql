-- DANGER: This will delete ALL users and profiles from the system.
-- Run this in the Supabase SQL Editor.

-- 1. Disable triggers temporarily if needed (optional but safer for mass deletes)
-- ALTER TABLE public.profiles DISABLE TRIGGER ALL;

-- 2. Delete all profiles (public data)
DELETE FROM public.profiles;

-- 3. Delete all employees (if you have a separate employees table, though often it's linked to auth.users)
-- DELETE FROM public.employees; -- Uncomment if this table exists and isn't cascaded

-- 4. Delete all users from auth.users (this usually cascades to other tables linked by foreign keys)
-- You must have the appropriate permissions (service_role) or run this in SQL Editor
DELETE FROM auth.users;

-- 5. Re-enable triggers
-- ALTER TABLE public.profiles ENABLE TRIGGER ALL;
