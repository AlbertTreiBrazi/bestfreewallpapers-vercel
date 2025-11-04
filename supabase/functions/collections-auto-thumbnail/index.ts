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
        const { action, collectionId } = requestData;

        if (action === 'set_auto_thumbnail') {
            return await setAutoThumbnail({
                collectionId,
                supabaseUrl,
                serviceRoleKey,
                corsHeaders
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid action',
                code: 'INVALID_ACTION'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error: any) {
        console.error('Auto thumbnail error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Auto thumbnail processing failed',
            details: error.message,
            code: 'PROCESSING_ERROR'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function setAutoThumbnail(params: {
    collectionId: string;
    supabaseUrl: string;
    serviceRoleKey: string;
    corsHeaders: Record<string, string>;
}) {
    const { collectionId, supabaseUrl, serviceRoleKey, corsHeaders } = params;

    try {
        // Get the most recently added wallpaper in this collection
        const wallpaperResponse = await fetch(
            `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collectionId}&select=wallpaper_id,wallpapers!inner(id,thumbnail_url,image_url,created_at)&order=added_at.desc&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!wallpaperResponse.ok) {
            throw new Error('Failed to fetch collection wallpapers');
        }

        const wallpapers = await wallpaperResponse.json();
        
        if (!wallpapers || wallpapers.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No wallpapers found in collection',
                code: 'NO_WALLPAPERS'
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const latestWallpaper = wallpapers[0].wallpapers;
        const thumbnailUrl = latestWallpaper.thumbnail_url || latestWallpaper.image_url;

        if (!thumbnailUrl) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No suitable image found for thumbnail',
                code: 'NO_IMAGE'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Update collection with auto-selected thumbnail
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/collections?id=eq.${collectionId}`, {
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
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update collection: ${errorText}`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Auto-thumbnail set successfully',
            data: {
                collectionId: collectionId,
                thumbnailUrl: thumbnailUrl,
                wallpaperId: latestWallpaper.id
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Auto thumbnail error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Auto thumbnail failed',
            details: error.message,
            code: 'THUMBNAIL_ERROR'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}