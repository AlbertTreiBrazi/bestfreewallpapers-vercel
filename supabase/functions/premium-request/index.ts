Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        let userId = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id;
                console.log('User authenticated:', userId);
            } else {
                throw new Error('Authentication required');
            }
        }

        if (!userId) {
            throw new Error('Authentication required');
        }

        if (req.method === 'POST') {
            // Create new premium request
            const { email, full_name, plan_type, duration_months, payment_method, amount_paid, payment_proof_url } = await req.json();

            const requestData = {
                user_id: userId,
                email: email || '',
                full_name: full_name || '',
                plan_type: plan_type || 'premium',
                duration_months: duration_months || 1,
                payment_method: payment_method || '',
                amount_paid: amount_paid || 0,
                payment_proof_url: payment_proof_url || null,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const response = await fetch(`${supabaseUrl}/rest/v1/premium_membership_requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create premium request: ${errorText}`);
            }

            const data = await response.json();

            return new Response(JSON.stringify({
                data: data[0],
                message: 'Premium request submitted successfully. You will be notified once processed.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'GET') {
            // Get user's premium requests
            const response = await fetch(`${supabaseUrl}/rest/v1/premium_membership_requests?user_id=eq.${userId}&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch premium requests');
            }

            const data = await response.json();

            return new Response(JSON.stringify({ data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Premium request error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'PREMIUM_REQUEST_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});