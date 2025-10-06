import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'sb-auth-token',
    flowType: 'pkce',
    debug: import.meta.env.MODE === 'development'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  // Production-specific settings
  ...(import.meta.env.MODE === 'production' && {
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  })
})

// Handle email confirmation in URL
if (typeof window !== 'undefined') {
  // ตรวจสอบ URL parameters เมื่อโหลดหน้า
  const urlParams = new URLSearchParams(window.location.search)
  const hasError = urlParams.get('error')
  const errorCode = urlParams.get('error_code')
  
  if (hasError && errorCode === 'otp_expired') {
    console.log('OTP expired, cleaning URL...')
    // ลบ error parameters จาก URL
    const newUrl = window.location.pathname
    window.history.replaceState({}, document.title, newUrl)
  }
  
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state change:', event, session?.user?.email)
    
    if (event === 'SIGNED_IN' && session) {
      console.log('User signed in via email confirmation')
      // Redirect to dashboard if confirmed via email
      if (window.location.pathname === '/auth') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('confirmed') === 'true') {
          console.log('Redirecting to dashboard after email confirmation')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        }
      }
    }
  })
}

// Database Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface CardDesign {
  id: string
  user_id: string
  name: string
  width: number
  height: number
  background_color: string
  texts: TextElement[]
  images: ImageElement[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface TextElement {
  id: string
  content: string
  x: number
  y: number
  font_size: number
  font_family: string
  font_weight: string
  font_style: string
  color: string
}

export interface ImageElement {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

// Authentication Functions
export const signUp = async (email: string, password: string, fullName: string) => {
  // ใช้ URL ปัจจุบันที่แน่นอน
  const currentPort = window.location.port
  const currentHost = window.location.hostname || 'localhost'
  const protocol = window.location.protocol || 'http:'
  
  // สร้าง URL โดยใส่ port เฉพาะ localhost เท่านั้น
  const redirectUrl = currentPort && currentHost === 'localhost' 
    ? `${protocol}//${currentHost}:${currentPort}/auth?confirmed=true`
    : `${protocol}//${currentHost}/auth?confirmed=true`
  
  console.log('Using redirect URL:', redirectUrl)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        role: 'user'
      }
    }
  })
  
  if (error) throw error
  
  console.log('Sign up result:', data)
  
  // ใน production mode - user ต้องยืนยันอีเมลก่อน
  if (data.user && !data.user.email_confirmed_at) {
    console.log('User created but needs email confirmation')
    // ไม่พยายาม auto sign-in เพราะต้องการให้ยืนยันอีเมลก่อน
    return {
      ...data,
      needsConfirmation: true,
      message: 'กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยันเพื่อเปิดใช้งานบัญชี'
    }
  }
  
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    // ตรวจสอบ error เฉพาะเรื่องการยืนยันอีเมล
    if (error.message.includes('Email not confirmed') || 
        error.message.includes('email_not_confirmed') ||
        error.message.includes('signup_disabled')) {
      throw new Error('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam')
    }
    throw error
  }
  
  // ตรวจสอบเพิ่มเติมว่า user ยืนยันอีเมลแล้วหรือยัง
  if (data.user && !data.user.email_confirmed_at) {
    throw new Error('บัญชีของคุณยังไม่ได้รับการยืนยัน กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยัน')
  }
  
  console.log('Sign in successful for confirmed user:', data.user?.email)
  return data
}

export const getCurrentUser = async () => {
  try {
    console.log('Getting current user...')
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    
    console.log('Current user:', user?.email || 'No user')
    return user
  } catch (error) {
    console.error('Exception getting user:', error)
    return null
  }
}

// Force refresh session for debugging
export const refreshSession = async () => {
  try {
    console.log('Refreshing session...')
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }
    console.log('Session refreshed:', data.user?.email)
    return data
  } catch (error) {
    console.error('Exception refreshing session:', error)
    return null
  }
}

export const signOut = async () => {
  console.log('Starting immediate logout process...')
  
  // Immediately clear all local data first (don't wait for API)
  clearAuthData()
  
  // Try to notify server but don't wait for it
  supabase.auth.signOut({ scope: 'global' }).catch(error => {
    console.log('Server signout error (ignored):', error)
  })
  
  // Force immediate navigation - no timeout
  window.location.replace('/auth')
}

export const supabaseSignOut = signOut

// Force clear all auth data immediately
export const clearAuthData = () => {
  console.log('Clearing all auth data immediately...')
  
  try {
    // Clear specific Supabase keys first (faster than clearing all)
    const keysToRemove = [
      'supabase.auth.token',
      'sb-auth-token',
      'supabase-auth-token',
      'sb-wjongayjskbbmlgxivqq-auth-token', // Project specific
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    // Clear any remaining sb- or auth-related keys
    const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
    allKeys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    
    // Clear cookies by setting them to expire
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    })
    
    console.log('All auth data cleared')
  } catch (error) {
    console.error('Error clearing auth data:', error)
  }
}

