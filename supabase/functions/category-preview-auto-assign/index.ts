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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    // Get request body for options
    const requestBody = await req.json();
    const { dryRun = false, categoryIds = [] } = requestBody;

    console.log(`Starting category preview auto-assignment. Dry run: ${dryRun}`);

    // Step 1: Get all categories missing preview images
    const categoriesQuery = categoryIds.length > 0 
      ? `select=id,name,slug,preview_image,preview_wallpaper_id&id=in.(${categoryIds.join(',')})&is_active=eq.true`
      : 'select=id,name,slug,preview_image,preview_wallpaper_id&is_active=eq.true&preview_wallpaper_id=is.null&preview_image=is.null';

    const categoriesResponse = await fetch(
      `${supabaseUrl}/rest/v1/categories?${categoriesQuery}`,
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
    console.log(`Found ${categories.length} categories to process`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Step 2: For each category, find the first wallpaper and assign it
    for (const category of categories) {
      try {
        console.log(`Processing category: ${category.name} (ID: ${category.id})`);

        // Get wallpapers for this category using both direct and junction relationships
        
        // First try direct category_id relationship
        const directWallpapersResponse = await fetch(
          `${supabaseUrl}/rest/v1/wallpapers?select=id,title,created_at&category_id=eq.${category.id}&is_active=eq.true&is_published=eq.true&visibility=eq.public&order=created_at.desc&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          }
        );

        let wallpapers = [];
        if (directWallpapersResponse.ok) {
          wallpapers = await directWallpapersResponse.json();
        }

        // If no direct wallpapers found, try junction table
        if (wallpapers.length === 0) {
          console.log(`No direct wallpapers found for ${category.name}, trying junction table`);
          
          const junctionResponse = await fetch(
            `${supabaseUrl}/rest/v1/wallpapers_categories?select=wallpaper_id&category_id=eq.${category.id}&limit=1`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
              }
            }
          );

          if (junctionResponse.ok) {
            const junctionData = await junctionResponse.json();
            if (junctionData.length > 0) {
              const wallpaperId = junctionData[0].wallpaper_id;
              
              // Get wallpaper details
              const wallpaperResponse = await fetch(
                `${supabaseUrl}/rest/v1/wallpapers?select=id,title,created_at&id=eq.${wallpaperId}&is_active=eq.true&is_published=eq.true&visibility=eq.public`,
                {
                  headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                  }
                }
              );
              
              if (wallpaperResponse.ok) {
                wallpapers = await wallpaperResponse.json();
              }
            }
          }
        }

        if (wallpapers.length === 0) {
          console.log(`No wallpapers found for category: ${category.name}`);
          results.push({
            categoryId: category.id,
            categoryName: category.name,
            status: 'error',
            message: 'No wallpapers found in category'
          });
          errorCount++;
          continue;
        }

        const selectedWallpaper = wallpapers[0];
        console.log(`Selected wallpaper: ${selectedWallpaper.title} (ID: ${selectedWallpaper.id})`);

        // Step 3: Update category with preview_wallpaper_id
        if (!dryRun) {
          const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/categories?id=eq.${category.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                preview_wallpaper_id: selectedWallpaper.id,
                updated_at: new Date().toISOString()
              })
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Failed to update category ${category.name}`);
          }

          console.log(`Successfully updated category: ${category.name}`);
        }

        results.push({
          categoryId: category.id,
          categoryName: category.name,
          wallpaperId: selectedWallpaper.id,
          wallpaperTitle: selectedWallpaper.title,
          status: 'success',
          message: dryRun ? 'Would assign wallpaper (dry run)' : 'Wallpaper assigned successfully'
        });
        successCount++;

      } catch (error) {
        console.error(`Error processing category ${category.name}:`, error);
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          status: 'error',
          message: error.message
        });
        errorCount++;
      }
    }

    const summary = {
      totalProcessed: categories.length,
      successCount,
      errorCount,
      dryRun,
      results
    };

    console.log('Category preview auto-assignment completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      data: summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Category preview auto-assignment error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'AUTO_ASSIGNMENT_ERROR',
        message: error.message || 'Failed to auto-assign category previews'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
