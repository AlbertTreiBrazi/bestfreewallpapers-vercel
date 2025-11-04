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
        const url = new URL(req.url);
        const wallpaperId = url.searchParams.get('id');
        const resolution = url.searchParams.get('resolution') || '1080p';
        const authToken = req.headers.get('authorization')?.replace('Bearer ', '');

        console.log('Enhanced download request:', { wallpaperId, resolution });

        if (!wallpaperId || !authToken) {
            throw new Error('Missing required parameters: wallpaper ID and auth token');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!serviceRoleKey || !supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify auth token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'apikey': supabaseAnonKey
            }
        });

        if (!userResponse.ok) {
            console.error('Auth verification failed:', userResponse.status);
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('User authenticated:', userId);

        // Get configurable rate limit settings
        const rateLimitConfigResponse = await fetch(`${supabaseUrl}/rest/v1/rate_limit_config?is_active=eq.true&select=setting_name,setting_value`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        let freeUserLimit = 30; // Default fallback
        let premiumUserLimit = -1; // Default unlimited
        
        if (rateLimitConfigResponse.ok) {
            const configs = await rateLimitConfigResponse.json();
            const freeConfig = configs.find(c => c.setting_name === 'free_user_downloads_per_hour');
            const premiumConfig = configs.find(c => c.setting_name === 'premium_user_downloads_per_hour');
            
            if (freeConfig) freeUserLimit = freeConfig.setting_value;
            if (premiumConfig) premiumUserLimit = premiumConfig.setting_value;
        }

        console.log('Rate limits loaded:', { freeUserLimit, premiumUserLimit });

        // Get user profile for premium check
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=plan_type,premium_expires_at,is_admin`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            console.error('Profile fetch failed:', profileResponse.status);
            throw new Error('Failed to fetch user profile');
        }

        const profiles = await profileResponse.json();
        const profile = profiles[0];
        
        const isPremiumUser = profile?.plan_type === 'premium' && 
                             (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
        
        const isAdminUser = profile?.is_admin === true;

        console.log('User status:', { isPremiumUser, isAdminUser });

        // Get wallpaper data
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}&select=id,title,is_premium,is_published,is_active,download_count,migrated_to_storage,original_file_path,image_url,download_url,categories(slug)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!wallpaperResponse.ok) {
            console.error('Wallpaper fetch failed:', wallpaperResponse.status);
            throw new Error('Wallpaper not found');
        }

        const wallpapers = await wallpaperResponse.json();
        
        if (!wallpapers || wallpapers.length === 0) {
            throw new Error('Wallpaper not found');
        }

        const wallpaper = wallpapers[0];
        console.log('Wallpaper found:', { id: wallpaper.id, title: wallpaper.title, is_premium: wallpaper.is_premium });

        // Check if wallpaper is available
        if (!wallpaper.is_published || !wallpaper.is_active) {
            throw new Error('Wallpaper is not available');
        }

        // Check premium access (admins bypass this)
        if (wallpaper.is_premium && !isPremiumUser && !isAdminUser) {
            throw new Error('Premium subscription required for this wallpaper');
        }

        // Rate limiting check (admins and premium users with unlimited downloads bypass this)
        if (!isAdminUser && (!isPremiumUser || premiumUserLimit > 0)) {
            const effectiveLimit = isPremiumUser ? premiumUserLimit : freeUserLimit;
            
            if (effectiveLimit > 0) {
                const now = new Date();
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

                const downloadsResponse = await fetch(`${supabaseUrl}/rest/v1/downloads?user_id=eq.${userId}&created_at=gte.${oneHourAgo.toISOString()}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Accept': 'application/json'
                    }
                });

                if (downloadsResponse.ok) {
                    const recentDownloads = await downloadsResponse.json();
                    console.log('Recent downloads:', recentDownloads.length, 'Limit:', effectiveLimit);
                    
                    if (recentDownloads.length >= effectiveLimit) {
                        const userType = isPremiumUser ? 'Premium' : 'Free';
                        throw new Error(`Download limit reached. ${userType} users can download ${effectiveLimit} wallpapers per hour.`);
                    }
                }
            }
        }

        // Determine download strategy based on wallpaper storage status
        let downloadUrl = null;
        let filename = `${wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}-${resolution}.jpg`;

        console.log('Wallpaper storage info:', {
            migrated_to_storage: wallpaper.migrated_to_storage,
            original_file_path: wallpaper.original_file_path,
            image_url: wallpaper.image_url,
            download_url: wallpaper.download_url
        });

        if (wallpaper.migrated_to_storage && wallpaper.original_file_path) {
            // Strategy 1: Use optimized storage structure for migrated wallpapers
            const categorySlug = wallpaper.categories?.slug || 'uncategorized';
            const optimizedPath = `original/${categorySlug}/${wallpaperId}.jpg`;
            
            console.log('Trying optimized path:', optimizedPath);
            
            const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/wallpapers/${optimizedPath}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expiresIn: 3600 // 1 hour
                })
            });

            if (signedUrlResponse.ok) {
                const signedUrlData = await signedUrlResponse.json();
                downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                console.log('Using optimized storage path');
            } else {
                // Fallback to legacy paths for migrated files
                const legacyPaths = [
                    wallpaper.original_file_path,
                    `${wallpaperId}.jpg`,
                    `wallpapers/${wallpaperId}.jpg`,
                    `original/${wallpaperId}.jpg`
                ];
                
                for (const legacyPath of legacyPaths) {
                    if (!legacyPath) continue;
                    
                    const legacyResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/wallpapers/${legacyPath}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            expiresIn: 3600
                        })
                    });
                    
                    if (legacyResponse.ok) {
                        const signedUrlData = await legacyResponse.json();
                        downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                        console.log('Using legacy path:', legacyPath);
                        break;
                    }
                }
            }
        }

        // Strategy 2: Handle non-migrated wallpapers using existing URLs
        if (!downloadUrl) {
            console.log('Wallpaper not in optimized storage, using existing URLs');
            
            // Check if we have valid Supabase storage URLs
            if (wallpaper.image_url && wallpaper.image_url.includes('supabase.co/storage')) {
                // For public URLs, use them directly - they're already accessible
                if (wallpaper.image_url.includes('/object/public/')) {
                    downloadUrl = wallpaper.image_url;
                    console.log('Using direct public URL');
                } else {
                    // Extract storage path from URL and create signed URL if needed
                    const urlParts = wallpaper.image_url.split('/storage/v1/object/public/');
                    if (urlParts.length === 2) {
                        const [bucketAndPath] = urlParts[1].split('/', 1);
                        const filePath = urlParts[1].substring(bucketAndPath.length + 1);
                        
                        console.log('Extracted storage info:', { bucket: bucketAndPath, path: filePath });
                        
                        // Try to create signed URL for better security and tracking
                        const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucketAndPath}/${filePath}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                expiresIn: 3600
                            })
                        });
                        
                        if (signedUrlResponse.ok) {
                            const signedUrlData = await signedUrlResponse.json();
                            downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                            console.log('Using signed URL for non-migrated file');
                        } else {
                            // Use direct public URL as fallback
                            downloadUrl = wallpaper.image_url;
                            console.log('Using direct public URL as fallback');
                        }
                    } else {
                        downloadUrl = wallpaper.image_url;
                        console.log('Using image_url directly');
                    }
                }
            } else if (wallpaper.download_url && wallpaper.download_url.startsWith('http')) {
                // External URL (Unsplash, Pexels, etc.)
                downloadUrl = wallpaper.download_url;
                console.log('Using external download URL');
            } else if (wallpaper.image_url && wallpaper.image_url.startsWith('http')) {
                // External image URL as fallback
                downloadUrl = wallpaper.image_url;
                console.log('Using external image URL');
            } else {
                console.error('No valid URL found for wallpaper:', wallpaperId);
                throw new Error('File not found in storage and no valid fallback URL available');
            }
        }

        // Log the download for tracking
        const logResponse = await fetch(`${supabaseUrl}/rest/v1/downloads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                wallpaper_id: parseInt(wallpaperId),
                resolution: resolution,
                download_type: 'enhanced',
                ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
                user_agent: req.headers.get('user-agent') || 'unknown'
            })
        });

        // Update download count (non-blocking)
        if (logResponse.ok) {
            fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    download_count: (wallpaper.download_count || 0) + 1
                })
            }).catch(err => console.log('Download count update failed:', err.message));
        }

        console.log('Download successful for wallpaper:', wallpaperId);

        // Return the download URL with proper metadata
        return new Response(JSON.stringify({
            data: {
                downloadUrl: downloadUrl,
                filename: filename,
                expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
                wallpaperTitle: wallpaper.title,
                resolution: resolution
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (error) {
        console.error('Enhanced download error:', error);

        const errorResponse = {
            error: {
                code: 'DOWNLOAD_FAILED',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Premium subscription required') ? 403 :
                          error.message.includes('Download limit reached') ? 429 :
                          error.message.includes('not found') ? 404 :
                          error.message.includes('Invalid authentication') ? 401 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});