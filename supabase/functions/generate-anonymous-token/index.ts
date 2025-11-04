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
        const { wallpaperId } = await req.json();

        if (!wallpaperId) {
            throw new Error('Wallpaper ID is required');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        const supabaseHeaders = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        };

        // Verify wallpaper exists and is available for anonymous download
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}&select=id,is_premium,is_published,is_active,download_url,image_url`, {
            headers: supabaseHeaders
        });

        if (!wallpaperResponse.ok) {
            throw new Error('Wallpaper not found');
        }

        const wallpapers = await wallpaperResponse.json();
        
        if (!wallpapers || wallpapers.length === 0) {
            throw new Error('Wallpaper not found');
        }

        const wallpaper = wallpapers[0];

        // Check if wallpaper is available for anonymous download
        if (!wallpaper.is_published || !wallpaper.is_active) {
            throw new Error('Wallpaper is not available');
        }

        // CRITICAL FIX: Create proper download session in database (same as authenticated users)
        const downloadToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
        const actualDownloadUrl = wallpaper.download_url || wallpaper.image_url;

        // Create session record in download_sessions table
        const downloadSession = {
            token: downloadToken,
            wallpaper_id: wallpaper.id,
            user_id: null, // NULL for guest users
            resolution: '1080p', // Default resolution for guests
            download_url: actualDownloadUrl,
            expires_at: expiresAt.toISOString(),
            is_premium_user: false,
            ip_address: clientIp,
            user_agent: req.headers.get('user-agent') || 'unknown',
            created_at: new Date().toISOString(),
            is_external_url: false,
            target_url: null
        };

        const sessionResponse = await fetch(
            `${supabaseUrl}/rest/v1/download_sessions`,
            {
                method: 'POST',
                headers: {
                    ...supabaseHeaders,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(downloadSession)
            }
        );

        if (!sessionResponse.ok) {
            const errorText = await sessionResponse.text();
            console.error('Failed to create download session:', errorText);
            throw new Error('Failed to create download session');
        }

        console.log('Created anonymous download session for wallpaper:', wallpaperId, 'with user_id = null');

        return new Response(JSON.stringify({
            data: {
                token: downloadToken,
                wallpaperId: wallpaperId,
                expiresAt: expiresAt.toISOString(),
                isAnonymous: true
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error) {
        console.error('Anonymous token generation error:', error);

        const errorResponse = {
            error: {
                code: 'TOKEN_GENERATION_FAILED',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Premium wallpapers require') ? 403 :
                          error.message.includes('not found') ? 404 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});