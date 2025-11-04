Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

        // List all storage buckets
        const bucketsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!bucketsResponse.ok) {
            throw new Error(`Failed to list buckets: ${bucketsResponse.status}`);
        }

        const buckets = await bucketsResponse.json();
        
        // Get storage statistics for each bucket
        const bucketStats = [];
        
        for (const bucket of buckets) {
            try {
                // List files in each bucket
                const filesResponse = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucket.name}?limit=100`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Accept': 'application/json'
                    }
                });

                if (filesResponse.ok) {
                    const files = await filesResponse.json();
                    const fileCount = files.length;
                    const totalSize = files.reduce((sum: number, file: any) => sum + (file.metadata?.size || 0), 0);
                    
                    bucketStats.push({
                        name: bucket.name,
                        id: bucket.id,
                        public: bucket.public,
                        file_count: fileCount,
                        total_size: totalSize,
                        created_at: bucket.created_at,
                        updated_at: bucket.updated_at,
                        sample_files: files.slice(0, 5).map((f: any) => ({ name: f.name, size: f.metadata?.size }))
                    });
                } else {
                    bucketStats.push({
                        name: bucket.name,
                        id: bucket.id,
                        public: bucket.public,
                        file_count: 0,
                        total_size: 0,
                        error: `Failed to list files: ${filesResponse.status}`,
                        created_at: bucket.created_at,
                        updated_at: bucket.updated_at
                    });
                }
            } catch (error) {
                bucketStats.push({
                    name: bucket.name,
                    id: bucket.id,
                    public: bucket.public,
                    error: error.message,
                    created_at: bucket.created_at,
                    updated_at: bucket.updated_at
                });
            }
        }

        // Get database statistics
        const dbStatsResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?select=migrated_to_storage,original_file_path,preview_file_path&limit=1000`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        let dbStats = { total: 0, migrated: 0, not_migrated: 0 };
        
        if (dbStatsResponse.ok) {
            const wallpapers = await dbStatsResponse.json();
            dbStats.total = wallpapers.length;
            dbStats.migrated = wallpapers.filter((w: any) => w.migrated_to_storage === true).length;
            dbStats.not_migrated = wallpapers.filter((w: any) => w.migrated_to_storage !== true).length;
        }

        return new Response(JSON.stringify({
            data: {
                buckets: bucketStats,
                bucket_count: buckets.length,
                database_stats: dbStats,
                audit_timestamp: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Storage audit error:', error);
        return new Response(JSON.stringify({
            error: 'Storage audit failed',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});