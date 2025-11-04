const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Get request data
    const url = new URL(req.url)
    let action = url.searchParams.get('action')
    const authHeader = req.headers.get('Authorization')
    
    // For POST requests, also check for action in request body
    let bodyData = null
    if (req.method === 'POST') {
      try {
        bodyData = await req.json()
        if (!action && bodyData.action) {
          action = bodyData.action
        }
      } catch (e) {
        // If we can't parse the body, continue with query param approach
      }
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authorization header required' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin access
    const token = authHeader.replace('Bearer ', '')
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey
      }
    })

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = await userResponse.json()
    
    // Check if user is admin
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=is_admin`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const profiles = await profileResponse.json()
    if (!profiles?.[0]?.is_admin) {
      return new Response(
        JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different actions
    console.log('Action determined as:', action, 'Request method:', req.method)
    switch (action) {
      case 'wallpapers':
        return await handleWallpapersSearch(req, supabaseUrl, supabaseKey)
      case 'add_wallpapers':
        return await handleAddWallpapers(bodyData, supabaseUrl, supabaseKey)
      case 'remove_wallpapers':
        return await handleRemoveWallpapers(bodyData, supabaseUrl, supabaseKey)
      case 'bulk_update':
        return await handleBulkUpdate(bodyData, supabaseUrl, supabaseKey)
      default:
        return new Response(
          JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Invalid action' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Enhanced collection management error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error.message || 'Internal server error' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleWallpapersSearch(req: Request, supabaseUrl: string, supabaseKey: string) {
  const url = new URL(req.url)
  const collectionId = url.searchParams.get('collection_id')
  const search = url.searchParams.get('search') || ''
  const category = url.searchParams.get('category') || ''
  const premium = url.searchParams.get('premium') || ''
  const sort = url.searchParams.get('sort') || 'newest'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '48')
  const offset = (page - 1) * limit

  if (!collectionId) {
    return new Response(
      JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Collection ID required' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('handleWallpapersSearch called with:', { collectionId, search, category, premium, sort, page, limit })
    
    // First, get wallpapers already in the collection
    const collectionWallpapersResponse = await fetch(
      `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collectionId}&select=wallpaper_id,sort_order,added_at,wallpapers(id,title,description,image_url,thumbnail_url,category_id,tags,is_premium,is_published,is_active,device_type,width,height,download_count,created_at,file_size,seo_score,categories(name))`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!collectionWallpapersResponse.ok) {
      console.error('Collection wallpapers fetch failed:', await collectionWallpapersResponse.text())
      throw new Error('Failed to fetch collection wallpapers')
    }

    const collectionWallpapersData = await collectionWallpapersResponse.json()
    console.log('Collection wallpapers data:', collectionWallpapersData.length + ' items')
    
    const collectionWallpapers = collectionWallpapersData.map((cw: any) => ({
      ...cw.wallpapers,
      sort_order: cw.sort_order,
      added_at: cw.added_at,
      category_name: cw.wallpapers.categories?.name
    }))
    
    const collectionWallpaperIds = collectionWallpapers.map((w: any) => w.id)
    console.log('Collection wallpaper IDs:', collectionWallpaperIds)

    // Build query for available wallpapers
    let wallpaperQuery = `${supabaseUrl}/rest/v1/wallpapers?select=id,title,description,image_url,thumbnail_url,category_id,tags,is_premium,is_published,is_active,device_type,width,height,download_count,created_at,file_size,seo_score,categories(name)&is_active=eq.true&is_published=eq.true`

    // Add search filter
    if (search.trim()) {
      wallpaperQuery += `&or=(title.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*)`
    }

    // Add category filter
    if (category && category !== 'all') {
      wallpaperQuery += `&category_id=eq.${category}`
    }

    // Add premium filter
    if (premium === 'free') {
      wallpaperQuery += '&is_premium=eq.false'
    } else if (premium === 'premium') {
      wallpaperQuery += '&is_premium=eq.true'
    }

    // Add sort order
    switch (sort) {
      case 'oldest':
        wallpaperQuery += '&order=created_at.asc'
        break
      case 'title':
        wallpaperQuery += '&order=title.asc'
        break
      case 'downloads':
        wallpaperQuery += '&order=download_count.desc'
        break
      case 'resolution':
        wallpaperQuery += '&order=width.desc,height.desc'
        break
      default:
        wallpaperQuery += '&order=created_at.desc'
    }

    // Add pagination
    wallpaperQuery += `&limit=${limit}&offset=${offset}`

    // Get available wallpapers
    console.log('Fetching available wallpapers with query:', wallpaperQuery)
    const availableResponse = await fetch(wallpaperQuery, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!availableResponse.ok) {
      console.error('Available wallpapers fetch failed:', await availableResponse.text())
      throw new Error('Failed to fetch available wallpapers')
    }

    const availableData = await availableResponse.json()
    console.log('Available wallpapers data:', availableData.length + ' items')
    
    // Filter out wallpapers already in collection and add category name
    const filteredAvailable = availableData
      .filter((w: any) => !collectionWallpaperIds.includes(w.id))
      .map((w: any) => ({
        ...w,
        category_name: w.categories?.name
      }))

    // Get total count for pagination (simplified approach)
    const totalCountResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?select=id&is_active=eq.true&is_published=eq.true`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    )

    const totalCountHeader = totalCountResponse.headers.get('content-range')
    const totalCount = totalCountHeader ? parseInt(totalCountHeader.split('/')[1]) : filteredAvailable.length
    const totalPages = Math.ceil(totalCount / limit)

    console.log('Sending response with:', {
      available_count: filteredAvailable.length,
      collection_count: collectionWallpapers.length,
      total_pages: totalPages
    })
    
    return new Response(
      JSON.stringify({
        data: {
          available_wallpapers: filteredAvailable,
          collection_wallpapers: collectionWallpapers,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            per_page: limit
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Wallpapers search error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'SEARCH_ERROR', 
          message: `Failed to search wallpapers: ${error.message}` 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleAddWallpapers(bodyData: any, supabaseUrl: string, supabaseKey: string) {
  console.log('handleAddWallpapers called with:', bodyData)
  const { collection_id, wallpaper_ids } = bodyData || {}
  console.log('Extracted collection_id:', collection_id, 'wallpaper_ids:', wallpaper_ids)

  if (!collection_id || !Array.isArray(wallpaper_ids) || wallpaper_ids.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'BAD_REQUEST', 
          message: 'Collection ID and wallpaper IDs array required' 
        } 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get the highest sort order for this collection
    const sortOrderResponse = await fetch(
      `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collection_id}&select=sort_order&order=sort_order.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const sortOrderData = await sortOrderResponse.json()
    const maxSortOrder = sortOrderData?.[0]?.sort_order || 0

    // Prepare insert data
    const insertData = wallpaper_ids.map((wallpaper_id, index) => ({
      collection_id,
      wallpaper_id,
      sort_order: maxSortOrder + index + 1,
      added_at: new Date().toISOString()
    }))

    // Insert wallpapers into collection
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/collection_wallpapers`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(insertData)
      }
    )

    if (!insertResponse.ok) {
      const error = await insertResponse.json()
      throw new Error(`Failed to add wallpapers: ${error.message}`)
    }

    // Update collection wallpaper count
    await updateCollectionWallpaperCount(collection_id, supabaseUrl, supabaseKey)

    return new Response(
      JSON.stringify({ 
        data: { 
          message: `Successfully added ${wallpaper_ids.length} wallpapers to collection`,
          added_count: wallpaper_ids.length
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Add wallpapers error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'ADD_ERROR', 
          message: error.message || 'Failed to add wallpapers to collection' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleRemoveWallpapers(bodyData: any, supabaseUrl: string, supabaseKey: string) {
  const { collection_id, wallpaper_ids } = bodyData || {}

  if (!collection_id || !Array.isArray(wallpaper_ids) || wallpaper_ids.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'BAD_REQUEST', 
          message: 'Collection ID and wallpaper IDs array required' 
        } 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Remove wallpapers from collection
    const wallpaperIdsString = wallpaper_ids.join(',')
    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collection_id}&wallpaper_id=in.(${wallpaperIdsString})`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json()
      throw new Error(`Failed to remove wallpapers: ${error.message}`)
    }

    // Update collection wallpaper count
    await updateCollectionWallpaperCount(collection_id, supabaseUrl, supabaseKey)

    return new Response(
      JSON.stringify({ 
        data: { 
          message: `Successfully removed ${wallpaper_ids.length} wallpapers from collection`,
          removed_count: wallpaper_ids.length
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Remove wallpapers error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'REMOVE_ERROR', 
          message: error.message || 'Failed to remove wallpapers from collection' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBulkUpdate(bodyData: any, supabaseUrl: string, supabaseKey: string) {
  const { wallpaper_ids, updates } = bodyData || {}

  if (!Array.isArray(wallpaper_ids) || wallpaper_ids.length === 0 || !updates) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'BAD_REQUEST', 
          message: 'Wallpaper IDs array and updates object required' 
        } 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate updates object
    const allowedFields = ['is_active', 'is_published', 'is_premium', 'category_id']
    const validUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {})

    if (Object.keys(validUpdates).length === 0) {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: 'BAD_REQUEST', 
            message: 'No valid update fields provided' 
          } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add updated_at timestamp
    validUpdates.updated_at = new Date().toISOString()

    // Perform bulk update
    const wallpaperIdsString = wallpaper_ids.join(',')
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=in.(${wallpaperIdsString})`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validUpdates)
      }
    )

    if (!updateResponse.ok) {
      const error = await updateResponse.json()
      throw new Error(`Failed to update wallpapers: ${error.message}`)
    }

    return new Response(
      JSON.stringify({ 
        data: { 
          message: `Successfully updated ${wallpaper_ids.length} wallpapers`,
          updated_count: wallpaper_ids.length,
          updates: validUpdates
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Bulk update error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'UPDATE_ERROR', 
          message: error.message || 'Failed to update wallpapers' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function updateCollectionWallpaperCount(collectionId: string, supabaseUrl: string, supabaseKey: string) {
  try {
    // Get current wallpaper count
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collectionId}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    )

    const countHeader = countResponse.headers.get('content-range')
    const wallpaperCount = countHeader ? parseInt(countHeader.split('/')[1]) : 0

    // Update collection with new count
    await fetch(
      `${supabaseUrl}/rest/v1/collections?id=eq.${collectionId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallpaper_count: wallpaperCount,
          updated_at: new Date().toISOString()
        })
      }
    )
  } catch (error) {
    console.error('Error updating collection wallpaper count:', error)
    // Don't throw, as this is a secondary operation
  }
}