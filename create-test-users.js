// Script to create test users via Supabase Auth
// Run this in browser console or Node.js

const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'

// Test users to create
const testUsers = [
  {
    email: 'testuser1@example.com',
    password: 'testpass123',
    fullName: 'Test User 1'
  },
  {
    email: 'testuser2@example.com', 
    password: 'testpass123',
    fullName: 'Test User 2'
  },
  {
    email: 'testuser3@example.com',
    password: 'testpass123', 
    fullName: 'Test User 3'
  },
  {
    email: 'alice@example.com',
    password: 'testpass123',
    fullName: 'Alice Smith'
  },
  {
    email: 'bob@example.com',
    password: 'testpass123', 
    fullName: 'Bob Johnson'
  }
]

// Function to create users
async function createTestUsers() {
  const { createClient } = supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  for (const user of testUsers) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName
          }
        }
      })
      
      if (error) {
        console.error(`Error creating ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created user: ${user.email}`)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (err) {
      console.error(`Failed to create ${user.email}:`, err)
    }
  }
  
  console.log('🎉 Test user creation completed!')
}

// Uncomment to run:
// createTestUsers()

console.log('Test users script loaded. Call createTestUsers() to run.')