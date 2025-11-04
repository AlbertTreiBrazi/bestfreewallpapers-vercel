// Enhanced video URL validation - accepts any non-empty URL but prepares for format restrictions
function validateVideoUrl(url: string): { isValid: boolean; format?: string; message?: string } {
  if (!url || url.trim().length === 0) {
    return { isValid: false, message: 'Video URL cannot be empty' };
  }
  
  // Basic URL format validation
  try {
    new URL(url);
  } catch {
    return { isValid: false, message: 'Invalid URL format' };
  }
  
  // Detect video format from URL extension (for future format restrictions)
  const urlLower = url.toLowerCase();
  let detectedFormat = 'unknown';
  
  if (urlLower.includes('.mp4')) {
    detectedFormat = 'mp4';
  } else if (urlLower.includes('.webm')) {
    detectedFormat = 'webm';
  } else if (urlLower.includes('.mov')) {
    detectedFormat = 'mov';
  } else if (urlLower.includes('.avi')) {
    detectedFormat = 'avi';
  }
  
  // FUTURE: Add format whitelist here when needed
  // const allowedFormats = ['mp4', 'webm'];
  // if (detectedFormat !== 'unknown' && !allowedFormats.includes(detectedFormat)) {
  //   return { isValid: false, message: `Video format '${detectedFormat}' is not supported. Allowed formats: ${allowedFormats.join(', ')}` };
  // }
  
  // For now, accept any non-empty URL as valid
  return { 
    isValid: true, 
    format: detectedFormat,
    message: `Video URL validated (detected format: ${detectedFormat})` 
  };
}

