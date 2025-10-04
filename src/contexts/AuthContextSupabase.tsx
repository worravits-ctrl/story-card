import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { 
  supabase, 
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getCurrentUser,
  getUserProfile,
  createUserProfile,
  type User
} from '@/lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getCurrentUser().then((user) => {
      setUser(user)
      if (user) {
        loadUserProfile(user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        try {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await loadUserProfile(session.user.id)
          } else {
            setUserProfile(null)
          }
        } catch (error) {
          console.error('Error handling auth state change:', error)
        } finally {
          console.log('Setting loading to false')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId)
      const profile = await getUserProfile(userId)
      console.log('Profile loaded:', profile)
      setUserProfile(profile)
    } catch (error: any) {
      console.log('Profile not found, creating new profile...', error.message)
      // Profile doesn't exist, create it
      try {
        const user = await getCurrentUser()
        if (user) {
          console.log('Creating new profile for user:', user.email)
          const newProfile = await createUserProfile(user)
          console.log('New profile created:', newProfile)
          setUserProfile(newProfile)
        }
      } catch (createError) {
        console.error('Error creating profile:', createError)
        // Even if profile creation fails, continue with basic user data
        setUserProfile({
          id: userId,
          email: '',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { user } = await supabaseSignIn(email, password)
      if (user) {
        await loadUserProfile(user.id)
      }
    } catch (error: any) {
      throw new Error(error.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { user } = await supabaseSignUp(email, password, fullName)
      if (user) {
        // Profile will be created automatically via auth state change
        console.log('User signed up successfully:', user.email)
      }
    } catch (error: any) {
      throw new Error(error.message || 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Clear state first
      setUser(null)
      setUserProfile(null)
      
      // Then clear auth data (this will redirect)
      await supabaseSignOut()
    } catch (error: any) {
      console.error('Signout error:', error)
      // Force clear even if error
      setUser(null)
      setUserProfile(null)
      window.location.href = '/auth'
    } finally {
      setLoading(false)
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}