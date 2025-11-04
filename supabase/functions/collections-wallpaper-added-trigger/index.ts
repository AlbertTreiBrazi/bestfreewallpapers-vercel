// Database trigger function to auto-set collection thumbnail when wallpapers are added
// This will be called via database trigger, not HTTP request

export const autoThumbnailTrigger = async (payload: {
  collection_id: string;
  wallpaper_id: number;
  supabaseUrl: string;
  serviceRoleKey: string;
}) => {
  const { collection_id, wallpaper_id, supabaseUrl, serviceRoleKey } = payload;

  try {
    // Check if collection already has a cover image
    const collectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/collections?id=eq.${collection_id}&select=cover_image_url`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      }
    );

    const collections = await collectionResponse.json();
    const collection = collections[0];

    // Only set auto-thumbnail if collection doesn't have a cover image
    if (!collection || collection.cover_image_url) {
      return { success: true, message: 'Collection already has cover image' };
    }

    // Get the wallpaper details
    const wallpaperResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}&select=thumbnail_url,image_url`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      }
    );

    const wallpapers = await wallpaperResponse.json();
    const wallpaper = wallpapers[0];

    if (!wallpaper) {
      throw new Error('Wallpaper not found');
    }

    const thumbnailUrl = wallpaper.thumbnail_url || wallpaper.image_url;

    if (!thumbnailUrl) {
      throw new Error('No suitable image found for thumbnail');
    }

    // Update collection with auto-selected thumbnail
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/collections?id=eq.${collection_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cover_image_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update collection');
    }

    return {
      success: true,
      message: 'Auto-thumbnail set successfully',
      data: {
        collection_id,
        wallpaper_id,
        thumbnailUrl
      }
    };

  } catch (error: any) {
    console.error('Auto thumbnail trigger error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// HTTP endpoint for manual trigger
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const requestData = await req.json();
    const { collection_id, wallpaper_id } = requestData;

    const result = await autoThumbnailTrigger({
      collection_id,
      wallpaper_id,
      supabaseUrl,
      serviceRoleKey
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Trigger processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
