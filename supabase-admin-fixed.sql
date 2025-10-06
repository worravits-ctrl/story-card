-- Create or replace the RPC function for admin card updates
-- Using correct table name "profiles" instead of "user_profiles"
CREATE OR REPLACE FUNCTION update_card_design_for_admin(
  design_id UUID,
  updates JSONB
)
RETURNS SETOF card_designs
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin (using correct table name "profiles")
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Only allow admins to use this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Perform the update bypassing RLS
  RETURN QUERY
  UPDATE card_designs
  SET 
    name = COALESCE((updates->>'name')::TEXT, card_designs.name),
    background_color = COALESCE((updates->>'background_color')::TEXT, card_designs.background_color),
    width = COALESCE((updates->>'width')::INTEGER, card_designs.width),
    height = COALESCE((updates->>'height')::INTEGER, card_designs.height),
    texts = COALESCE((updates->'texts')::JSONB, card_designs.texts),
    images = COALESCE((updates->'images')::JSONB, card_designs.images),
    updated_at = COALESCE((updates->>'updated_at')::TIMESTAMPTZ, NOW())
  WHERE card_designs.id = design_id
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_card_design_for_admin(UUID, JSONB) TO authenticated;

-- Create RLS policy for admin updates (using correct table name "profiles")
CREATE POLICY "Admin can update any card design" ON card_designs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON FUNCTION update_card_design_for_admin(UUID, JSONB) IS 
'Admin function to update card designs, bypasses RLS policies. Only accessible by admin users.';

COMMENT ON POLICY "Admin can update any card design" ON card_designs IS 
'Allow admin users to update any card design regardless of ownership.';