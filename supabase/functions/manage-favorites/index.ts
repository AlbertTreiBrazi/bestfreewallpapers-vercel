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
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify token and get user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      throw new Error('Invalid authentication token');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    if (!userId) {
      throw new Error('User ID not found in token');
    }

    // Parse request body
    const requestData = await req.json();
    const { action, wallpaper_id } = requestData;

    if (!action || !wallpaper_id) {
      throw new Error('Missing required parameters: action and wallpaper_id');
    }

    if (!['add', 'remove', 'check'].includes(action)) {
      throw new Error('Invalid action. Must be "add", "remove", or "check"');
    }

    const wallpaperId = parseInt(wallpaper_id);
    if (isNaN(wallpaperId)) {
      throw new Error('Invalid wallpaper_id. Must be a number');
    }

    let result;
    let message;

    if (action === 'add') {
      // Add to favorites (upsert to handle duplicates)
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/favorites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          wallpaper_id: wallpaperId
        })
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        // Check if it's a duplicate key error (which is okay)
        if (insertResponse.status === 409 || errorText.includes('duplicate key')) {
          message = 'Already in favorites';
          result = { already_exists: true };
        } else {
          throw new Error(`Failed to add favorite: ${errorText}`);
        }
      } else {
        const insertData = await insertResponse.json();
        message = 'Added to favorites successfully';
        result = insertData;
      }
    } else if (action === 'remove') {
      // Remove from favorites
      const deleteResponse = await fetch(
        `${supabaseUrl}/rest/v1/favorites?user_id=eq.${userId}&wallpaper_id=eq.${wallpaperId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'return=representation'
          }
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Failed to remove favorite: ${errorText}`);
      }

      const deleteData = await deleteResponse.json();
      message = 'Removed from favorites successfully';
      result = { removed_count: deleteData?.length || 0 };
    } else if (action === 'check') {
      // Check favorite status and get like count
      const [favoriteResponse, likeCountResponse] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/favorites?user_id=eq.${userId}&wallpaper_id=eq.${wallpaperId}&select=id`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/favorites?wallpaper_id=eq.${wallpaperId}&select=id`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          }
        )
      ]);

      if (!favoriteResponse.ok || !likeCountResponse.ok) {
        throw new Error('Failed to check favorite status');
      }

      const favoriteData = await favoriteResponse.json();
      const likeCountData = await likeCountResponse.json();
      
      const isFavorite = favoriteData.length > 0;
      const likeCount = likeCountData.length;
      
      message = 'Favorite status checked successfully';
      result = {
        is_favorite: isFavorite,
        like_count: likeCount
      };
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Manage favorites error:', error);

    const errorResponse = {
      success: false,
      error: {
        code: 'FAVORITES_OPERATION_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});