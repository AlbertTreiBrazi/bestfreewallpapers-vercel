Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const method = req.method;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        if (method === 'GET') {
            // Get user profile
            const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!profileResponse.ok) {
                throw new Error('Failed to get user profile');
            }

            const profiles = await profileResponse.json();
            let profile = profiles[0];

            // If profile doesn't exist, create one
            if (!profile) {
                const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        email: userData.email,
                        full_name: userData.user_metadata?.full_name || '',
                        plan_type: 'free',
                        is_admin: false
                    })
                });

                if (!createProfileResponse.ok) {
                    throw new Error('Failed to create user profile');
                }

                const newProfiles = await createProfileResponse.json();
                profile = newProfiles[0];
            }

            // Calculate premium status
            const isPremiumActive = (profile.subscription_tier === 'premium' && 
                                   profile.subscription_status === 'active') ||
                                   (profile.plan_type === 'premium' && 
                                   (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date()));

            // Determine consistent admin role display
            let roleDisplay = 'Free';
            if (profile.is_admin) {
                if (profile.admin_role === 'super_admin') {
                    roleDisplay = 'Super Admin';
                } else if (profile.admin_role === 'admin') {
                    roleDisplay = 'Admin';
                } else {
                    roleDisplay = 'Admin'; // Default for is_admin=true without specific role
                }
                
                // If admin, also show premium status
                if (isPremiumActive) {
                    roleDisplay += '/Premium';
                }
            } else if (isPremiumActive) {
                roleDisplay = 'Premium';
            }

            return new Response(JSON.stringify({
                data: {
                    ...profile,
                    email: userData.email,
                    is_premium_active: isPremiumActive,
                    role_display: roleDisplay,
                    is_admin_user: profile.is_admin,
                    admin_level: profile.admin_role || (profile.is_admin ? 'admin' : null)
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (method === 'PATCH' || method === 'PUT') {
            // Update user profile
            const { full_name } = await req.json();

            const updateData = {
                full_name: full_name,
                updated_at: new Date().toISOString()
            };

            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfiles = await updateResponse.json();
            const updatedProfile = updatedProfiles[0];

            return new Response(JSON.stringify({
                data: {
                    ...updatedProfile,
                    email: userData.email
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error('Method not allowed');
        }

    } catch (error) {
        console.error('User profile error:', error);

        const errorResponse = {
            error: {
                code: 'PROFILE_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});