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

        console.log('Setting up live-videos storage policies via direct SQL...');

        // SQL statements to create storage policies
        const sqlStatements = [
            // Enable RLS if not already enabled
            `DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects' AND rowsecurity = true) THEN
                    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
                END IF;
            END $$;`,
            
            // Drop existing policies to avoid conflicts
            `DROP POLICY IF EXISTS "Public Access for live-videos bucket" ON storage.objects;`,
            `DROP POLICY IF EXISTS "Admin Insert for live-videos bucket" ON storage.objects;`,
            `DROP POLICY IF EXISTS "Admin Update for live-videos bucket" ON storage.objects;`,
            `DROP POLICY IF EXISTS "Admin Delete for live-videos bucket" ON storage.objects;`,
            
            // Create public read access policy (following existing pattern)
            `CREATE POLICY "Public Access for live-videos bucket" ON storage.objects
            FOR SELECT USING (bucket_id = 'live-videos');`,
            
            // Create admin insert policy (following existing pattern)
            `CREATE POLICY "Admin Insert for live-videos bucket" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true
                )
            );`,
            
            // Create admin update policy (following existing pattern) 
            `CREATE POLICY "Admin Update for live-videos bucket" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true
                )
            );`,
            
            // Create admin delete policy (following existing pattern)
            `CREATE POLICY "Admin Delete for live-videos bucket" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'live-videos' AND 
                auth.uid() IN (
                    SELECT profiles.user_id FROM profiles WHERE profiles.is_admin = true
                )
            );`
        ];

        const results = [];
        
        // Execute each SQL statement
        for (let i = 0; i < sqlStatements.length; i++) {
            const sql = sqlStatements[i];
            console.log(`Executing SQL statement ${i + 1}...`);
            
            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sql_query: sql })
                });

                const result = await response.text();
                console.log(`SQL ${i + 1} result:`, result);
                results.push({ 
                    statement: i + 1, 
                    success: response.ok, 
                    result: response.ok ? 'success' : result 
                });
            } catch (error) {
                console.error(`Failed to execute SQL ${i + 1}:`, error);
                results.push({ 
                    statement: i + 1, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        console.log('Storage policies setup completed');

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                sql_results: results,
                status: 'policies_setup_attempted',
                note: 'Check logs for detailed results'
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
