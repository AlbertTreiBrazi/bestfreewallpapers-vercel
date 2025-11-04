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

        console.log('Creating storage policies for live-videos bucket...');

        // First, check if policies already exist
        const checkPoliciesResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_policies`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table_name: 'objects',
                schema_name: 'storage'
            })
        });

        // Create policies using the management API pattern
        const policyRequests = [
            {
                name: 'Public Access for live-videos bucket',
                action: 'SELECT',
                table: 'objects',
                schema: 'storage',
                check: "bucket_id = 'live-videos'"
            },
            {
                name: 'Admin Insert for live-videos bucket', 
                action: 'INSERT',
                table: 'objects',
                schema: 'storage',
                check: "bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true)"
            },
            {
                name: 'Admin Update for live-videos bucket',
                action: 'UPDATE', 
                table: 'objects',
                schema: 'storage',
                check: "bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true)"
            },
            {
                name: 'Admin Delete for live-videos bucket',
                action: 'DELETE',
                table: 'objects', 
                schema: 'storage',
                check: "bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true)"
            }
        ];

        const results = [];
        
        for (const policy of policyRequests) {
            console.log(`Creating policy: ${policy.name}`);
            
            try {
                // Try to create policy using Supabase management endpoint
                const response = await fetch(`${supabaseUrl}/auth/v1/policies`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: policy.name,
                        table: policy.table,
                        schema: policy.schema,
                        action: policy.action,
                        check: policy.check
                    })
                });

                const result = await response.text();
                console.log(`Policy creation result for ${policy.name}:`, result);
                
                results.push({
                    policy: policy.name,
                    success: response.ok,
                    status: response.status,
                    result: result
                });
            } catch (error) {
                console.error(`Error creating policy ${policy.name}:`, error);
                results.push({
                    policy: policy.name,
                    success: false,
                    error: error.message
                });
            }
        }

        // Alternative approach: Use direct SQL via database connection
        console.log('Attempting alternative SQL approach...');
        
        const sqlPolicies = [
            `CREATE POLICY IF NOT EXISTS "Public Access for live-videos bucket" ON storage.objects FOR SELECT USING (bucket_id = 'live-videos');`,
            `CREATE POLICY IF NOT EXISTS "Admin Insert for live-videos bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true));`,
            `CREATE POLICY IF NOT EXISTS "Admin Update for live-videos bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true));`,
            `CREATE POLICY IF NOT EXISTS "Admin Delete for live-videos bucket" ON storage.objects FOR DELETE USING (bucket_id = 'live-videos' AND auth.uid() IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true));`
        ];

        for (let i = 0; i < sqlPolicies.length; i++) {
            try {
                const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sql: sqlPolicies[i]
                    })
                });

                const sqlResult = await sqlResponse.text();
                console.log(`SQL policy ${i + 1} result:`, sqlResult);
                
                results.push({
                    policy: `sql_policy_${i + 1}`,
                    success: sqlResponse.ok,
                    result: sqlResult
                });
            } catch (error) {
                console.error(`SQL policy ${i + 1} error:`, error);
                results.push({
                    policy: `sql_policy_${i + 1}`,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log('Policy setup completed, results:', results);

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                policy_attempts: results,
                status: 'setup_attempted',
                message: 'Check individual policy results for success/failure status'
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
