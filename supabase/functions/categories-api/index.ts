Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' // 10 minute cache
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    // Fetch categories with wallpaper counts
    // We need to count both direct category_id relationships AND junction table relationships
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_categories_with_counts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      // Fallback to manual query if RPC doesn't exist
      console.log('RPC function not found, using fallback query');
      
      // Get categories
      const categoriesResponse = await fetch(
        `${supabaseUrl}/rest/v1/categories?select=*&is_active=eq.true&order=sort_order.asc,name.asc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categories = await categoriesResponse.json();

      // For each category, count wallpapers using both direct and junction relationships
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category: any) => {
          // Count wallpapers with direct category_id relationship
          const directCountResponse = await fetch(
            `${supabaseUrl}/rest/v1/wallpapers?select=id&category_id=eq.${category.id}&is_active=eq.true&is_published=eq.true&visibility=eq.public`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
              }
            }
          );

          const directCount = parseInt(
            directCountResponse.headers.get('content-range')?.split('/')[1] || '0'
          );

          // Count wallpapers through junction table
          const junctionCountResponse = await fetch(
            `${supabaseUrl}/rest/v1/wallpapers_categories?select=wallpaper_id&category_id=eq.${category.id}`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
              }
            }
          );

          let junctionCount = 0;
          if (junctionCountResponse.ok) {
            const junctionData = await junctionCountResponse.json();
            
            // Verify these wallpapers are active and published
            if (junctionData.length > 0) {
              const wallpaperIds = junctionData.map((item: any) => item.wallpaper_id).join(',');
              const validWallpapersResponse = await fetch(
                `${supabaseUrl}/rest/v1/wallpapers?select=id&id=in.(${wallpaperIds})&is_active=eq.true&is_published=eq.true&visibility=eq.public`,
                {
                  headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                  }
                }
              );
              
              junctionCount = parseInt(
                validWallpapersResponse.headers.get('content-range')?.split('/')[1] || '0'
              );
            }
          }

          // Use the higher count (some wallpapers might be in both)
          const totalCount = Math.max(directCount, junctionCount);

          // If category has preview_wallpaper_id, fetch the actual wallpaper image URL
          let preview_wallpaper_image_url = null;
          if (category.preview_wallpaper_id) {
            try {
              const wallpaperResponse = await fetch(
                `${supabaseUrl}/rest/v1/wallpapers?select=image_url&id=eq.${category.preview_wallpaper_id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                  }
                }
              );
              
              if (wallpaperResponse.ok) {
                const wallpaperData = await wallpaperResponse.json();
                if (wallpaperData && wallpaperData.length > 0) {
                  preview_wallpaper_image_url = wallpaperData[0].image_url;
                }
              }
            } catch (wallpaperError) {
              console.warn(`Failed to fetch wallpaper image for category ${category.id}:`, wallpaperError);
            }
          }

          return {
            ...category,
            wallpaper_count: totalCount,
            preview_wallpaper_image_url
          };
        })
      );

      return new Response(JSON.stringify({
        data: categoriesWithCounts
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If RPC exists, use it but still add preview wallpaper image URLs
    const categories = await response.json();
    
    // Add preview wallpaper image URLs for categories that have preview_wallpaper_id
    const categoriesWithPreviewImages = await Promise.all(
      categories.map(async (category: any) => {
        let preview_wallpaper_image_url = null;
        if (category.preview_wallpaper_id) {
          try {
            const wallpaperResponse = await fetch(
              `${supabaseUrl}/rest/v1/wallpapers?select=image_url&id=eq.${category.preview_wallpaper_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey
                }
              }
            );
            
            if (wallpaperResponse.ok) {
              const wallpaperData = await wallpaperResponse.json();
              if (wallpaperData && wallpaperData.length > 0) {
                preview_wallpaper_image_url = wallpaperData[0].image_url;
              }
            }
          } catch (wallpaperError) {
            console.warn(`Failed to fetch wallpaper image for category ${category.id}:`, wallpaperError);
          }
        }
        
        return {
          ...category,
          preview_wallpaper_image_url
        };
      })
    );
    
    return new Response(JSON.stringify({
      data: categoriesWithPreviewImages
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Categories API error:', error);
    
    const errorResponse = {
      error: {
        code: 'CATEGORIES_FETCH_ERROR',
        message: error.message || 'Failed to fetch categories'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
