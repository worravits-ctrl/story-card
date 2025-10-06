-- SQL Functions สำหรับ Admin ใน Supabase
-- ใช้ SQL Editor ใน Supabase Dashboard

-- 1. สร้างฟังก์ชันสำหรับ Admin ดูการ์ดทั้งหมด (bypass RLS)
CREATE OR REPLACE FUNCTION get_all_card_designs_for_admin()
RETURNS TABLE (
  id uuid,
  name text,
  width integer,
  height integer,
  background_color text,
  texts jsonb,
  images jsonb,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_email text,
  user_full_name text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
  SELECT role INTO requesting_user_role 
  FROM profiles 
  WHERE profiles.id = auth.uid();
  
  -- ถ้าไม่ใช่ admin ให้ error
  IF requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- ถ้าเป็น admin ให้ return ข้อมูลทั้งหมด (bypass RLS)
  RETURN QUERY
  SELECT 
    cd.id,
    cd.name,
    cd.width,
    cd.height,
    cd.background_color,
    cd.texts,
    cd.images,
    cd.user_id,
    cd.created_at,
    cd.updated_at,
    p.email as user_email,
    p.full_name as user_full_name
  FROM card_designs cd
  LEFT JOIN profiles p ON cd.user_id = p.id
  ORDER BY cd.created_at DESC;
END;
$$;

-- 2. สร้างฟังก์ชันสำหรับ Admin ดูผู้ใช้ทั้งหมด
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
  SELECT profiles.role INTO requesting_user_role 
  FROM profiles 
  WHERE profiles.id = auth.uid();
  
  -- ถ้าไม่ใช่ admin ให้ error
  IF requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- ถ้าเป็น admin ให้ return ข้อมูลทั้งหมด
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    p.updated_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_all_card_designs_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;