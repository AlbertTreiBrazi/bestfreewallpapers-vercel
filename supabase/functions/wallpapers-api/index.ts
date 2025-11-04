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

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestData = await req.json();
    const { sort = 'popular', limit = 20, page = 1, category, device_type, is_premium, onlyFree, search, is_ai, video_only } = requestData;

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

    // First, get category wallpaper IDs if category filter is specified
    let categoryWallpaperIds: string = '';
    if (category) {
      // Get category ID from slug
      const categoryResponse = await fetch(
        `${supabaseUrl}/rest/v1/categories?select=id&slug=eq.${category}&is_active=eq.true`,
        { headers: supabaseHeaders }
      );
      
      if (categoryResponse.ok) {
        const categories = await categoryResponse.json();
        if (categories.length > 0) {
          const categoryId = categories[0].id;
          
          // Get wallpaper IDs from junction table
          const junctionResponse = await fetch(
            `${supabaseUrl}/rest/v1/wallpapers_categories?select=wallpaper_id&category_id=eq.${categoryId}`,
            { headers: supabaseHeaders }
          );
          
          if (junctionResponse.ok) {
            const junctionData = await junctionResponse.json();
            const wallpaperIds = junctionData.map((item: any) => item.wallpaper_id);
            categoryWallpaperIds = wallpaperIds.length > 0 ? wallpaperIds.join(',') : '0';
          } else {
            categoryWallpaperIds = '0'; // No wallpapers found
          }
        } else {
          categoryWallpaperIds = '0'; // Category not found
        }
      } else {
        categoryWallpaperIds = '0'; // Category lookup failed
      }
    }

    // Build query parameters
    let query = 'wallpapers?is_published=eq.true&is_active=eq.true';
    
    // Add category filter using wallpaper IDs
    if (category) {
      query += `&id=in.(${categoryWallpaperIds})`;
    }
    
    if (device_type) {
      query += `&device_type=eq.${device_type}`;
    }
    
    if (is_premium !== undefined) {
      query += `&is_premium=eq.${is_premium}`;
    }
    
    // Handle onlyFree parameter - exclude premium wallpapers
    if (onlyFree === true) {
      query += '&is_premium=eq.false';
    }
    
    // Add AI filter using tags (tag-based fallback since is_ai column doesn't exist)
    if (is_ai === true) {
      query += '&tags=cs.{ai,ai-generated}';
    } else if (is_ai === false) {
      query += '&not.tags=cs.{ai,ai-generated}';
    }
    
    // Add video/live wallpaper filter
    if (video_only === true) {
      query += '&or=(live_video_url.not.is.null,live_enabled.eq.true)';
    }
    
    // Add text search filter
    if (search && search.trim()) {
      // Sanitize: remove special chars, limit length
      const searchTerm = search.trim()
        .replace(/[()]/g, '')
        .replace(/[*]/g, '')
        .slice(0, 100);
      
      if (searchTerm.length > 0) {
        // Search across title, description, and tags using case-insensitive ILIKE
        query += `&or=(title.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,tags.cs.{${searchTerm}})`;
      }
    }

    // Add sorting
    switch (sort) {
      case 'popular':
      case 'downloaded':
        query += '&order=download_count.desc';
        break;
      case 'newest':
        query += '&order=created_at.desc';
        break;
      case 'oldest':
        query += '&order=created_at.asc';
        break;
      case 'title_asc':
        query += '&order=title.asc';
        break;
      case 'title_desc':
        query += '&order=title.desc';
        break;
      case 'random':
        // For random, we'll just use created_at desc for now
        query += '&order=created_at.desc';
        break;
      default:
        query += '&order=created_at.desc';
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += `&limit=${limit}&offset=${offset}`;

    // Add select fields - remove categories join as we're using junction table
    query += '&select=id,title,description,image_url,thumbnail_url,slug,is_premium,download_count,created_at,tags,aspect_ratio,device_type,width,height,live_video_url,live_poster_url,live_enabled';

    console.log('Wallpapers API query:', query);

    // Fetch wallpapers
    const wallpapersResponse = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
      headers: supabaseHeaders
    });

    if (!wallpapersResponse.ok) {
      const error = await wallpapersResponse.text();
      console.error('Wallpapers fetch failed:', error);
      throw new Error('Failed to fetch wallpapers');
    }

    const wallpapers = await wallpapersResponse.json();

    // Get total count for pagination
    const countQuery = query.split('&limit')[0].split('&offset')[0]; // Remove limit and offset for count
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/${countQuery}&select=id`, {
      headers: {
        ...supabaseHeaders,
        'Prefer': 'count=exact'
      }
    });

    let totalCount = wallpapers.length;
    if (countResponse.ok) {
      try {
        const countHeader = countResponse.headers.get('content-range');
        console.log('Count header:', countHeader);
        if (countHeader) {
          const match = countHeader.match(/\/(\d+)$/);
          if (match) {
            totalCount = parseInt(match[1]);
            console.log('Total count parsed:', totalCount);
          }
        }
      } catch (e) {
        console.warn('Could not get total count:', e);
      }
    }

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return new Response(JSON.stringify({
      success: true,
      data: {
        wallpapers,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Wallpapers API error:', error);

    const errorResponse = {
      success: false,
      error: {
        code: 'WALLPAPERS_FETCH_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
