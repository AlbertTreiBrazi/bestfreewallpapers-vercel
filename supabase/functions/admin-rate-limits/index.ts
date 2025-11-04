Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!serviceRoleKey || !supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify admin authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Try auth verification with anon key first
        let userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
            }
        });
        
        // If anon key fails, try service role key
        if (!userResponse.ok) {
            userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });
        }

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
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
        const profile = profiles[0];

        if (!profile || !profile.is_admin) {
            throw new Error('Admin access required');
        }

        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'list';

        if (req.method === 'GET' && action === 'list') {
            // Get all rate limit configurations
            const configResponse = await fetch(`${supabaseUrl}/rest/v1/rate_limit_config?select=*&order=setting_name`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!configResponse.ok) {
                throw new Error('Failed to fetch rate limit configurations');
            }

            const configs = await configResponse.json();

            return new Response(JSON.stringify({
                data: configs
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'PUT') {
            // Update rate limit configuration
            const { setting_name, setting_value, description, is_active } = await req.json();

            if (!setting_name || setting_value === undefined) {
                throw new Error('Setting name and value are required');
            }

            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/rate_limit_config?setting_name=eq.${setting_name}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    setting_value: parseInt(setting_value),
                    description: description || null,
                    is_active: is_active !== undefined ? is_active : true,
                    updated_at: new Date().toISOString()
                })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update configuration: ${errorText}`);
            }

            const updatedConfig = await updateResponse.json();

            return new Response(JSON.stringify({
                data: updatedConfig[0],
                message: 'Rate limit configuration updated successfully'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'POST') {
            const requestData = await req.json();
            const action = requestData.action || 'create';

            if (action === 'test') {
                // Test rate limit enforcement
                const { setting_name } = requestData;

                if (!setting_name) {
                    throw new Error('Setting name is required for testing');
                }

                // Fetch the current rate limit configuration
                const configResponse = await fetch(`${supabaseUrl}/rest/v1/rate_limit_config?setting_name=eq.${setting_name}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!configResponse.ok) {
                    throw new Error('Failed to fetch rate limit configuration');
                }

                const configs = await configResponse.json();
                const config = configs[0];

                if (!config) {
                    throw new Error(`Rate limit configuration '${setting_name}' not found`);
                }

                if (!config.is_active) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: `Rate limit '${setting_name}' is inactive and not being enforced`,
                        config: {
                            setting_name: config.setting_name,
                            setting_value: config.setting_value,
                            is_active: config.is_active
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Simulate checking recent downloads against the limit
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                
                // Check actual download activity in the last hour for this user
                const downloadsResponse = await fetch(`${supabaseUrl}/rest/v1/downloads?user_id=eq.${userId}&created_at=gte.${oneHourAgo}&select=count`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Accept': 'application/vnd.pgrst.object+json',
                        'Prefer': 'count=exact'
                    }
                });

                let currentUsage = 0;
                if (downloadsResponse.ok) {
                    const countHeader = downloadsResponse.headers.get('content-range');
                    if (countHeader) {
                        const match = countHeader.match(/\/(\d+)$/);
                        if (match) {
                            currentUsage = parseInt(match[1]);
                        }
                    }
                }

                const limit = config.setting_value;
                const isEnforced = limit !== -1; // -1 means unlimited
                const isWithinLimit = !isEnforced || currentUsage < limit;

                // Log the test action
                const auditLogResponse = await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        admin_user_id: userId,
                        action: 'rate_limit_test',
                        resource_type: 'rate_limit_config',
                        resource_id: config.id.toString(),
                        details: {
                            setting_name: setting_name,
                            current_usage: currentUsage,
                            limit: limit,
                            is_within_limit: isWithinLimit,
                            test_timestamp: new Date().toISOString()
                        }
                    })
                });

                return new Response(JSON.stringify({
                    success: true,
                    message: `Rate limit '${setting_name}' test completed successfully`,
                    test_results: {
                        setting_name: config.setting_name,
                        current_limit: limit === -1 ? 'Unlimited' : `${limit} per hour`,
                        is_active: config.is_active,
                        is_enforced: isEnforced,
                        current_usage: currentUsage,
                        is_within_limit: isWithinLimit,
                        enforcement_status: isEnforced ? 
                            (isWithinLimit ? 'ACTIVE - Within limit' : 'ACTIVE - Would block') : 
                            'DISABLED - Unlimited access',
                        test_timestamp: new Date().toISOString()
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } else {
                // Create new rate limit configuration
                const { setting_name, setting_value, description, is_active } = requestData;

                if (!setting_name || setting_value === undefined) {
                    throw new Error('Setting name and value are required');
                }

                const createResponse = await fetch(`${supabaseUrl}/rest/v1/rate_limit_config`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        setting_name: setting_name,
                        setting_value: parseInt(setting_value),
                        description: description || null,
                        is_active: is_active !== undefined ? is_active : true
                    })
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`Failed to create configuration: ${errorText}`);
                }

                const newConfig = await createResponse.json();

                return new Response(JSON.stringify({
                    data: newConfig[0],
                    message: 'Rate limit configuration created successfully'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else {
            throw new Error('Method not allowed');
        }

    } catch (error) {
        console.error('Admin rate limits error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_RATE_LIMITS_FAILED',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Admin access required') ? 403 :
                          error.message.includes('Authentication required') || 
                          error.message.includes('Invalid authentication') ? 401 :
                          error.message.includes('Method not allowed') ? 405 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});