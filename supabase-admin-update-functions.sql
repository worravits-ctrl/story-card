-- RPC function for admin to update card designs (bypasses RLS)
CREATE OR REPLACE FUNCTION update_card_design_for_admin(
  design_id UUID,
  updates JSONB
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  background_color TEXT,
  width INTEGER,
  height INTEGER,
  texts JSONB,
  images JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM user_profiles 
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
  RETURNING 
    card_designs.id,
    card_designs.name,
    card_designs.background_color,
    card_designs.width,
    card_designs.height,
    card_designs.texts,
    card_designs.images,
    card_designs.user_id,
    card_designs.created_at,
    card_designs.updated_at;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION update_card_design_for_admin(UUID, JSONB) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION update_card_design_for_admin(UUID, JSONB) IS 
'Admin function to update card designs, bypasses RLS policies. Only accessible by admin users.';