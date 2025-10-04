-- SQL function to promote user to admin (bypasses RLS)
-- This should be run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION promote_user_to_admin(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with elevated privileges
AS $$
DECLARE
  result_row users%ROWTYPE;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Update user role to admin
  UPDATE users 
  SET 
    role = 'admin',
    updated_at = now()
  WHERE id = user_id
  RETURNING * INTO result_row;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'user_id', result_row.id,
    'email', result_row.email,
    'role', result_row.role
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Function to make first user admin automatically
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_user_row users%ROWTYPE;
BEGIN
  -- Get first user (oldest by created_at)
  SELECT * INTO first_user_row
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Check if user exists and is not already admin
  IF first_user_row.id IS NULL THEN
    RETURN json_build_object('error', 'No users found');
  END IF;

  IF first_user_row.role = 'admin' THEN
    RETURN json_build_object('message', 'First user is already admin');
  END IF;

  -- Promote first user to admin
  UPDATE users 
  SET 
    role = 'admin',
    updated_at = now()
  WHERE id = first_user_row.id;

  RETURN json_build_object(
    'success', true,
    'user_id', first_user_row.id,
    'email', first_user_row.email,
    'message', 'First user promoted to admin'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION make_first_user_admin() TO authenticated;