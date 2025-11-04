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

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { wallpaper_id, resolution = '1080p' } = requestData;

    if (!wallpaper_id) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Wallpaper ID is required'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!serviceRoleKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseHeaders = {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    };

    // Get user information if authenticated
    let userId = null;
    let isPremiumUser = false;
    let isAdminUser = false;
    let userType = 'guest';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          userId = userData.id;
          userType = 'free'; // Default for logged-in users

          // Get user profile
          const profileResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=plan_type,premium_expires_at,is_admin`,
            { headers: supabaseHeaders }
          );

          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            const profile = profiles[0];
            
            isPremiumUser = profile?.plan_type === 'premium' && 
                           (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
            isAdminUser = profile?.is_admin === true;
            
            if (isPremiumUser || isAdminUser) {
              userType = 'premium';
            }
          }
        }
      } catch (error) {
        console.log('Auth verification failed, continuing as guest');
      }
    }

    // CRITICAL FIX: Get wallpaper data including 4K/8K external URLs and live wallpaper data
    const wallpaperResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}&select=id,title,slug,is_premium,is_published,is_active,download_count,image_url,download_url,width,height,asset_4k_url,asset_8k_url,show_4k,show_8k,live_video_url,live_poster_url,live_enabled,categories(slug)`,
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

    // Check if wallpaper is available
    if (!wallpaper.is_published || !wallpaper.is_active) {
      return new Response(JSON.stringify({
        error: {
          code: 'WALLPAPER_UNAVAILABLE',
          message: 'Wallpaper is not available'
        }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 2: PREMIUM UNIFICATION - All users can access all content with appropriate countdown
    
    // Guest Users Logic - 30s countdown + ads → can download ANY wallpaper (including Premium)
    if (userType === 'guest') {
      // Guest users can access ALL wallpapers with 30s countdown + ads
      // No restrictions on premium content - countdown handles the access control
    }
    
    // Free Users Logic - 15s countdown + ads → can download ANY wallpaper (including Premium)  
    else if (userType === 'free') {
      // Free users can access ALL wallpapers with 15s countdown + ads
      // No daily quota restrictions - countdown handles the access control
      // Resolution quality will be limited to 1080p (Premium users get 4K/8K)
    }
    
    // Premium Users Logic - Instant, ad-free → higher resolution (4K/8K) where available
    
    // Generate download token and session
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';

    // CRITICAL FIX: Determine the actual download URL with external URL support
    let actualDownloadUrl = wallpaper.download_url || wallpaper.image_url;
    let isExternalUrl = false;
    
    // Handle video downloads with enhanced validation
    if (resolution === 'video' && wallpaper.live_video_url && wallpaper.live_enabled) {
      // Enhanced video URL validation
      const validation = validateVideoUrl(wallpaper.live_video_url);
      
      if (!validation.isValid) {
        return new Response(JSON.stringify({
          error: {
            code: 'INVALID_VIDEO_URL',
            message: validation.message || 'Invalid video URL'
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      actualDownloadUrl = wallpaper.live_video_url;
      isExternalUrl = true;
      console.log('Using validated live video URL:', actualDownloadUrl, `(${validation.format})`);
    }
    // Handle 4K/8K external URLs
    else if (resolution === '4k' && wallpaper.asset_4k_url && wallpaper.show_4k) {
      actualDownloadUrl = wallpaper.asset_4k_url;
      isExternalUrl = true;
      console.log('Using 4K external URL:', actualDownloadUrl);
    } else if (resolution === '8k' && wallpaper.asset_8k_url && wallpaper.show_8k) {
      actualDownloadUrl = wallpaper.asset_8k_url;
      isExternalUrl = true;
      console.log('Using 8K external URL:', actualDownloadUrl);
    }

    // CRITICAL FIX: Store download session with external URL tracking
    const downloadSession = {
      token: downloadToken,
      wallpaper_id: wallpaper.id,
      user_id: userId,
      resolution: resolution,
      download_url: actualDownloadUrl,
      expires_at: expiresAt.toISOString(),
      is_premium_user: isPremiumUser,
      ip_address: clientIp,
      user_agent: req.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
      is_external_url: isExternalUrl,
      target_url: isExternalUrl ? actualDownloadUrl : null
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
      throw new Error('Failed to create download session');
    }

    // Get quota information for free users downloading premium wallpapers
    let quotaInfo = null;
    if (userType === 'free' && wallpaper.is_premium) {
      const today = new Date().toISOString().split('T')[0];
      const quotaResponse = await fetch(
        `${supabaseUrl}/rest/v1/daily_quotas?user_id=eq.${userId}&download_date=eq.${today}&select=id`,
        { headers: supabaseHeaders }
      );
      
      if (quotaResponse.ok) {
        const todayDownloads = await quotaResponse.json();
        const dailyLimit = 3;
        quotaInfo = {
          remaining: dailyLimit - todayDownloads.length,
          daily_limit: dailyLimit,
          used_today: todayDownloads.length
        };
      }
    }

    // Get admin settings for timer duration - PHASE 2 updated durations
    let guestTimerDuration = 30; // Guest users: 30s countdown
    let loggedInTimerDuration = 15; // Free users: 15s countdown
    
    try {
      // Load guest ad settings directly from database
      const guestSettingsResponse = await fetch(
        `${supabaseUrl}/rest/v1/guest_ad_settings?select=guest_timer_duration&order=created_at.desc&limit=1`,
        { headers: supabaseHeaders }
      );
      
      if (guestSettingsResponse.ok) {
        const guestSettings = await guestSettingsResponse.json();
        if (guestSettings.length > 0) {
          guestTimerDuration = guestSettings[0].guest_timer_duration || 30;
        }
      }
      
      // Load logged-in ad settings directly from database
      const loggedInSettingsResponse = await fetch(
        `${supabaseUrl}/rest/v1/logged_in_ad_settings?select=logged_in_timer_duration&order=created_at.desc&limit=1`,
        { headers: supabaseHeaders }
      );
      
      if (loggedInSettingsResponse.ok) {
        const loggedInSettings = await loggedInSettingsResponse.json();
        if (loggedInSettings.length > 0) {
          loggedInTimerDuration = loggedInSettings[0].logged_in_timer_duration || 15;
        }
      }
    } catch (settingsError) {
      console.log('Failed to load admin settings, using defaults:', settingsError.message);
    }

    // Prepare response based on user type
    const responseData: any = {
      token: downloadToken,
      download_token: downloadToken,
      wallpaper_id: wallpaper.id,
      wallpaper_title: wallpaper.title,
      resolution: resolution,
      expires_at: expiresAt.toISOString(),
      user_type: userType,
      is_premium_wallpaper: wallpaper.is_premium
    };

    if (userType === 'premium') {
      // Premium users get instant download - no ads
      responseData.instant_download = true;
      responseData.ad_required = false;
      responseData.download_url = `${supabaseUrl}/functions/v1/download-file?token=${downloadToken}`;
    } else {
      // Guests and free users see ads with admin-configured timers
      responseData.instant_download = false;
      responseData.ad_required = true;
      responseData.countdown_duration = userType === 'guest' ? guestTimerDuration : loggedInTimerDuration;
      responseData.download_url = `${supabaseUrl}/functions/v1/download-file?token=${downloadToken}`;
    }

    // Add quota info for free users on premium wallpapers
    if (quotaInfo) {
      responseData.quota = quotaInfo;
    }

    return new Response(JSON.stringify({ data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // BUG FIX 2: Enhanced error handling to prevent [object Object] displays
    console.error('Download preparation error:', error);
    
    let errorMessage = 'Failed to prepare download'
    let errorCode = 'DOWNLOAD_PREPARATION_FAILED'
    let statusCode = 500
    
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error?.message) {
      errorMessage = error.message
    } else if (error?.error_description) {
      errorMessage = error.error_description
    }
    
    // Handle specific error types
    if (errorMessage.includes('not found')) {
      errorCode = 'WALLPAPER_NOT_FOUND'
      errorMessage = 'Wallpaper not found'
      statusCode = 404
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('permission')) {
      errorCode = 'UNAUTHORIZED'
      errorMessage = 'You are not authorized to download this wallpaper'
      statusCode = 401
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      errorCode = 'QUOTA_EXCEEDED'
      statusCode = 429
    }

    const errorResponse = {
      error: {
        code: errorCode,
        message: errorMessage
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
