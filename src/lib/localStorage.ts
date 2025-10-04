// Local storage implementation instead of Supabase
export interface User {
  id: string
  email: string
  full_name?: string
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
  texts: Array<{
    id: string
    content: string
    x: number
    y: number
    fontSize: number
    fontWeight: string
    color: string
  }>
  images: Array<{
    id: string
    src: string
    x: number
    y: number
    width: number
    height: number
  }>
  created_at: string
  updated_at: string
}

// Local Storage Keys
const STORAGE_KEYS = {
  CURRENT_USER: 'card_designer_user',
  USER_DESIGNS: 'card_designer_designs',
  ALL_USERS: 'card_designer_all_users'
}

// Generate UUID
const generateId = () => {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Current User Management
export const getCurrentUser = (): User | null => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
  }
}

// Authentication Functions
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  // Simulate authentication
  const users = getAllUsersFromStorage()
  const user = users.find(u => u.email === email)
  
  if (user) {
    setCurrentUser(user)
    return user
  }
  
  // Create new user if not exists
  const newUser: User = {
    id: generateId(),
    email,
    full_name: email.split('@')[0],
    role: users.length === 0 ? 'admin' : 'user', // First user is admin
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  users.push(newUser)
  saveAllUsersToStorage(users)
  setCurrentUser(newUser)
  
  return newUser
}

export const signOut = async () => {
  setCurrentUser(null)
}

// User Management
const getAllUsersFromStorage = (): User[] => {
  try {
    const users = localStorage.getItem(STORAGE_KEYS.ALL_USERS)
    return users ? JSON.parse(users) : []
  } catch {
    return []
  }
}

const saveAllUsersToStorage = (users: User[]) => {
  localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users))
}

export const getAllUsers = async (): Promise<User[]> => {
  return getAllUsersFromStorage()
}

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  const users = getAllUsersFromStorage()
  const userIndex = users.findIndex(u => u.id === userId)
  
  if (userIndex !== -1) {
    users[userIndex].role = role
    users[userIndex].updated_at = new Date().toISOString()
    saveAllUsersToStorage(users)
  }
}

export const deleteUser = async (userId: string) => {
  const users = getAllUsersFromStorage()
  const filteredUsers = users.filter(u => u.id !== userId)
  saveAllUsersToStorage(filteredUsers)
  
  // Also delete user's designs
  const designs = getUserCardDesignsFromStorage()
  const filteredDesigns = designs.filter(d => d.user_id !== userId)
  saveUserCardDesignsToStorage(filteredDesigns)
}

// Card Design Management
const getUserCardDesignsFromStorage = (): CardDesign[] => {
  try {
    const designs = localStorage.getItem(STORAGE_KEYS.USER_DESIGNS)
    return designs ? JSON.parse(designs) : []
  } catch {
    return []
  }
}

const saveUserCardDesignsToStorage = (designs: CardDesign[]) => {
  localStorage.setItem(STORAGE_KEYS.USER_DESIGNS, JSON.stringify(designs))
}

export const getUserCardDesigns = async (userId: string): Promise<CardDesign[]> => {
  const designs = getUserCardDesignsFromStorage()
  return designs.filter(d => d.user_id === userId)
}

export const getAllCardDesigns = async (): Promise<CardDesign[]> => {
  return getUserCardDesignsFromStorage()
}

export const saveCardDesign = async (design: Omit<CardDesign, 'id' | 'created_at' | 'updated_at'>): Promise<CardDesign> => {
  const designs = getUserCardDesignsFromStorage()
  
  const newDesign: CardDesign = {
    ...design,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  designs.push(newDesign)
  saveUserCardDesignsToStorage(designs)
  
  return newDesign
}

export const updateCardDesign = async (id: string, updates: Partial<CardDesign>): Promise<CardDesign> => {
  const designs = getUserCardDesignsFromStorage()
  const designIndex = designs.findIndex(d => d.id === id)
  
  if (designIndex === -1) {
    throw new Error('Design not found')
  }
  
  designs[designIndex] = {
    ...designs[designIndex],
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  saveUserCardDesignsToStorage(designs)
  return designs[designIndex]
}

export const deleteCardDesign = async (id: string) => {
  const designs = getUserCardDesignsFromStorage()
  const filteredDesigns = designs.filter(d => d.id !== id)
  saveUserCardDesignsToStorage(filteredDesigns)
}

export const getCardDesignById = async (id: string): Promise<CardDesign | null> => {
  const designs = getUserCardDesignsFromStorage()
  return designs.find(d => d.id === id) || null
}

// Export types for compatibility
export type UserProfile = User