// Fast logout - immediate response
export const fastLogout = () => {
  console.log('Fast logout initiated...')
  clearAuthData()
  window.location.replace('/auth')
}

// Instant refresh - clear cache and reload
export const instantRefresh = () => {
  console.log('Instant refresh initiated...')
  clearAuthData()
  window.location.reload()
}

// Add force refresh function
export const forceRefreshAuth = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Refresh error:', error)
      clearAuthData()
      window.location.href = '/auth'
    }
    return data
  } catch (error) {
    console.error('Force refresh error:', error)
    clearAuthData()
    window.location.href = '/auth'
  }
}

// Profile Functions
export const createUserProfile = async (user: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: user.user_metadata?.role || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserProfile = async (userId: string) => {
  console.log('Fetching profile from database for user:', userId)
  
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ])
    
    if (error) {
      console.log('Profile query error:', error.message)
      throw error
    }
    
    console.log('Profile fetched successfully:', data)
    console.log('User role:', data?.role, 'Is admin:', data?.role === 'admin')
    return data
  } catch (error) {
    console.error('getUserProfile failed:', error)
    throw error
  }
}

// Debug function to check current user role
export const checkCurrentUserRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No current user')
      return null
    }
    
    const profile = await getUserProfile(user.id)
    console.log('Current user role check:', {
      userId: user.id,
      email: user.email,
      profile: profile,
      role: profile?.role
    })
    return profile
  } catch (error) {
    console.error('Error checking user role:', error)
    return null
  }
}

// Database Helper Functions
export const saveCardDesign = async (design: Omit<CardDesign, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('card_designs')
    .insert([design])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserCardDesigns = async (userId: string) => {
  const { data, error } = await supabase
    .from('card_designs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const updateCardDesign = async (id: string, updates: Partial<CardDesign>) => {
  const { data, error } = await supabase
    .from('card_designs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Admin function to update any card design (bypasses RLS)
export const updateCardDesignAsAdmin = async (id: string, updates: Partial<CardDesign>) => {
  try {
    console.log('Updating card design as admin:', { id, updates })
    
    // ลองใช้ RPC function ก่อน (ถ้ามี)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('update_card_design_for_admin', {
        design_id: id,
        updates: updates
      })
    
    if (rpcError) {
      console.log('RPC function not found, falling back to direct update:', rpcError)
      
      // ถ้า RPC ไม่มี ให้ใช้ direct update
      const { data, error } = await supabase
        .from('card_designs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Direct update failed:', error)
        throw error
      }
      
      console.log('Direct update successful:', data)
      return data
    }
    
    console.log('Admin RPC update successful:', rpcData)
    return rpcData
    
  } catch (error) {
    console.error('Error in updateCardDesignAsAdmin:', error)
    throw error
  }
}

export const deleteCardDesign = async (id: string) => {
  const { error } = await supabase
    .from('card_designs')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Admin Functions
export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('Fetching all users for admin...')
    
    // ลองใช้ RPC function ก่อน
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_all_users_for_admin')
    
    if (!rpcError && rpcData) {
      console.log(`Admin RPC fetched ${rpcData?.length || 0} users`)
      return rpcData
    }
    
    console.log('RPC failed, trying direct query:', rpcError?.message)
    
    // Fallback ไปใช้ direct query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error in getAllUsers:', error)
      throw error
    }
    
    console.log(`Direct query fetched ${data?.length || 0} users`)
    return data || []
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

export const getAllCardDesigns = async () => {
  try {
    console.log('Fetching card designs for admin...')
    
    // ตรวจสอบ current user และ role
    const currentUser = await supabase.auth.getUser()
    console.log('Current user for getAllCardDesigns:', currentUser.data.user?.email)
    
    // ลองใช้ RPC function สำหรับ admin (bypass RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_all_card_designs_for_admin')
      .order('created_at', { ascending: false })
    
    if (!rpcError && rpcData) {
      console.log('Got data from RPC:', rpcData.length, 'designs')
      return rpcData
    }
    
    console.log('RPC failed, trying direct query:', rpcError?.message)
    
    // Fallback to direct query
    const { data, error } = await supabase
      .from('card_designs')
      .select(`
        *,
        profiles (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
    
    console.log('Raw Supabase response:', { data, error })
    
    if (error) {
      console.error('Supabase error in getAllCardDesigns:', error)
      throw error
    }
    
    console.log('Card designs fetched:', data?.length || 0, 'designs')
    console.log('First few designs:', data?.slice(0, 3))
    return data || []
  } catch (error) {
    console.error('Error in getAllCardDesigns:', error)
    throw error
  }
}

// Admin-specific function to get all cards (bypass RLS using RPC)
export const getAdminAllCardDesigns = async () => {
  try {
    console.log('Admin fetching ALL card designs via RPC (bypassing RLS)...')
    
    // ใช้ RPC function สำหรับ Admin
    const { data, error } = await supabase
      .rpc('get_all_card_designs_for_admin')
    
    if (error) {
      console.error('RPC Admin query error:', error)
      console.log('Falling back to direct query...')
      
      // Fallback: ลอง direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('card_designs')
        .select(`
          id,
          name,
          width,
          height,
          background_color,
          texts,
          images,
          user_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        throw fallbackError
      }
      
      console.log(`Admin fallback fetched ${fallbackData?.length || 0} card designs`)
      return fallbackData || []
    }
    
    console.log(`Admin RPC fetched ${data?.length || 0} card designs`)
    return data || []
  } catch (error) {
    console.error('Error in getAdminAllCardDesigns:', error)
    throw error
  }
}

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteUser = async (userId: string) => {
  // First delete all card designs by this user
  const { error: designsError } = await supabase
    .from('card_designs')
    .delete()
    .eq('user_id', userId)

  if (designsError) throw designsError

  // Then delete the user profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) throw profileError
}

