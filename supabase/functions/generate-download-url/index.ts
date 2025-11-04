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
        const { wallpaper_id, resolution = '1080p' } = await req.json();

        if (!wallpaper_id) {
            throw new Error('Wallpaper ID is required');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Verify token and get user
        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Get user profile for premium check
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const profiles = await profileResponse.json();
        const profile = profiles[0];
        
        const isPremiumUser = profile?.plan_type === 'premium' && 
                             (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // Get wallpaper data
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}&select=*`, {
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

        // Check if premium wallpaper and user has access
        if (wallpaper.is_premium && !isPremiumUser) {
            throw new Error('Premium subscription required for this wallpaper');
        }

        // Check if high resolution and user has access
        if ((resolution === '4k' || resolution === '8k') && !isPremiumUser) {
            throw new Error(`Premium subscription required for ${resolution.toUpperCase()} downloads`);
        }

        // Rate limiting check for free users
        if (!isPremiumUser) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            
            // Check recent downloads for this user
            try {
                const downloadsResponse = await fetch(`${supabaseUrl}/rest/v1/downloads?user_id=eq.${userId}&created_at=gte.${oneHourAgo}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Accept': 'application/json'
                    }
                });

                if (downloadsResponse.ok) {
                    const recentDownloads = await downloadsResponse.json();
                    if (recentDownloads.length >= 10) {
                        throw new Error('Rate limit exceeded. Free users can download 10 wallpapers per hour.');
                    }
                }
            } catch (rateLimitError) {
                console.warn('Rate limit check failed:', rateLimitError);
                // Continue with download if rate limit check fails
            }
        }

        // Determine download URL based on resolution
        let downloadUrl;
        switch (resolution) {
            case '4k':
                downloadUrl = wallpaper.resolution_4k || wallpaper.download_url;
                break;
            case '8k':
                downloadUrl = wallpaper.resolution_8k || wallpaper.resolution_4k || wallpaper.download_url;
                break;
            case '1080p':
            default:
                downloadUrl = wallpaper.resolution_1080p || wallpaper.download_url;
                break;
        }

        if (!downloadUrl) {
            throw new Error('Download URL not available for this resolution');
        }

        // Create a signed URL that expires in 10 minutes
        const expiresIn = 600; // 10 minutes
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
        
        // Create a simple signed URL with timestamp and basic signature
        const signatureData = `${wallpaper_id}-${resolution}-${userId}-${expiresAt}`;
        const signature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signatureData + serviceRoleKey));
        const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const signedUrl = `${supabaseUrl}/functions/v1/api-img/${wallpaper_id}?type=original&resolution=${resolution}&expires=${expiresAt}&signature=${signatureHex.substring(0, 16)}&user=${userId}`;

        // Record the download
        const downloadRecord = {
            user_id: userId,
            wallpaper_id: wallpaper_id,
            resolution: resolution,
            ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
        };

        // Insert download record (don't wait for it)
        fetch(`${supabaseUrl}/rest/v1/downloads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(downloadRecord)
        }).catch(err => console.error('Failed to record download:', err));

        // Update download count (don't wait for it)
        fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ download_count: (wallpaper.download_count || 0) + 1 })
        }).catch(err => console.error('Failed to update download count:', err));

        return new Response(JSON.stringify({
            data: {
                signed_url: signedUrl,
                download_url: downloadUrl,
                expires_at: expiresAt,
                wallpaper_title: wallpaper.title,
                resolution: resolution
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Download URL generation error:', error);

        const errorResponse = {
            error: {
                code: 'DOWNLOAD_URL_GENERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});