import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  fontSize: number
  fontFamily: string
  color: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
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

// Auth Helper Functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const getAllCardDesigns = async () => {
  const { data, error } = await supabase
    .from('card_designs')
    .select(`
      *,
      users (
        id,
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  const { data, error } = await supabase
    .from('users')
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
    .from('users')
    .delete()
    .eq('id', userId)

  if (profileError) throw profileError
}

// Export the User type as UserProfile for compatibility
export type UserProfile = User