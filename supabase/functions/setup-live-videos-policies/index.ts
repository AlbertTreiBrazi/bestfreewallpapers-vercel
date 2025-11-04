Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

        console.log('Setting up live-videos storage policies...');

        // Policy definitions
        const policies = [
            {
                name: 'live_videos_public_read',
                bucket_id: 'live-videos',
                operation: 'SELECT',
                check: 'bucket_id = \'live-videos\''
            },
            {
                name: 'live_videos_admin_insert',
                bucket_id: 'live-videos', 
                operation: 'INSERT',
                check: 'bucket_id = \'live-videos\' AND auth.role() = \'authenticated\' AND (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true'
            },
            {
                name: 'live_videos_admin_update',
                bucket_id: 'live-videos',
                operation: 'UPDATE', 
                check: 'bucket_id = \'live-videos\' AND auth.role() = \'authenticated\' AND (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true'
            },
            {
                name: 'live_videos_admin_delete',
                bucket_id: 'live-videos',
                operation: 'DELETE',
                check: 'bucket_id = \'live-videos\' AND auth.role() = \'authenticated\' AND (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true'
            }
        ];

        const results = [];
        
        // Create each policy using Supabase Management API
        for (const policy of policies) {
            console.log(`Creating policy: ${policy.name}`);
            
            const policyData = {
                name: policy.name,
                definition: policy.operation,
                check: policy.check
            };
            
            if (policy.operation !== 'SELECT') {
                policyData.check = policy.check; // Use check for INSERT/UPDATE/DELETE
            } else {
                policyData.using = policy.check; // Use using for SELECT
            }

            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_storage_policy`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bucket_name: policy.bucket_id,
                        policy_name: policy.name,
                        definition: policy.operation,
                        check_expression: policy.check
                    })
                });

                const result = await response.text();
                console.log(`Policy ${policy.name} result:`, result);
                results.push({ policy: policy.name, success: response.ok, result });
            } catch (error) {
                console.error(`Failed to create policy ${policy.name}:`, error);
                results.push({ policy: policy.name, success: false, error: error.message });
            }
        }

        // Also set up CORS for the bucket
        console.log('Setting up CORS for live-videos bucket...');
        
        try {
            const corsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos/cors`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    allowedOrigins: ['*'],
                    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
                    allowedHeaders: ['*'],
                    maxAgeSeconds: 3600
                })
            });

            const corsResult = await corsResponse.text();
            console.log('CORS setup result:', corsResult);
            results.push({ 
                policy: 'cors_configuration', 
                success: corsResponse.ok, 
                result: corsResult 
            });
        } catch (error) {
            console.error('Failed to setup CORS:', error);
            results.push({ 
                policy: 'cors_configuration', 
                success: false, 
                error: error.message 
            });
        }

        console.log('Policy setup completed');

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                policies_created: results,
                status: 'setup_completed'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Policy setup error:', error);

        const errorResponse = {
            error: {
                code: 'POLICY_SETUP_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
