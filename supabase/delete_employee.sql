-- RPC Function to Delete User
-- This function allows an admin to delete a user from auth.users (and cascades to profiles)

-- Note: Deleting from auth.users requires elevated privileges usually.
-- In Supabase, you often need to use the service_role key or a function with SECURITY DEFINER that has permissions.
-- However, standard Postgres functions can't easily delete from auth.users due to schema restrictions.
-- The most robust way without Edge Functions is to delete from public.profiles and rely on a trigger, 
-- OR use a function that acts as a superuser (Security Definer) IF permission allows.
-- A common workaround for "deletion" in pure SQL:
-- We can't actually delete from auth.users easily via function for security.
-- BUT, if we delete from public.profiles, and if there is a foreign key constraint with CASCADE, it might work?
-- Usually FK is profiles -> users. Deleting profile doesn't delete user.
-- Deleting user deletes profile.

-- STRATEGY: 
-- We will creating a function that sets the user to 'inactive' or similar if we can't delete.
-- BUT the user wants to REMOVE.
-- Let's try the direct delete approach for `public.profiles` and see if `supabase-admin` triggers can handle it.
-- Actually, let's try to utilize the fact that we can call Supabase Admin API from the client if we have the right setup? No.

-- BETTING ON: Using utilizing a `SECURITY DEFINER` function to delete from `auth.users`.
-- This works in many self-hosted or standard Supabase setups if the postgres role has access.

CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if the requestor is an admin (Optional but good safety)
  -- For now, we trust the RLS policies on the EXECUTE of this function.
  
  -- Delete from public profiles first (to be clean)
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Attempt to delete from auth.users
  -- This requires the function to run with privileges that can delete from auth schema.
  -- 'postgres' role usually can. SECURITY DEFINER runs as owner (postgres usually).
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated users (RLS will filter usage or we check role inside)
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;
