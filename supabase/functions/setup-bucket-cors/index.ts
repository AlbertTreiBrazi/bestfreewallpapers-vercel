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

        console.log('Setting up CORS configuration for live-videos bucket...');

        // Update bucket configuration to ensure proper settings
        const updateBucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public: true,
                file_size_limit: 104857600, // 100MB
                allowed_mime_types: ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime']
            })
        });

        const updateResult = await updateBucketResponse.text();
        console.log('Bucket update result:', updateResult);

        // Check current bucket status
        const bucketInfoResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            }
        });

        const bucketInfo = await bucketInfoResponse.text();
        console.log('Current bucket info:', bucketInfo);

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                bucket_update: {
                    success: updateBucketResponse.ok,
                    status: updateBucketResponse.status,
                    result: updateResult
                },
                bucket_info: {
                    success: bucketInfoResponse.ok,
                    info: bucketInfo
                },
                status: 'bucket_configured',
                message: 'live-videos bucket configuration updated'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bucket configuration error:', error);

        const errorResponse = {
            error: {
                code: 'BUCKET_CONFIG_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
