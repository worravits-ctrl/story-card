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
  signUp: (email: string, password: string, fullName: string) => Promise<any>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with more debug info
    console.log('AuthProvider initializing...')
    console.log('Current URL:', window.location.href)
    
    getCurrentUser().then(async (user) => {
      console.log('Initial user check:', user?.email || 'No user')
      setUser(user)
      if (user) {
        try {
          // Load profile with timeout
          await Promise.race([
            loadUserProfile(user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Initial profile loading timeout')), 8000)
            )
          ])
        } catch (error) {
          console.error('Initial profile loading failed:', error)
          // Set minimal profile
          setUserProfile({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || 'User',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
      setLoading(false)
    }).catch((error) => {
      console.error('Error getting initial user:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        try {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            // Load profile with timeout protection
            Promise.race([
              loadUserProfile(session.user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile loading timeout')), 10000)
              )
            ]).catch((error) => {
              console.error('Profile loading failed or timed out:', error)
              // Set minimal profile to continue
              setUserProfile({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || 'User',
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            }).finally(() => {
              console.log('Setting loading to false after profile attempt')
              setLoading(false)
            })
          } else {
            setUserProfile(null)
            setLoading(false)
          }
        } catch (error) {
          console.error('Error handling auth state change:', error)
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
        } else {
          console.error('No current user found when creating profile')
          // Set basic profile to prevent infinite loading
          setUserProfile({
            id: userId,
            email: 'unknown@email.com',
            full_name: 'User',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
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
      const result = await supabaseSignUp(email, password, fullName)
      if (result.user) {
        // Profile will be created automatically via auth state change
        console.log('User signed up successfully:', result.user.email)
      }
      return result
    } catch (error: any) {
      throw new Error(error.message || 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('AuthContext: Starting immediate logout...')
    
    // Clear state immediately - no loading state
    setUser(null)
    setUserProfile(null)
    setLoading(false)
    
    // Clear auth data and redirect immediately (don't await)
    supabaseSignOut().catch(error => {
      console.log('Background signout error (ignored):', error)
    })
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