// Load timer settings for validation
async function loadTimerSettings(supabaseHeaders: any, supabaseUrl: string) {
  // Guest: 15s, Free: 6s, Premium: 0s (as per user requirements)
  const defaultSettings = {
    guest_timer_duration: 15,
    logged_in_timer_duration: 6
  };

  try {
    const [guestResponse, loggedInResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/guest_ad_settings?select=guest_timer_duration&order=created_at.desc&limit=1`, 
            { headers: supabaseHeaders }),
      fetch(`${supabaseUrl}/rest/v1/logged_in_ad_settings?select=logged_in_timer_duration&order=created_at.desc&limit=1`, 
            { headers: supabaseHeaders })
    ]);

    if (guestResponse.ok && loggedInResponse.ok) {
      const guestData = await guestResponse.json();
      const loggedInData = await loggedInResponse.json();
      
      if (guestData.length > 0 && loggedInData.length > 0) {
        return {
          guest_timer_duration: guestData[0].guest_timer_duration,
          logged_in_timer_duration: loggedInData[0].logged_in_timer_duration
        };
      }
    }
  } catch (error) {
    console.error('Failed to load timer settings, using defaults:', error);
  }

  return defaultSettings;
}

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
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Download token is required'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    // Verify download session
    const sessionResponse = await fetch(
      `${supabaseUrl}/rest/v1/download_sessions?token=eq.${token}&select=*`,
      { headers: supabaseHeaders }
    );

    if (!sessionResponse.ok) {
      throw new Error('Failed to verify download session');
    }

    const sessions = await sessionResponse.json();
    if (sessions.length === 0) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired download token'
        }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = sessions[0];

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now > expiresAt) {
      return new Response(JSON.stringify({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Download token has expired'
        }
      }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CRITICAL FIX: Timer validation for non-premium users
    if (!session.is_premium_user) {
      const timerSettings = await loadTimerSettings(supabaseHeaders, supabaseUrl);
      const requiredWaitTime = session.user_id ? 
        timerSettings.logged_in_timer_duration : 
        timerSettings.guest_timer_duration;
      
      const sessionCreated = new Date(session.created_at);
      const elapsedSeconds = (now.getTime() - sessionCreated.getTime()) / 1000;
      
      // FIXED: Proper timer enforcement - no lenient tolerance that allows bypass
      if (elapsedSeconds < requiredWaitTime) {
        const remainingTime = Math.ceil(requiredWaitTime - elapsedSeconds);
        
        return new Response(JSON.stringify({
          error: {
            code: 'TIMER_NOT_COMPLETED',
            message: `Please wait ${remainingTime} more seconds before downloading`,
            remaining_time: remainingTime,
            required_time: requiredWaitTime,
            elapsed_time: Math.floor(elapsedSeconds)
          }
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log('Timer validation passed:', {
        required: requiredWaitTime,
        elapsed: elapsedSeconds,
        user_type: session.user_id ? 'logged_in' : 'guest'
      });
    }

    // Get wallpaper information including image_url for correct file path resolution
    const wallpaperResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${session.wallpaper_id}&select=id,title,download_count,image_url,categories(slug)`,
      { headers: supabaseHeaders }
    );

    if (!wallpaperResponse.ok) {
      throw new Error('Wallpaper not found');
    }

    const wallpapers = await wallpaperResponse.json();
    if (wallpapers.length === 0) {
      return new Response(JSON.stringify({
        error: {
          code: 'WALLPAPER_NOT_FOUND',
          message: 'Wallpaper not found'
        }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const wallpaper = wallpapers[0];

    // Get wallpaper premium status for quota tracking
    const wallpaperDetailResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${session.wallpaper_id}&select=is_premium`,
      { headers: supabaseHeaders }
    );
    
    const wallpaperDetail = wallpaperDetailResponse.ok ? (await wallpaperDetailResponse.json())[0] : null;
    const isPremiumWallpaper = wallpaperDetail?.is_premium || false;
    
    // ENHANCED: Log the download with structured logging and error handling
    // CRITICAL FIX: Use 'free' for guests instead of 'guest' to match database constraint
    // The downloads table user_type CHECK constraint only allows 'free' or 'premium'
    const userRole = session.is_premium_user ? 'premium' : 'free';
    const isGuestUser = !session.user_id;
    const downloadType = session.resolution === 'video' ? 'video' : 'image';
    const targetUrlHost = session.target_url ? new URL(session.target_url).hostname : 'internal';
    
    const downloadLog = {
      user_id: session.user_id, // NULL for guests, UUID for authenticated users
      wallpaper_id: session.wallpaper_id,
      resolution: session.resolution,
      download_type: userRole,
      user_type: userRole, // 'guest', 'free', or 'premium'
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      download_token: token,
      created_at: new Date().toISOString()
    };

    // ENHANCED: Structured logging for video/image tracking
    console.log('DOWNLOAD_TRACKING_LOG:', {
      type: downloadType, // "video" or "image"
      wallpaper_id: session.wallpaper_id,
      role: userRole, // "free" or "premium"
      is_guest: isGuestUser, // true for unauthenticated users
      target_url_host: targetUrlHost, // hostname of target URL or "internal"
      resolution: session.resolution,
      user_id_hash: session.user_id ? session.user_id.substring(0, 8) + '...' : 'NULL',
      timestamp: new Date().toISOString()
    });

    // Legacy logging for compatibility
    console.log('DOWNLOAD_COUNTING_DEBUG:', {
      wallpaper_id: session.wallpaper_id,
      role: userRole,
      is_guest: isGuestUser,
      path: 'download-file',
      user_id_null: session.user_id === null,
      user_id: session.user_id ? session.user_id.substring(0, 8) + '...' : 'NULL'
    });

    // ========== DEBUG LOGGING: DATABASE INSERT OPERATION ==========
    console.log('🔍 [DEBUG] About to insert download record into database');
    console.log('🔍 [DEBUG] Download log payload:', JSON.stringify(downloadLog, null, 2));
    console.log('🔍 [DEBUG] Target URL:', `${supabaseUrl}/rest/v1/downloads`);
    console.log('🔍 [DEBUG] Headers:', JSON.stringify({
      authorization: supabaseHeaders.Authorization ? 'Bearer ***' : 'MISSING',
      apikey: supabaseHeaders.apikey ? '***' : 'MISSING',
      contentType: supabaseHeaders['Content-Type']
    }));
    
    let insertOk = false;
    try {
      console.log('🔍 [DEBUG] Executing fetch to insert download record...');
      
      const downloadResponse = await fetch(
        `${supabaseUrl}/rest/v1/downloads`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify(downloadLog)
        }
      );
      
      console.log('🔍 [DEBUG] Insert response received');
      console.log('🔍 [DEBUG] Response status:', downloadResponse.status);
      console.log('🔍 [DEBUG] Response ok:', downloadResponse.ok);
      console.log('🔍 [DEBUG] Response headers:', JSON.stringify(Object.fromEntries(downloadResponse.headers.entries())));
      
      insertOk = downloadResponse.ok;
      if (!insertOk) {
        const errorText = await downloadResponse.text();
        console.error('❌ [DEBUG] Download insert FAILED');
        console.error('❌ [DEBUG] Status code:', downloadResponse.status);
        console.error('❌ [DEBUG] Error response body:', errorText);
        console.error('❌ [DEBUG] This is the root cause of the silent failure!');
      } else {
        const successBody = await downloadResponse.text();
        console.log('✅ [DEBUG] Download insert SUCCEEDED');
        console.log('✅ [DEBUG] Success response body:', successBody);
        console.log('✅ [DEBUG] Download logged successfully for:', userRole);
      }
    } catch (insertError: any) {
      console.error('❌ [DEBUG] Download insert EXCEPTION caught');
      console.error('❌ [DEBUG] Exception type:', insertError.constructor.name);
      console.error('❌ [DEBUG] Exception message:', insertError.message);
      console.error('❌ [DEBUG] Exception stack:', insertError.stack);
      console.error('❌ [DEBUG] Full exception object:', JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)));
    }
    console.log('🔍 [DEBUG] Insert operation completed, insertOk =', insertOk);
    // ========== END DEBUG LOGGING ==========
    
    // Track daily quota for free users downloading premium wallpapers
    if (session.user_id && !session.is_premium_user && isPremiumWallpaper) {
      const quotaEntry = {
        user_id: session.user_id,
        wallpaper_id: session.wallpaper_id,
        download_date: new Date().toISOString().split('T')[0],
        user_type: 'free',
        created_at: new Date().toISOString()
      };
      
      await fetch(
        `${supabaseUrl}/rest/v1/daily_quotas`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify(quotaEntry)
        }
      );
    }

    // ENHANCED: Update wallpaper download count with error handling
    let incrementOk = false;
    try {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/wallpapers?id=eq.${session.wallpaper_id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            download_count: wallpaper.download_count + 1
          })
        }
      );
      
      incrementOk = updateResponse.ok;
      if (!incrementOk) {
        const errorText = await updateResponse.text();
        console.error('Download count increment failed:', updateResponse.status, errorText);
      } else {
        console.log('✅ Download count incremented:', wallpaper.download_count + 1);
      }
    } catch (updateError) {
      console.error('Download count increment exception:', updateError.message);
    }

    // Final structured logging
    console.log('DOWNLOAD_COUNTING_RESULT:', {
      wallpaper_id: session.wallpaper_id,
      role: userRole,
      path: 'download-file',
      insert_ok: insertOk,
      increment_ok: incrementOk,
      final_count: wallpaper.download_count + 1
    });

    // Delete the used session token
    await fetch(
      `${supabaseUrl}/rest/v1/download_sessions?token=eq.${token}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders
      }
    );

    // CRITICAL FIX: Enhanced file handling with external URL proxy support
    
    // Check if this is an external URL that needs to be proxied
    const isExternalUrl = session.is_external_url || false;
    const targetUrl = session.target_url || session.download_url;
    
    if (isExternalUrl && targetUrl) {
      // CRITICAL FIX: Proxy external URLs through edge function for proper counting and security
      console.log('Proxying external URL download:', targetUrl);
      
      try {
        // Fetch the external file
        const externalResponse = await fetch(targetUrl);
        
        if (!externalResponse.ok) {
          throw new Error(`External URL returned ${externalResponse.status}`);
        }
        
        // Get content type and size
        const contentType = externalResponse.headers.get('content-type') || 'application/octet-stream';
        const contentLength = externalResponse.headers.get('content-length');
        
        // Determine file extension based on content type and resolution
        let fileExtension = '.jpg'; // default
        if (session.resolution === 'video') {
          if (contentType.includes('video/mp4')) {
            fileExtension = '.mp4';
          } else if (contentType.includes('video/webm')) {
            fileExtension = '.webm';
          } else if (contentType.includes('video/')) {
            fileExtension = '.mp4'; // default for videos
          }
        } else if (contentType.includes('image/')) {
          if (contentType.includes('png')) fileExtension = '.png';
          else if (contentType.includes('webp')) fileExtension = '.webp';
          else if (contentType.includes('gif')) fileExtension = '.gif';
        }
        
        // Generate filename based on URL and resolution
        const filename = `${wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}-${session.resolution}${fileExtension}`;
        
        // Set up response headers for file download with video support
        const downloadHeaders = {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Accept-Ranges': 'bytes' // Enable range requests for video streaming
        };
        
        // Add Range header support for video content
        if (contentType.includes('video/') && req.headers.get('range')) {
          const range = req.headers.get('range');
          downloadHeaders['Range'] = range;
        }
        
        if (contentLength) {
          downloadHeaders['Content-Length'] = contentLength;
        }
        
        console.log('✅ Successfully proxying external URL download');
        
        // Return the actual file content
        return new Response(externalResponse.body, {
          headers: downloadHeaders
        });
        
      } catch (error) {
        console.error('Failed to proxy external URL:', error.message);
        // Fallback to JSON response with direct URL
        const filename = `${wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}-${session.resolution}.jpg`;
        
        return new Response(JSON.stringify({
          data: {
            url: targetUrl,
            download_url: targetUrl,
            filename: filename,
            wallpaper_title: wallpaper.title,
            resolution: session.resolution,
            expires_in: 300,
            content_disposition: `attachment; filename="${filename}"`,
            mobile_optimized: true,
            external_fallback: true
          }
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
    }
    
    // Handle Supabase storage files (original logic)
    let signedUrl = null;
    
    if (session.download_url.includes('supabase.co/storage')) {
      // For Supabase storage files, create signed URL using actual image_url from database
      try {
        // Use the actual image_url from the wallpaper record instead of guessing paths
        const imageUrl = wallpaper.image_url;
        
        if (!imageUrl) {
          throw new Error('No image URL found for wallpaper');
        }
        
        // Extract the file path from the image_url
        // image_url format: https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers/path
        let filePath = imageUrl;
        if (imageUrl.includes('/storage/v1/object/public/wallpapers/')) {
          filePath = imageUrl.split('/storage/v1/object/public/wallpapers/')[1];
        }
        
        console.log('Using actual file path from database:', filePath);
        
        const signedUrlResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/sign/wallpapers/${filePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              expiresIn: 300 // 5 minutes
            })
          }
        );

        if (signedUrlResponse.ok) {
          const signedUrlData = await signedUrlResponse.json();
          signedUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
          console.log('✅ Successfully created signed URL using database image_url:', filePath);
        } else {
          console.log('❌ Failed to create signed URL for path:', filePath);
        }
      } catch (error) {
        console.log('Failed to create signed URL, using direct URL:', error.message);
      }
    }

    // Use signed URL if available, otherwise use the original URL
    const finalDownloadUrl = signedUrl || session.download_url;

    // Generate filename
    const filename = `${wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}-${session.resolution}.jpg`;

    // CRITICAL FIX: Return direct file response with Content-Disposition header
    try {
      // Fetch the actual file content
      const fileResponse = await fetch(finalDownloadUrl);
      
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
      
      console.log('✅ Returning direct file download with Content-Disposition header');
      
      // Return the actual file content with download headers
      return new Response(fileResponse.body, {
        headers: downloadHeaders
      });
      
    } catch (error) {
      console.error('Failed to proxy file, falling back to JSON response:', error.message);
      
      // Fallback to JSON response if file proxying fails
      return new Response(JSON.stringify({
        data: {
          url: finalDownloadUrl,
          download_url: finalDownloadUrl,
          filename: filename,
          wallpaper_title: wallpaper.title,
          resolution: session.resolution,
          expires_in: 300, // 5 minutes
          content_disposition: `attachment; filename="${filename}"`,
          mobile_optimized: true,
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

  } catch (error: any) {
    // BUG FIX 2: Proper error handling to prevent [object Object] displays
    console.error('Download file error:', error)
    
    let errorMessage = 'Failed to process download request'
    let errorCode = 'DOWNLOAD_ERROR'
    let statusCode = 500
    
    if (error.message) {
      errorMessage = error.message
    }
    
    if (error.message?.includes('not found')) {
      errorCode = 'WALLPAPER_NOT_FOUND'
      errorMessage = 'Wallpaper not found'
      statusCode = 404
    } else if (error.message?.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED'
      errorMessage = 'Download token has expired'
      statusCode = 410
    } else if (error.message?.includes('unauthorized')) {
      errorCode = 'UNAUTHORIZED'
      errorMessage = 'You are not authorized to download this wallpaper'
      statusCode = 401
    }
    
    return new Response(JSON.stringify({
      error: {
        code: errorCode,
        message: errorMessage
      }
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
});