import { createContext, useContext, useEffect, useState } from 'react'
import { 
  getCurrentUser, 
  setCurrentUser, 
  signInWithEmail as localSignIn,
  signOut as localSignOut,
  type User 
} from '@/lib/localStorage'

interface AuthContextType {
  user: User | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true)
      const user = await localSignIn(email, password)
      setUser(user)
      return user
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await localSignOut()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    userProfile: user, // Same as user for localStorage implementation
    loading,
    signIn,
    signOut,
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