import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteAdminRequest {
  email: string
  role: string
  permissions: Record<string, boolean>
  full_name?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the requesting user is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can invite other admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is specifically a super_admin
    if (profile.admin_role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can invite other admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, role, permissions, full_name }: InviteAdminRequest = await req.json()

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for admin operations
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Check if user with this email already exists
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (checkError) {
      console.error('Error checking existing users:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists, just update their profile to make them admin
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_admin: true,
          admin_role: role,
          admin_permissions: permissions,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user profile to admin' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log the action
      await supabaseAdmin.from('admin_actions_log').insert({
        admin_user_id: user.id,
        action_type: 'admin_promoted',
        target_user_id: existingUser.id,
        details: { email, role, permissions },
        created_at: new Date().toISOString()
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Existing user promoted to admin',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: role,
            status: 'promoted'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // User doesn't exist, create a new admin account
    // Generate a temporary password
    const tempPassword = crypto.randomUUID()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || '',
        invited_by: user.id,
        invited_as: role
      }
    })

    if (createError || !newUser) {
      console.error('Error creating new user:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create new admin user', details: createError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin profile
    const { data: newProfile, error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        email: email,
        full_name: full_name || '',
        is_admin: true,
        admin_role: role,
        admin_permissions: permissions,
        plan_type: 'free',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError)
      // Clean up the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send password reset email so they can set their own password
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || supabaseUrl}/reset-password`
    })

    if (resetError) {
      console.error('Error sending password reset email:', resetError)
    }

    // Log the action
    await supabaseAdmin.from('admin_actions_log').insert({
      admin_user_id: user.id,
      action_type: 'admin_invited',
      target_user_id: newUser.user.id,
      details: { email, role, permissions },
      created_at: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin invited successfully. Password reset email sent.',
        user: {
          id: newUser.user.id,
          email: email,
          role: role,
          status: 'invited'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in invite-admin function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