// Make first user admin automatically
export const makeFirstUserAdmin = async () => {
  try {
    const { data, error } = await supabase.rpc('make_first_user_admin')

    if (error) {
      console.error('RPC Error:', error)
      throw error
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    console.log('First user admin result:', data)
    return data?.success || false
  } catch (error) {
    console.error('Error making first user admin:', error)
    throw error
  }
}

// Promote current user to admin (for development/setup)
export const promoteCurrentUserToAdmin = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('ไม่พบผู้ใช้ที่ล็อกอิน')
    }

    // Use RPC function to bypass RLS for admin setup
    const { data, error } = await supabase.rpc('promote_user_to_admin', {
      user_id: user.id
    })

    if (error) {
      console.error('RPC Error:', error)
      // Fallback: try direct update (may fail due to RLS)
      const { error: directError } = await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', user.id)
        
      if (directError) {
        throw new Error(`ไม่สามารถตั้งค่า Admin ได้: ${directError.message}`)
      }
    }
    
    return true
  } catch (error) {
    console.error('Error promoting user to admin:', error)
    throw error
  }
}

// Export the User type as UserProfile for compatibility
export type UserProfile = User

// Resend confirmation email
export const resendConfirmation = async (email: string) => {
  // ใช้ URL ปัจจุบันที่แน่นอน
  const currentPort = window.location.port
  const currentHost = window.location.hostname || 'localhost'
  const protocol = window.location.protocol || 'http:'
  
  // สร้าง URL โดยใส่ port เฉพาะ localhost เท่านั้น
  const redirectUrl = currentPort && currentHost === 'localhost' 
    ? `${protocol}//${currentHost}:${currentPort}/auth?confirmed=true`
    : `${protocol}//${currentHost}/auth?confirmed=true`
  
  console.log('Resending confirmation to:', redirectUrl)
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: redirectUrl
    }
  })
  
  if (error) throw error
  return { success: true }
}

// Manual email confirmation for admin use
export const confirmUserEmail = async (userId: string) => {
  const { error } = await supabase.rpc('confirm_user_email', {
    user_id: userId
  })
  
  if (error) throw error
  return { success: true }
}

// Reset and resend confirmation with correct URL
export const resetEmailConfirmation = async (email: string) => {
  try {
    // ลองลบ user ที่ยัง unconfirmed และสร้างใหม่ (ถ้าเป็น development)
    console.log('Attempting to reset email confirmation for:', email)
    
    const currentPort = window.location.port
    const currentHost = window.location.hostname || 'localhost'
    const protocol = window.location.protocol || 'http:'
    
    // สร้าง URL โดยใส่ port เฉพาะ localhost เท่านั้น
    const redirectUrl = currentPort && currentHost === 'localhost' 
      ? `${protocol}//${currentHost}:${currentPort}/auth?confirmed=true`
      : `${protocol}//${currentHost}/auth?confirmed=true`
    
    // ส่งอีเมลใหม่
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) throw error
    return { success: true, message: 'ส่งอีเมลยืนยันใหม่แล้ว โปรดตรวจสอบอีเมลและคลิกลิงก์' }
  } catch (error: any) {
    console.error('Reset confirmation error:', error)
    throw new Error('ไม่สามารถส่งอีเมลยืนยันใหม่ได้ กรุณาลองใหม่หรือสมัครสมาชิกใหม่')
  }
}