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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!serviceRoleKey || !supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify admin authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const profiles = await profileResponse.json();
        if (!profiles[0]?.is_admin) {
            throw new Error('Admin access required');
        }

        // Generate slug from title with improved SEO-friendly formatting
        function generateSlug(title) {
            return title
                .toLowerCase()
                .trim()
                // Replace special characters and accents
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                // Replace non-alphanumeric characters with hyphens
                .replace(/[^a-z0-9\s-]/g, '')
                // Replace multiple spaces/hyphens with single hyphen
                .replace(/[\s-]+/g, '-')
                // Remove leading/trailing hyphens
                .replace(/^-+|-+$/g, '')
                // Limit length to 100 characters for SEO
                .substring(0, 100)
                .replace(/-+$/, ''); // Remove trailing hyphen if substring cuts in middle
        }

        // Check if slug already exists and generate unique version
        async function generateUniqueSlug(baseTitle, excludeId = null) {
            let slug = generateSlug(baseTitle);
            let counter = 1;
            let originalSlug = slug;

            // Check for existing slugs
            while (true) {
                const checkResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?slug=eq.${slug}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                const existing = await checkResponse.json();
                const hasConflict = existing.some(item => excludeId ? item.id !== excludeId : true);

                if (!hasConflict) {
                    break;
                }

                // Generate new slug with counter
                slug = `${originalSlug}-${counter}`;
                counter++;

                // Prevent infinite loops
                if (counter > 1000) {
                    slug = `${originalSlug}-${Date.now()}`;
                    break;
                }
            }

            return slug;
        }

        const requestData = await req.json();
        const { action, wallpaper_id, title } = requestData;

        if (action === 'generate_single' && wallpaper_id && title) {
            // Generate unique slug for a single wallpaper
            const slug = await generateUniqueSlug(title, parseInt(wallpaper_id));
            
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    slug: slug,
                    updated_at: new Date().toISOString()
                })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Slug update failed: ${errorText}`);
            }

            const updatedWallpaper = await updateResponse.json();
            return new Response(JSON.stringify({ 
                data: { 
                    wallpaper: updatedWallpaper[0],
                    generated_slug: slug 
                } 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } 
        else if (action === 'bulk_generate') {
            // Bulk generate slugs for all wallpapers without slugs
            const wallpapersResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?slug=is.null&select=id,title&is_active=eq.true&limit=500`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            const wallpapers = await wallpapersResponse.json();
            console.log(`Found ${wallpapers.length} wallpapers without slugs`);
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const wallpaper of wallpapers) {
                try {
                    const slug = await generateUniqueSlug(wallpaper.title, wallpaper.id);
                    
                    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            slug: slug,
                            updated_at: new Date().toISOString()
                        })
                    });

                    if (updateResponse.ok) {
                        successCount++;
                        console.log(`Generated unique slug for wallpaper ${wallpaper.id}: ${slug}`);
                    } else {
                        throw new Error(`HTTP ${updateResponse.status}`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push({ wallpaper_id: wallpaper.id, error: error.message });
                    console.error(`Error generating slug for wallpaper ${wallpaper.id}:`, error.message);
                }
            }

            return new Response(JSON.stringify({ 
                data: { 
                    total_processed: wallpapers.length,
                    success_count: successCount,
                    error_count: errorCount,
                    errors: errors.slice(0, 10) // Limit error details
                } 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        else {
            throw new Error('Invalid action. Use "generate_single" with wallpaper_id and title, or "bulk_generate"');
        }

    } catch (error) {
        console.error('Wallpaper slug generator error:', error);

        const errorResponse = {
            error: {
                code: 'SLUG_GENERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});