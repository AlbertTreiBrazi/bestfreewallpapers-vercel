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
    // Extract slug from request body
    const requestData = await req.json();
    const { slug } = requestData;

    if (!slug) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Wallpaper slug is required'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Supabase service role key
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

    // First check for slug redirects
    const redirectResponse = await fetch(
      `${supabaseUrl}/rest/v1/slug_redirects?old_slug=eq.${slug}&select=new_slug,redirect_type`,
      { headers: supabaseHeaders }
    );

    if (redirectResponse.ok) {
      const redirects = await redirectResponse.json();
      if (redirects.length > 0) {
        const redirect = redirects[0];
        return new Response(JSON.stringify({
          redirect: {
            new_slug: redirect.new_slug,
            type: redirect.redirect_type || '301'
          }
        }), {
          status: 301,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Fetch wallpaper by slug with category information and 4K/8K admin controls and live wallpaper support
    const wallpaperQuery = [
      'select=id,title,description,slug,image_url,thumbnail_url,download_url,resolution_1080p,resolution_4k,resolution_8k,asset_4k_url,asset_8k_url,show_4k,show_8k,live_video_url,live_poster_url,live_enabled,width,height,download_count,is_premium,is_mobile,device_type,tags,created_at,category_id,categories(id,name,slug)',
      `slug=eq.${slug}`,
      'is_published=eq.true',
      'is_active=eq.true'
    ].join('&');

    const wallpaperResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?${wallpaperQuery}`,
      { headers: supabaseHeaders }
    );

    if (!wallpaperResponse.ok) {
      throw new Error('Failed to fetch wallpaper');
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

    // Fetch related wallpapers from the same category (exclude current wallpaper, limit 6)
    let relatedWallpapers = [];
    
    if (wallpaper.category_id) {
      const relatedQuery = [
        'select=id,title,slug,thumbnail_url,image_url,download_count,is_premium',
        `category_id=eq.${wallpaper.category_id}`,
        `id=neq.${wallpaper.id}`,
        'is_published=eq.true',
        'is_active=eq.true',
        'order=download_count.desc,created_at.desc',
        'limit=6'
      ].join('&');

      const relatedResponse = await fetch(
        `${supabaseUrl}/rest/v1/wallpapers?${relatedQuery}`,
        { headers: supabaseHeaders }
      );

      if (relatedResponse.ok) {
        relatedWallpapers = await relatedResponse.json();
      }
    }

    // Format the response to match the expected interface with 4K/8K admin controls
    const responseData = {
      wallpaper: {
        id: wallpaper.id,
        title: wallpaper.title,
        description: wallpaper.description,
        slug: wallpaper.slug,
        image_url: wallpaper.image_url,
        thumbnail_url: wallpaper.thumbnail_url,
        download_url: wallpaper.download_url,
        resolution_1080p: wallpaper.resolution_1080p,
        resolution_4k: wallpaper.resolution_4k,
        resolution_8k: wallpaper.resolution_8k,
        asset_4k_url: wallpaper.asset_4k_url,
        asset_8k_url: wallpaper.asset_8k_url,
        show_4k: wallpaper.show_4k || false,
        show_8k: wallpaper.show_8k || false,
        live_video_url: wallpaper.live_video_url,
        live_poster_url: wallpaper.live_poster_url,
        live_enabled: wallpaper.live_enabled || false,
        width: wallpaper.width,
        height: wallpaper.height,
        download_count: wallpaper.download_count,
        is_premium: wallpaper.is_premium,
        is_mobile: wallpaper.is_mobile,
        device_type: wallpaper.device_type,
        tags: wallpaper.tags || [],
        created_at: wallpaper.created_at,
        category: wallpaper.categories ? {
          id: wallpaper.categories.id,
          name: wallpaper.categories.name,
          slug: wallpaper.categories.slug
        } : null
      },
      relatedWallpapers: relatedWallpapers.map(rw => ({
        id: rw.id,
        title: rw.title,
        slug: rw.slug,
        thumbnail_url: rw.thumbnail_url,
        image_url: rw.image_url,
        download_count: rw.download_count,
        is_premium: rw.is_premium
      }))
    };

    return new Response(JSON.stringify({ data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Wallpaper detail error:', error);

    const errorResponse = {
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message || 'Internal server error'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});