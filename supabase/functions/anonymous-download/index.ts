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
        const { wallpaperId, token } = await req.json();

        console.log('Anonymous download request:', { wallpaperId, token });

        if (!wallpaperId || !token) {
            throw new Error('Missing required parameters: wallpaper ID and token');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Verify the token (simple time-based token for anonymous downloads)
        const tokenParts = token.split('-');
        if (tokenParts.length !== 2) {
            throw new Error('Invalid download token format');
        }

        const timestamp = parseInt(tokenParts[0]);
        const hash = tokenParts[1];
        
        // Check if token is expired (5 minutes)
        const now = Date.now();
        if (now - timestamp > 300000) {
            throw new Error('Download token has expired');
        }

        // Verify token hash
        const expectedData = `${wallpaperId}-${timestamp}`;
        const expectedHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedData + serviceRoleKey));
        const expectedHashHex = Array.from(new Uint8Array(expectedHash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
        
        if (hash !== expectedHashHex) {
            throw new Error('Invalid download token');
        }

        // Rate limiting for anonymous downloads (per IP)
        const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
        
        // Check IP-based rate limit (5 downloads per 20 minutes for anonymous users)
        const twentyMinutesAgo = new Date(now - 20 * 60 * 1000);
        
        const rateLimitResponse = await fetch(`${supabaseUrl}/rest/v1/downloads?ip_address=eq.${clientIp}&created_at=gte.${twentyMinutesAgo.toISOString()}&user_id=is.null&select=id`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (rateLimitResponse.ok) {
            const recentDownloads = await rateLimitResponse.json();
            if (recentDownloads.length >= 5) {
                throw new Error('Download limit reached. Anonymous users can download 5 wallpapers per 20 minutes.');
            }
        }

        // Get wallpaper data with URLs and storage info
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}&select=id,title,is_premium,is_published,is_active,download_count,image_url,download_url,migrated_to_storage,original_file_path,categories(slug)`, {
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

        // Check if wallpaper is available
        if (!wallpaper.is_published || !wallpaper.is_active) {
            throw new Error('Wallpaper is not available');
        }

        // PHASE 2: Anonymous users can access ALL wallpapers with 30s countdown
        // Premium status affects resolution quality and ad duration, not access
        console.log('Anonymous user accessing wallpaper:', {
            id: wallpaper.id,
            is_premium: wallpaper.is_premium,
            policy: 'universal_access_with_countdown'
        });

        // ENHANCED STORAGE RESOLUTION: Use actual URLs and smart fallback logic
        let downloadUrl = null;
        
        console.log('Wallpaper storage info:', {
            id: wallpaper.id,
            image_url: wallpaper.image_url,
            download_url: wallpaper.download_url,
            migrated_to_storage: wallpaper.migrated_to_storage,
            original_file_path: wallpaper.original_file_path
        });

        // Strategy 1: Use existing download_url if it's a valid Supabase storage URL
        if (wallpaper.download_url && wallpaper.download_url.includes('supabase.co/storage')) {
            if (wallpaper.download_url.includes('/object/public/')) {
                // Public URL - use directly
                downloadUrl = wallpaper.download_url;
                console.log('✅ Using direct public download URL');
            } else {
                // Extract storage path and create signed URL for better tracking
                const urlParts = wallpaper.download_url.split('/storage/v1/object/public/');
                if (urlParts.length === 2) {
                    const [bucketAndPath] = urlParts[1].split('/', 1);
                    const filePath = urlParts[1].substring(bucketAndPath.length + 1);
                    
                    const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucketAndPath}/${filePath}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            expiresIn: 900 // 15 minutes
                        })
                    });
                    
                    if (signedUrlResponse.ok) {
                        const signedUrlData = await signedUrlResponse.json();
                        downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                        console.log('✅ Using signed URL from download_url');
                    } else {
                        downloadUrl = wallpaper.download_url; // Fallback to direct URL
                        console.log('⚠️ Signed URL failed, using direct download_url');
                    }
                }
            }
        }

        // Strategy 2: Use image_url if download_url didn't work
        if (!downloadUrl && wallpaper.image_url && wallpaper.image_url.includes('supabase.co/storage')) {
            if (wallpaper.image_url.includes('/object/public/')) {
                downloadUrl = wallpaper.image_url;
                console.log('✅ Using direct public image URL as fallback');
            } else {
                const urlParts = wallpaper.image_url.split('/storage/v1/object/public/');
                if (urlParts.length === 2) {
                    const [bucketAndPath] = urlParts[1].split('/', 1);
                    const filePath = urlParts[1].substring(bucketAndPath.length + 1);
                    
                    const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucketAndPath}/${filePath}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            expiresIn: 900
                        })
                    });
                    
                    if (signedUrlResponse.ok) {
                        const signedUrlData = await signedUrlResponse.json();
                        downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                        console.log('✅ Using signed URL from image_url');
                    } else {
                        downloadUrl = wallpaper.image_url;
                        console.log('⚠️ Signed URL failed, using direct image_url');
                    }
                }
            }
        }

        // Strategy 3: Legacy path attempts for migrated files
        if (!downloadUrl && wallpaper.migrated_to_storage && wallpaper.original_file_path) {
            const legacyPaths = [
                wallpaper.original_file_path,
                `original/${wallpaper.original_file_path}`,
                `${wallpaperId}.jpg`,
                `original/${wallpaperId}.jpg`
            ];
            
            for (const filePath of legacyPaths) {
                if (!filePath) continue;
                
                const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/wallpapers/${filePath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        expiresIn: 900
                    })
                });
                
                if (signedUrlResponse.ok) {
                    const signedUrlData = await signedUrlResponse.json();
                    downloadUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
                    console.log('✅ Using legacy path:', filePath);
                    break;
                }
            }
        }

        // Strategy 4: External URLs (Unsplash, etc.)
        if (!downloadUrl && wallpaper.download_url && wallpaper.download_url.startsWith('http')) {
            downloadUrl = wallpaper.download_url;
            console.log('✅ Using external download URL');
        } else if (!downloadUrl && wallpaper.image_url && wallpaper.image_url.startsWith('http')) {
            downloadUrl = wallpaper.image_url;
            console.log('✅ Using external image URL');
        }

        // Strategy 5: Handle relative paths like Halloween wallpaper
        if (!downloadUrl && wallpaper.download_url && wallpaper.download_url.startsWith('/')) {
            // Convert relative path to full URL using frontend domain
            const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://ask2cd4axs6d.space.minimax.io';
            downloadUrl = `${baseUrl}${wallpaper.download_url}`;
            console.log('✅ Using relative path converted to full URL:', downloadUrl);
        }

        if (!downloadUrl) {
            console.error('❌ No valid download URL found for wallpaper:', wallpaperId);
            throw new Error('File not found - no valid download URL available');
        }

        // ENHANCED: Log the anonymous download with structured logging
        const downloadLog = {
            user_id: null, // NULL for guest downloads
            wallpaper_id: parseInt(wallpaperId),
            resolution: '1080p',
            download_type: 'guest',
            user_type: 'guest',
            ip_address: clientIp,
            user_agent: req.headers.get('user-agent') || 'unknown'
        };
        
        // Structured logging for debugging
        console.log('DOWNLOAD_COUNTING_DEBUG:', {
            wallpaper_id: parseInt(wallpaperId),
            role: 'guest',
            path: 'anonymous-download',
            user_id_null: true,
            user_id: 'NULL'
        });
        
        let insertOk = false;
        let incrementOk = false;
        
        try {
            const logResponse = await fetch(`${supabaseUrl}/rest/v1/downloads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(downloadLog)
            });

            insertOk = logResponse.ok;
            if (!insertOk) {
                const logError = await logResponse.text();
                console.error('Guest download insert failed:', logResponse.status, logError);
            } else {
                console.log('✅ Guest download logged successfully');
            }
        } catch (insertError) {
            console.error('Guest download insert exception:', insertError.message);
        }
        
        // Always attempt to update download count (atomic transaction)
        try {
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaperId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    download_count: (wallpaper.download_count || 0) + 1
                })
            });
            
            incrementOk = updateResponse.ok;
            if (!incrementOk) {
                const updateError = await updateResponse.text();
                console.error('Guest download count increment failed:', updateResponse.status, updateError);
            } else {
                console.log(`✅ Guest download count incremented: ${(wallpaper.download_count || 0) + 1}`);
            }
        } catch (updateError) {
            console.error('Guest download count increment exception:', updateError.message);
        }
        
        // Final structured logging
        console.log('DOWNLOAD_COUNTING_RESULT:', {
            wallpaper_id: parseInt(wallpaperId),
            role: 'guest',
            path: 'anonymous-download',
            insert_ok: insertOk,
            increment_ok: incrementOk,
            final_count: (wallpaper.download_count || 0) + 1
        });

        console.log('Anonymous download successful for wallpaper:', wallpaperId);

        // Generate filename
        const filename = `${wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}-1080p.jpg`;

        // CRITICAL FIX: Return direct file response with Content-Disposition header
        try {
            // Fetch the actual file content
            const fileResponse = await fetch(downloadUrl);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch file: ${fileResponse.status}`);
            }
            
            // Get content type and size
            const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
            const contentLength = fileResponse.headers.get('content-length');
            
            // Set up response headers for direct download
            const downloadHeaders = {
                ...corsHeaders,
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            };
            
            if (contentLength) {
                downloadHeaders['Content-Length'] = contentLength;
            }
            
            console.log('✅ Returning direct file download with Content-Disposition header for guest');
            
            // Return the actual file content with download headers
            return new Response(fileResponse.body, {
                headers: downloadHeaders
            });
            
        } catch (error) {
            console.error('Failed to proxy file for guest, falling back to JSON response:', error.message);
            
            // Fallback to JSON response if file proxying fails
            return new Response(JSON.stringify({
                data: {
                    downloadUrl: downloadUrl,
                    filename: filename,
                    expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
                    wallpaperTitle: wallpaper.title,
                    fallback_mode: true
                }
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
        }

    } catch (error) {
        console.error('Anonymous download error:', error);

        const errorResponse = {
            error: {
                code: 'ANONYMOUS_DOWNLOAD_FAILED',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Premium wallpapers require') ? 403 :
                          error.message.includes('Download limit reached') ? 429 :
                          error.message.includes('not found') ? 404 :
                          error.message.includes('expired') ? 410 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});