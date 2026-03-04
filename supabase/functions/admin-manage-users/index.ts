import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    // Verify the caller is an admin
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader! } },
    })
    const { data: { user: caller } } = await anonClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check admin status
    const { data: isAdmin } = await anonClient.rpc('is_admin')
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { action, ...payload } = await req.json()

    if (action === 'create') {
      const { email, password, full_name, company_name, mobile_number, location, account_type, user_type, status: userStatus } = payload

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Update profile with full details
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          full_name,
          email,
          company_name,
          mobile_number,
          phone: mobile_number,
          location,
          account_type: account_type || 'buyer',
          user_type: user_type || 'buyer',
          user_roles: [user_type || 'buyer'],
          registration_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', newUser.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
      }

      // If status is inactive, ban the user
      if (userStatus === 'inactive') {
        await adminClient.auth.admin.updateUserById(newUser.user.id, { ban_duration: '876000h' })
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'deactivate') {
      const { user_id } = payload
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      // Mark profile
      await adminClient.from('profiles').update({ registration_complete: false, updated_at: new Date().toISOString() }).eq('user_id', user_id)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'activate') {
      const { user_id } = payload
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      await adminClient.from('profiles').update({ registration_complete: true, updated_at: new Date().toISOString() }).eq('user_id', user_id)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete') {
      const { user_id } = payload
      const { error } = await adminClient.auth.admin.deleteUser(user_id)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
