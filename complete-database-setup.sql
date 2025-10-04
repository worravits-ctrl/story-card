-- Complete Supabase Database Setup for Story Card App
-- Run this entire script in Supabase SQL Editor

-- 1. Create users table
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create card_designs table
CREATE TABLE card_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background_color TEXT DEFAULT '#ffffff',
  texts JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_designs ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Create policies for card_designs table
CREATE POLICY "Users can view their own designs"
  ON card_designs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own designs"
  ON card_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs"
  ON card_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs"
  ON card_designs FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Admin policies (admins can see everything)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any user"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all designs"
  ON card_designs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any design"
  ON card_designs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. Admin management functions
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_user_row users%ROWTYPE;
BEGIN
  SELECT * INTO first_user_row
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF first_user_row.id IS NULL THEN
    RETURN json_build_object('error', 'No users found');
  END IF;

  IF first_user_row.role = 'admin' THEN
    RETURN json_build_object('message', 'First user is already admin');
  END IF;

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

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION make_first_user_admin() TO authenticated;

-- 11. Set your email as admin (CHANGE THIS EMAIL!)
-- INSERT OR UPDATE your user as admin after registration
-- This will run after you sign up with your email

-- Example: Uncomment and change email to yours
-- INSERT INTO users (id, email, full_name, role) 
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'worravit38@hotmail.com' LIMIT 1),
--   'worravit38@hotmail.com',
--   'Admin User',
--   'admin'
-- ) 
-- ON CONFLICT (id) 
-- DO UPDATE SET role = 'admin';

-- OR simply update existing user:
-- UPDATE users SET role = 'admin' WHERE email = 'worravit38@hotmail.com';