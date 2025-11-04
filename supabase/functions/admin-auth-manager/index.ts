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
    // Get service role key from environment
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Check if user is admin
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!profileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to verify admin status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const profiles = await profileResponse.json();
    if (!profiles || profiles.length === 0 || !profiles[0].is_admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get action from query params
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Handle different actions
    let result;
    switch (action) {
      case 'list-users':
        result = await listUsers(supabaseUrl, serviceRoleKey, url);
        break;
      case 'download-analytics':
        result = await getDownloadAnalytics(supabaseUrl, serviceRoleKey, url);
        break;
      case 'download-trends':
        result = await getDownloadTrends(supabaseUrl, serviceRoleKey, url);
        break;
      case 'top-downloads':
        result = await getTopDownloads(supabaseUrl, serviceRoleKey, url);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin auth manager error:', error);

    const errorResponse = {
      error: {
        code: 'ADMIN_OPERATION_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// List all users with pagination
async function listUsers(supabaseUrl: string, serviceRoleKey: string, url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  // Get ALL users from auth.users using the admin API endpoint
  let allAuthUsers = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const authUsersResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${currentPage}&per_page=1000`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!authUsersResponse.ok) {
      throw new Error('Failed to fetch auth users');
    }

    const authUsersData = await authUsersResponse.json();
    const users = authUsersData.users || [];

    allAuthUsers.push(...users);

    hasMore = users.length === 1000;
    currentPage++;

    if (currentPage > 10) {
      break;
    }
  }

  // Get corresponding profiles
  const profilesResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=*`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  const profiles = profilesResponse.ok ? await profilesResponse.json() : [];

  // Create a map of profiles by user_id
  const profilesMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  // Combine auth users with their profiles
  const combinedUsers = allAuthUsers.map((authUser: any) => {
    const profile = profilesMap.get(authUser.id) || {
      user_id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || '',
      is_admin: false,
      plan_type: 'free',
      premium_expires_at: null,
      created_at: authUser.created_at,
      has_video_download: false
    };

    return {
      id: authUser.id,
      user_id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at,
      last_sign_in_at: authUser.last_sign_in_at,
      raw_user_meta_data: authUser.raw_user_meta_data,
      profile: profile
    };
  });

  // Sort by created_at descending
  combinedUsers.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Apply pagination
  const totalCount = combinedUsers.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedUsers = combinedUsers.slice(offset, offset + limit);

  return {
    users: paginatedUsers,
    totalCount,
    page,
    limit,
    totalPages
  };
}

// Get download analytics by user type
async function getDownloadAnalytics(supabaseUrl: string, serviceRoleKey: string, url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get download stats
  const downloadsResponse = await fetch(
    `${supabaseUrl}/rest/v1/downloads?select=id,user_id,created_at,wallpaper_id&created_at=gte.${startDate.toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!downloadsResponse.ok) {
    throw new Error('Failed to fetch download analytics');
  }

  const downloads = await downloadsResponse.json();

  // Get user profiles
  const userIds = downloads.filter((d: any) => d.user_id).map((d: any) => d.user_id);
  
  let profilesMap = new Map();
  if (userIds.length > 0) {
    const profilesResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=user_id,plan_type&user_id=in.(${userIds.join(',')})`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (profilesResponse.ok) {
      const profiles = await profilesResponse.json();
      profilesMap = new Map(profiles.map((p: any) => [p.user_id, p]));
    }
  }

  // Categorize downloads by user type
  const analytics = {
    guest: 0,
    free: 0,
    premium: 0,
    total: downloads.length
  };

  downloads.forEach((download: any) => {
    if (!download.user_id) {
      analytics.guest++;
    } else {
      const profile = profilesMap.get(download.user_id);
      if (profile?.plan_type === 'premium') {
        analytics.premium++;
      } else {
        analytics.free++;
      }
    }
  });

  return analytics;
}

// Get download trends over time
async function getDownloadTrends(supabaseUrl: string, serviceRoleKey: string, url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get downloads with ordering
  const downloadsResponse = await fetch(
    `${supabaseUrl}/rest/v1/downloads?select=created_at,user_id&created_at=gte.${startDate.toISOString()}&order=created_at.asc`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!downloadsResponse.ok) {
    throw new Error('Failed to fetch download trends');
  }

  const downloads = await downloadsResponse.json();

  // Get user profiles
  const userIds = downloads.filter((d: any) => d.user_id).map((d: any) => d.user_id);
  
  let profilesMap = new Map();
  if (userIds.length > 0) {
    const profilesResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=user_id,plan_type&user_id=in.(${userIds.join(',')})`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (profilesResponse.ok) {
      const profiles = await profilesResponse.json();
      profilesMap = new Map(profiles.map((p: any) => [p.user_id, p]));
    }
  }

  // Group downloads by day
  const dailyStats = new Map();

  downloads.forEach((download: any) => {
    const date = download.created_at.split('T')[0];

    if (!dailyStats.has(date)) {
      dailyStats.set(date, { guest: 0, free: 0, premium: 0, total: 0 });
    }

    const dayStats = dailyStats.get(date);
    dayStats.total++;

    if (!download.user_id) {
      dayStats.guest++;
    } else {
      const profile = profilesMap.get(download.user_id);
      if (profile?.plan_type === 'premium') {
        dayStats.premium++;
      } else {
        dayStats.free++;
      }
    }
  });

  // Convert to array format for charts
  const trendsArray = Array.from(dailyStats.entries()).map(([date, stats]) => ({
    date,
    ...stats
  }));

  return trendsArray;
}

// Get top downloaded wallpapers
async function getTopDownloads(supabaseUrl: string, serviceRoleKey: string, url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get download counts
  const downloadsResponse = await fetch(
    `${supabaseUrl}/rest/v1/downloads?select=wallpaper_id&created_at=gte.${startDate.toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!downloadsResponse.ok) {
    throw new Error('Failed to fetch top downloads');
  }

  const downloadCounts = await downloadsResponse.json();

  // Count downloads by wallpaper ID
  const wallpaperCounts = new Map();
  downloadCounts.forEach((download: any) => {
    const id = download.wallpaper_id;
    wallpaperCounts.set(id, (wallpaperCounts.get(id) || 0) + 1);
  });

  // Get top wallpaper IDs
  const topWallpaperIds = Array.from(wallpaperCounts.entries())
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, limit)
    .map(([id]) => id);

  if (topWallpaperIds.length === 0) {
    return [];
  }

  // Get wallpaper details
  const wallpapersResponse = await fetch(
    `${supabaseUrl}/rest/v1/wallpapers?select=id,title,image_url&id=in.(${topWallpaperIds.join(',')})`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!wallpapersResponse.ok) {
    throw new Error('Failed to fetch wallpapers');
  }

  const wallpapers = await wallpapersResponse.json();

  // Combine with counts and sort
  const topDownloads = wallpapers.map((wallpaper: any) => ({
    wallpaper_id: wallpaper.id,
    count: wallpaperCounts.get(wallpaper.id) || 0,
    wallpapers: wallpaper
  })).sort((a: any, b: any) => b.count - a.count);

  return topDownloads;
}
