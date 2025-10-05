// Alternative: Create users via Supabase API
// Run this in Node.js or browser console with Supabase client

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your-supabase-url'
const supabaseServiceKey = 'your-service-role-key' // Service role key (not anon key)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUsers() {
  const testUsers = [
    { email: 'alice@example.com', fullName: 'Alice Smith' },
    { email: 'bob@example.com', fullName: 'Bob Johnson' },
    { email: 'charlie@example.com', fullName: 'Charlie Brown' },
    { email: 'diana@example.com', fullName: 'Diana Prince' }
  ]

  for (const user of testUsers) {
    try {
      // Insert directly into profiles table using service role
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: user.email,
          full_name: user.fullName,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error(`Error creating ${user.email}:`, error)
      } else {
        console.log(`✅ Created user: ${user.email}`)
      }
    } catch (err) {
      console.error(`Failed to create ${user.email}:`, err)
    }
  }
}

// Run the function
createTestUsers()