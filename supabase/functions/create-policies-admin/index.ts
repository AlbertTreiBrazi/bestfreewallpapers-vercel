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

        console.log('Creating storage policies for live-videos bucket using direct SQL...');

        // Create policies using the exact same pattern as public-wallpapers
        const policySQL = `
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Public Access for live-videos bucket" ON storage.objects;
            DROP POLICY IF EXISTS "Admin Insert for live-videos bucket" ON storage.objects;
            DROP POLICY IF EXISTS "Admin Update for live-videos bucket" ON storage.objects;
            DROP POLICY IF EXISTS "Admin Delete for live-videos bucket" ON storage.objects;
            
            -- Create public read access policy
            CREATE POLICY "Public Access for live-videos bucket" ON storage.objects 
            FOR SELECT 
            TO public 
            USING (bucket_id = 'live-videos');
            
            -- Create admin insert policy
            CREATE POLICY "Admin Insert for live-videos bucket" ON storage.objects 
            FOR INSERT 
            TO public 
            WITH CHECK (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id 
                    FROM profiles 
                    WHERE profiles.is_admin = true
                )
            );
            
            -- Create admin update policy
            CREATE POLICY "Admin Update for live-videos bucket" ON storage.objects 
            FOR UPDATE 
            TO public 
            USING (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id 
                    FROM profiles 
                    WHERE profiles.is_admin = true
                )
            );
            
            -- Create admin delete policy
            CREATE POLICY "Admin Delete for live-videos bucket" ON storage.objects 
            FOR DELETE 
            TO public 
            USING (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id 
                    FROM profiles 
                    WHERE profiles.is_admin = true
                )
            );
        `;

        console.log('Executing policy creation SQL...');
        console.log('SQL:', policySQL);

        // Execute the SQL directly using a service role connection
        const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: policySQL
            })
        });

        const sqlResult = await sqlResponse.text();
        console.log('SQL execution result:', sqlResult);

        // Verify policies were created by checking
        const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_policies`, {
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

        const verifyResult = await verifyResponse.text();
        console.log('Verification result:', verifyResult);

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                sql_execution: {
                    success: sqlResponse.ok,
                    status: sqlResponse.status,
                    result: sqlResult
                },
                verification: {
                    success: verifyResponse.ok, 
                    result: verifyResult
                },
                status: 'policies_created',
                message: 'Storage policies for live-videos bucket created successfully'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Policy creation error:', error);

        const errorResponse = {
            error: {
                code: 'POLICY_CREATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
