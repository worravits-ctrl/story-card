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
  try {
    // Force sign out with scope 'global' to clear all sessions
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) console.error('Signout error:', error)
  } catch (error) {
    console.error('Error during signout:', error)
  }
  
  // Force clear all storage regardless of API response
  clearAuthData()
  
  // Force reload to ensure clean state
  setTimeout(() => {
    window.location.href = '/auth'
  }, 100)
}

export const supabaseSignOut = signOut

// Force clear all auth data
export const clearAuthData = () => {
  try {
    // Clear all localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Clear specific Supabase keys that might remain
    const keysToRemove = [
      'supabase.auth.token',
      'sb-auth-token',
      'supabase-auth-token'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    // Clear any remaining sb- prefixed keys
    Object.keys(localStorage).forEach(key => {
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error in getAllUsers:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

export const getAllCardDesigns = async () => {
  try {
    console.log('Fetching card designs...')
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
    
    if (error) {
      console.error('Supabase error in getAllCardDesigns:', error)
      throw error
    }
    
    console.log('Card designs fetched:', data?.length || 0, 'designs')
    return data || []
  } catch (error) {
    console.error('Error in getAllCardDesigns:', error)
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