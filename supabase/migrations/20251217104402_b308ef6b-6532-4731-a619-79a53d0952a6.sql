-- Fix get_user_id_by_email to require admin role check
-- This prevents user enumeration attacks

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require admin access to prevent user enumeration
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN (SELECT id FROM auth.users WHERE email = _email LIMIT 1);
END;
$$;