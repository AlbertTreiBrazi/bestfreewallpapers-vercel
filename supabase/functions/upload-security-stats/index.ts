/**
 * Upload Security Statistics Edge Function
 * Provides comprehensive statistics for the upload security dashboard
 */

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Verify admin authentication
        const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
        if (!authToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Authentication required'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verify user is admin
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
            }
        });

        if (!userResponse.ok) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid authentication token'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify admin status');
        }

        const profiles = await profileResponse.json();
        const isAdmin = profiles[0]?.is_admin;

        if (!isAdmin) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Admin access required'
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const requestData = await req.json();
        const { days_back = 30 } = requestData;

        // Call the database function to get upload statistics
        const statsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_upload_statistics`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_days_back: days_back })
        });

        if (!statsResponse.ok) {
            throw new Error('Failed to fetch upload statistics');
        }

        const statistics = await statsResponse.json();

        return new Response(JSON.stringify({
            success: true,
            data: statistics
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Upload security stats error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch security statistics',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
