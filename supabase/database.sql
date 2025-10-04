-- Enable RLS (Row Level Security)
-- Run these SQL commands in Supabase SQL Editor

-- 1. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2. Create card_designs table
CREATE TABLE IF NOT EXISTS card_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background_color TEXT DEFAULT '#ffffff',
  texts JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_designs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create RLS policies for card_designs
-- Users can view their own designs
CREATE POLICY "Users can view own designs" ON card_designs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view public designs
CREATE POLICY "Users can view public designs" ON card_designs
  FOR SELECT USING (is_public = true);

-- Users can insert their own designs
CREATE POLICY "Users can create own designs" ON card_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own designs
CREATE POLICY "Users can update own designs" ON card_designs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own designs
CREATE POLICY "Users can delete own designs" ON card_designs
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can do everything with card_designs
CREATE POLICY "Admins can manage all designs" ON card_designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_card_designs_updated_at
  BEFORE UPDATE ON card_designs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_designs_user_id ON card_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_card_designs_is_public ON card_designs(is_public);
CREATE INDEX IF NOT EXISTS idx_card_designs_created_at ON card_designs(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 11. Insert admin user (optional - update email to your email)
-- INSERT INTO profiles (id, email, full_name, role) 
-- VALUES (
--   'your-user-id-from-auth-users-table',
--   'admin@example.com',
--   'System Admin',
--   'admin'
-- );

COMMENT ON TABLE profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE card_designs IS 'Card designs created by users';
COMMENT ON COLUMN card_designs.texts IS 'JSON array of text elements';
COMMENT ON COLUMN card_designs.images IS 'JSON array of image elements';