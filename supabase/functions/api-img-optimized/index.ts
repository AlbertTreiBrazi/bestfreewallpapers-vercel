Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const wallpaperId = pathParts[pathParts.length - 1];

        // Parse query parameters
        const type = url.searchParams.get('type') || 'preview'; // thumbnail, preview, or original
        const width = url.searchParams.get('w') || url.searchParams.get('width');
        const height = url.searchParams.get('h') || url.searchParams.get('height');
        const quality = url.searchParams.get('q') || url.searchParams.get('quality') || '80';
        const format = url.searchParams.get('f') || url.searchParams.get('format') || 'auto';

        if (!wallpaperId || isNaN(Number(wallpaperId))) {
            throw new Error('Invalid wallpaper ID');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get wallpaper data with category info for organized paths
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}&select=*,categories(slug)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!wallpaperResponse.ok) {
            throw new Error('Wallpaper not found');
        }

        const wallpapers = await wallpaperResponse.json();
        
        if (!wallpapers || wallpapers.length === 0) {
            throw new Error('Wallpaper not found');
        }

        const wallpaper = wallpapers[0];
        
        // Determine category path for organized storage
        const categorySlug = wallpaper.categories?.slug || 'uncategorized';
        
        let bucketName;
        let filePath;
        let cacheHeaders;
        
        // Determine bucket and path based on type
        switch (type) {
            case 'thumbnail':
                bucketName = 'wallpapers-thumbnails';
                filePath = `thumbnails/${categorySlug}/${wallpaperId}.webp`;
                cacheHeaders = {
                    'Cache-Control': 'public, max-age=7776000', // 90 days
                    'ETag': `"thumb-${wallpaperId}-${width || 'auto'}-${height || 'auto'}"`,
                };
                break;
                
            case 'preview':
                bucketName = 'wallpapers-preview';
                filePath = `preview/${categorySlug}/${wallpaperId}.webp`;
                cacheHeaders = {
                    'Cache-Control': 'public, max-age=2592000', // 30 days
                    'ETag': `"preview-${wallpaperId}-${width || 'auto'}-${height || 'auto'}"`,
                };
                break;
                
            case 'original':
                // Original files require authentication
                bucketName = 'wallpapers';
                filePath = `original/${categorySlug}/${wallpaperId}.jpg`;
                cacheHeaders = {
                    'Cache-Control': 'private, no-cache',
                    'ETag': `"original-${wallpaperId}"`,
                };
                // Check for auth token for original files
                const authToken = req.headers.get('authorization');
                if (!authToken && !url.searchParams.get('auth')) {
                    throw new Error('Authentication required for original files');
                }
                break;
                
            default:
                throw new Error('Invalid type parameter. Use: thumbnail, preview, or original');
        }

        console.log(`Serving ${type} from bucket: ${bucketName}, path: ${filePath}`);

        let imageUrl;
        
        // Try to get from organized storage first
        if (type === 'original') {
            // For original files, use signed URLs
            try {
                const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucketName}/${filePath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        expiresIn: 300 // 5 minutes for original files
                    })
                });
                
                if (signedUrlResponse.ok) {
                    const signedData = await signedUrlResponse.json();
                    imageUrl = `${supabaseUrl}${signedData.signedURL}`;
                }
            } catch (signedUrlError) {
                console.warn('Signed URL generation failed:', signedUrlError);
            }
        } else {
            // For public files (thumbnails, previews), use public URLs
            imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
        }

        // Fallback to legacy URLs if organized storage isn't available
        if (!imageUrl) {
            console.log('Falling back to legacy image URLs');
            
            switch (type) {
                case 'thumbnail':
                    imageUrl = wallpaper.thumbnail_url || wallpaper.image_url;
                    break;
                case 'original':
                    imageUrl = wallpaper.download_url;
                    break;
                case 'preview':
                default:
                    imageUrl = wallpaper.image_url;
                    break;
            }
        }

        if (!imageUrl) {
            throw new Error('Image URL not found');
        }

        // Fetch the image with proper error handling and retries
        let imageResponse;
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
            try {
                imageResponse = await fetch(imageUrl, {
                    headers: {
                        'User-Agent': 'Supabase-Image-API/2.0',
                        'Accept': 'image/*,*/*',
                        'Cache-Control': 'no-cache'
                    },
                    signal: AbortSignal.timeout(15000) // 15 second timeout
                });
                
                if (imageResponse.ok) {
                    break;
                }
                
                if (imageResponse.status === 404 && attempts === 0) {
                    // Try fallback URL on first 404
                    imageUrl = wallpaper.image_url;
                    attempts++;
                    continue;
                }
                
                if (attempts >= maxAttempts - 1) {
                    throw new Error(`Failed to fetch after ${maxAttempts} attempts: ${imageResponse.status}`);
                }
                
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (fetchError) {
                attempts++;
                if (attempts >= maxAttempts) {
                    console.error(`Failed to fetch image from ${imageUrl}: ${fetchError}`);
                    throw new Error('Failed to fetch image');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Get the image data
        const imageData = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Set response headers
        const headers = {
            ...corsHeaders,
            'Content-Type': contentType,
            'Content-Length': imageData.byteLength.toString(),
            ...cacheHeaders
        };

        // Add CDN optimization headers for public content
        if (type !== 'original') {
            headers['CF-Cache-Tag'] = `wallpaper,wallpaper-${wallpaperId},${type}`;
            headers['Vary'] = 'Accept-Encoding';
        }

        return new Response(imageData, {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Image serving error:', error);

        // Return appropriate HTTP status
        let status = 404;
        if (error.message.includes('Authentication')) {
            status = 401;
        } else if (error.message.includes('Invalid')) {
            status = 400;
        }

        const errorResponse = {
            error: {
                code: 'IMAGE_SERVING_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});