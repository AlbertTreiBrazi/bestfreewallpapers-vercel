Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

        const url = new URL(req.url);
        const categoryId = url.searchParams.get('id');

        // Generate slug from name
        function generateSlug(name) {
            return name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');
        }

        // Handle different HTTP methods
        switch (req.method) {
            case 'GET':
                if (categoryId) {
                    // Get single category
                    const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${categoryId}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    const category = await response.json();
                    return new Response(JSON.stringify({ data: category[0] }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else {
                    // Get all categories with wallpaper count
                    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*,wallpapers(count)&order=sort_order.asc,name.asc`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    const categories = await response.json();
                    return new Response(JSON.stringify({ data: categories }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

            case 'POST':
                const createData = await req.json();
                const slug = generateSlug(createData.name);
                
                const createResponse = await fetch(`${supabaseUrl}/rest/v1/categories`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        name: createData.name,
                        slug: slug,
                        description: createData.description || null,
                        sort_order: createData.sort_order || 1,
                        is_active: createData.is_active !== false,
                        name_en: createData.name_en || createData.name,
                        description_en: createData.description_en || createData.description,
                        parent_id: createData.parent_id || null,
                        level: createData.level || 0,
                        is_premium: createData.is_premium || false
                    })
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`Create failed: ${errorText}`);
                }

                const newCategory = await createResponse.json();
                return new Response(JSON.stringify({ data: newCategory[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            case 'PUT':
                if (!categoryId) {
                    throw new Error('Category ID required for update');
                }

                const updateData = await req.json();
                const updateSlug = updateData.name ? generateSlug(updateData.name) : undefined;
                
                const updateBody = {
                    ...updateData,
                    updated_at: new Date().toISOString()
                };
                if (updateSlug) {
                    updateBody.slug = updateSlug;
                }

                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${categoryId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateBody)
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Update failed: ${errorText}`);
                }

                const updatedCategory = await updateResponse.json();
                return new Response(JSON.stringify({ data: updatedCategory[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            case 'DELETE':
                if (!categoryId) {
                    throw new Error('Category ID required for delete');
                }

                // Check if category has wallpapers
                const countResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?category_id=eq.${categoryId}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                const wallpapers = await countResponse.json();
                
                if (wallpapers.length > 0) {
                    throw new Error(`Cannot delete category: ${wallpapers.length} wallpapers are assigned to this category`);
                }

                const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    throw new Error(`Delete failed: ${errorText}`);
                }

                return new Response(JSON.stringify({ data: { success: true } }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            default:
                throw new Error(`Method ${req.method} not allowed`);
        }

    } catch (error) {
        console.error('Admin categories error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_CATEGORIES_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});