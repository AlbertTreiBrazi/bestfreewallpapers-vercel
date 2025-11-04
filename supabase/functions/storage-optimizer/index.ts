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

        const requestData = await req.json();
        const { action = 'create_optimized_buckets' } = requestData;

        if (action === 'create_optimized_buckets') {
            // Define optimized bucket configuration
            const buckets = [
                {
                    name: 'wallpapers-thumbnails',
                    public: true,
                    file_size_limit: 1048576, // 1MB
                    allowed_mime_types: ['image/webp', 'image/jpeg', 'image/png']
                },
                {
                    name: 'wallpapers-preview', 
                    public: true,
                    file_size_limit: 10485760, // 10MB
                    allowed_mime_types: ['image/webp', 'image/jpeg', 'image/png']
                },
                {
                    name: 'wallpapers-original',
                    public: false,
                    file_size_limit: 52428800, // 50MB (reduced from 100MB)
                    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']
                }
            ];

            const results = [];

            for (const bucketConfig of buckets) {
                try {
                    // Check if bucket exists
                    const checkResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketConfig.name}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });

                    if (checkResponse.ok) {
                        // Bucket exists, update its configuration
                        const updateResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketConfig.name}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                public: bucketConfig.public,
                                file_size_limit: bucketConfig.file_size_limit,
                                allowed_mime_types: bucketConfig.allowed_mime_types
                            })
                        });

                        if (updateResponse.ok) {
                            results.push({
                                bucket: bucketConfig.name,
                                action: 'updated',
                                status: 'success'
                            });
                        } else {
                            const error = await updateResponse.text();
                            results.push({
                                bucket: bucketConfig.name,
                                action: 'update_failed',
                                status: 'error',
                                error: error
                            });
                        }
                    } else {
                        // Bucket doesn't exist, create it
                        const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: bucketConfig.name,
                                public: bucketConfig.public,
                                file_size_limit: bucketConfig.file_size_limit,
                                allowed_mime_types: bucketConfig.allowed_mime_types
                            })
                        });

                        if (createResponse.ok) {
                            results.push({
                                bucket: bucketConfig.name,
                                action: 'created',
                                status: 'success'
                            });
                        } else {
                            const error = await createResponse.text();
                            results.push({
                                bucket: bucketConfig.name,
                                action: 'create_failed',
                                status: 'error',
                                error: error
                            });
                        }
                    }
                } catch (error) {
                    results.push({
                        bucket: bucketConfig.name,
                        action: 'error',
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // CORS configuration is handled automatically for public buckets
            const corsResults = [
                { bucket: 'wallpapers-thumbnails', cors_status: 'auto_configured', cors_error: null },
                { bucket: 'wallpapers-preview', cors_status: 'auto_configured', cors_error: null }
            ];

            return new Response(JSON.stringify({
                data: {
                    bucket_results: results,
                    cors_results: corsResults,
                    optimized_structure: {
                        'wallpapers-thumbnails': 'Small thumbnails for cards/listings (public, 90-day cache)',
                        'wallpapers-preview': 'Watermarked preview images for browsing (public, 30-day cache)',
                        'wallpapers-original': 'Full-resolution downloadable images (private, authenticated access)'
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Clean up unused buckets
        if (action === 'cleanup_unused_buckets') {
            const bucketsToRemove = [
                'portfolio-images', 'blog-media', 'general-media', 'branding',
                'content-images', 'media-uploads', 'branding-images', 'mirela-photography-images',
                'mirela-images', 'premium-files', 'premium-wallpapers-secure', 'premium-wallpapers',
                'public-wallpapers', 'wallpapers', 'original', 'preview'
            ];

            const cleanupResults = [];

            for (const bucketName of bucketsToRemove) {
                try {
                    // First check if bucket has any files
                    const filesResponse = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucketName}?limit=1`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });

                    if (filesResponse.ok) {
                        const files = await filesResponse.json();
                        if (files.length > 0) {
                            cleanupResults.push({
                                bucket: bucketName,
                                action: 'skip',
                                reason: 'contains_files',
                                file_count: files.length
                            });
                            continue;
                        }
                    }

                    // Delete empty bucket
                    const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });

                    if (deleteResponse.ok) {
                        cleanupResults.push({
                            bucket: bucketName,
                            action: 'deleted',
                            status: 'success'
                        });
                    } else {
                        const error = await deleteResponse.text();
                        cleanupResults.push({
                            bucket: bucketName,
                            action: 'delete_failed',
                            error: error
                        });
                    }
                } catch (error) {
                    cleanupResults.push({
                        bucket: bucketName,
                        action: 'error',
                        error: error.message
                    });
                }
            }

            return new Response(JSON.stringify({
                data: {
                    cleanup_results: cleanupResults
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            error: 'Invalid action',
            available_actions: ['create_optimized_buckets', 'cleanup_unused_buckets']
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Storage optimization error:', error);
        return new Response(JSON.stringify({
            error: 'Storage optimization failed',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});