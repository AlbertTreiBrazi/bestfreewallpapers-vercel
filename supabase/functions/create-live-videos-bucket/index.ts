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

        console.log('Creating live-videos bucket...');

        // Create the live-videos bucket
        const createBucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: 'live-videos',
                name: 'live-videos',
                public: true,
                file_size_limit: 104857600, // 100MB
                allowed_mime_types: ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime']
            })
        });

        if (!createBucketResponse.ok) {
            const errorText = await createBucketResponse.text();
            console.log('Bucket creation response:', errorText);
            if (errorText.includes('already exists')) {
                console.log('Bucket already exists, continuing with policy setup...');
            } else {
                throw new Error(`Failed to create bucket: ${errorText}`);
            }
        } else {
            console.log('Bucket created successfully');
        }

        // Create RLS policies for the bucket
        console.log('Setting up bucket policies...');

        // Policy 1: Allow public access to read objects
        const publicReadPolicy = {
            name: 'live-videos-public-read',
            bucket_id: 'live-videos',
            definition: 'SELECT',
            check: 'true'
        };

        const publicReadResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos/policy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(publicReadPolicy)
        });

        if (!publicReadResponse.ok) {
            const errorText = await publicReadResponse.text();
            console.log('Public read policy response:', errorText);
        }

        // Policy 2: Allow admin users to upload
        const adminUploadPolicy = {
            name: 'live-videos-admin-upload',
            bucket_id: 'live-videos',
            definition: 'INSERT',
            check: '(auth.jwt()->>\'role\')::text = \'authenticated\' AND (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true'
        };

        const adminUploadResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos/policy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminUploadPolicy)
        });

        if (!adminUploadResponse.ok) {
            const errorText = await adminUploadResponse.text();
            console.log('Admin upload policy response:', errorText);
        }

        // Policy 3: Allow admin users to update/delete
        const adminManagePolicy = {
            name: 'live-videos-admin-manage',
            bucket_id: 'live-videos',
            definition: 'UPDATE, DELETE',
            check: '(auth.jwt()->>\'role\')::text = \'authenticated\' AND (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true'
        };

        const adminManageResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/live-videos/policy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminManagePolicy)
        });

        if (!adminManageResponse.ok) {
            const errorText = await adminManageResponse.text();
            console.log('Admin manage policy response:', errorText);
        }

        console.log('Bucket and policies setup completed');

        return new Response(JSON.stringify({
            data: {
                bucket: 'live-videos',
                status: 'created',
                policies: ['public-read', 'admin-upload', 'admin-manage']
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bucket creation error:', error);

        const errorResponse = {
            error: {
                code: 'BUCKET_CREATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
