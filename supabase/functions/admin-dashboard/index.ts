Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
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

        // Verify admin access
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Try multiple auth verification approaches
        let userData;
        let userId;
        
        try {
            // First try with anon key
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': Deno.env.get('SUPABASE_ANON_KEY')
                }
            });
            
            if (userResponse.ok) {
                userData = await userResponse.json();
                userId = userData.id;
            } else {
                // If anon key fails, try with service role key
                const serviceUserResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (!serviceUserResponse.ok) {
                    throw new Error('Authentication failed: Invalid token');
                }
                
                userData = await serviceUserResponse.json();
                userId = userData.id;
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            throw new Error('Authentication failed');
        }

        // Check if user is admin and get their role with permissions
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin,admin_role,admin_permissions,email,full_name`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify admin status');
        }

        const profiles = await profileResponse.json();
        const profile = profiles[0];

        if (!profile || !profile.is_admin) {
            throw new Error('Admin access required');
        }

        const userRole = profile.admin_role || 'admin';
        const adminPermissions = profile.admin_permissions || {};
        const isSuperAdmin = userRole === 'super_admin';
        const canManageAdmins = isSuperAdmin || adminPermissions.manage_admins;
        
        // Get admin role details from admin_roles table
        const adminRoleResponse = await fetch(`${supabaseUrl}/rest/v1/admin_roles?role_name=eq.${userRole}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        
        let adminRoleDetails = null;
        if (adminRoleResponse.ok) {
            const adminRoles = await adminRoleResponse.json();
            adminRoleDetails = adminRoles[0] || null;
        }

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const action = url.searchParams.get('action');

            if (action === 'stats') {
                // Get comprehensive dashboard stats
                const [usersResponse, premiumRequestsResponse, downloadsResponse] = await Promise.all([
                    fetch(`${supabaseUrl}/rest/v1/profiles?select=id,plan_type,premium_expires_at,premium_purchase_date,created_at`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }),
                    fetch(`${supabaseUrl}/rest/v1/premium_membership_requests?select=id,status,amount_paid,created_at`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }),
                    fetch(`${supabaseUrl}/rest/v1/downloads?select=id,created_at`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    })
                ]);

                const users = await usersResponse.json();
                const premiumRequests = await premiumRequestsResponse.json();
                const downloads = await downloadsResponse.json();

                const totalUsers = users.length;
                const premiumUsers = users.filter(user => 
                    user.plan_type === 'premium' && 
                    (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date())
                ).length;

                const pendingRequests = premiumRequests.filter(req => req.status === 'pending').length;
                const totalRevenue = premiumRequests
                    .filter(req => req.status === 'approved' && req.amount_paid)
                    .reduce((sum, req) => sum + parseFloat(req.amount_paid || 0), 0);

                const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const newUsersLast30Days = users.filter(user => 
                    new Date(user.created_at) > last30Days
                ).length;

                const downloadsLast30Days = downloads.filter(download => 
                    new Date(download.created_at) > last30Days
                ).length;

                const unreadMessages = 0; // Messages feature disabled for security

                return new Response(JSON.stringify({
                    data: {
                        totalUsers,
                        premiumUsers,
                        pendingRequests,
                        totalRevenue,
                        newUsersLast30Days,
                        downloadsLast30Days,
                        totalDownloads: downloads.length,
                        unreadMessages,
                        adminInfo: {
                            role: userRole,
                            roleDetails: adminRoleDetails,
                            permissions: adminPermissions,
                            canManageAdmins,
                            canDeleteAdmins: isSuperAdmin || (adminRoleDetails && adminRoleDetails.can_delete_admins),
                            isSuperAdmin
                        }
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (action === 'premium-requests') {
                const response = await fetch(`${supabaseUrl}/rest/v1/premium_membership_requests?order=created_at.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                const data = await response.json();
                return new Response(JSON.stringify({ data }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (action === 'users') {
                const search = url.searchParams.get('search') || '';
                const hasVideoDownload = url.searchParams.get('has_video_download') || '';
                const planType = url.searchParams.get('plan_type') || '';
                const isAdmin = url.searchParams.get('is_admin') || '';
                const page = parseInt(url.searchParams.get('page') || '1');
                const limit = parseInt(url.searchParams.get('limit') || '20');
                const offset = (page - 1) * limit;
                
                // Build comprehensive query to get ALL users from both profiles and auth.users
                try {
                    // First, get users from auth.users table using service role to ensure we get ALL users
                    const authUsersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${limit}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    
                    let allAuthUsers = [];
                    if (authUsersResponse.ok) {
                        const authResult = await authUsersResponse.json();
                        allAuthUsers = authResult.users || [];
                    }
                    
                    // Get all profiles data
                    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    
                    if (!profilesResponse.ok) {
                        throw new Error('Failed to fetch user profiles');
                    }
                    
                    const profiles = await profilesResponse.json();
                    const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
                    
                    // Combine auth users with profile data
                    let combinedUsers = allAuthUsers.map(authUser => {
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
                            ...profile,
                            id: profile.id || authUser.id,
                            user_id: authUser.id,
                            email: authUser.email,
                            created_at: authUser.created_at
                        };
                    });
                    
                    // Add any profiles that don't have corresponding auth users (edge case)
                    profiles.forEach(profile => {
                        if (!combinedUsers.find(u => u.user_id === profile.user_id)) {
                            combinedUsers.push(profile);
                        }
                    });
                    
                    // Apply filters
                    if (search) {
                        const searchTerm = search.toLowerCase().trim();
                        combinedUsers = combinedUsers.filter(user => 
                            user.email?.toLowerCase().includes(searchTerm) ||
                            user.full_name?.toLowerCase().includes(searchTerm)
                        );
                    }
                    
                    if (hasVideoDownload !== '' && hasVideoDownload !== 'all') {
                        const hasVideo = hasVideoDownload === 'true';
                        combinedUsers = combinedUsers.filter(user => !!user.has_video_download === hasVideo);
                    }
                    
                    if (planType !== '' && planType !== 'all') {
                        combinedUsers = combinedUsers.filter(user => user.plan_type === planType);
                    }
                    
                    if (isAdmin !== '' && isAdmin !== 'all') {
                        const adminStatus = isAdmin === 'true';
                        combinedUsers = combinedUsers.filter(user => !!user.is_admin === adminStatus);
                    }
                    
                    // Sort by created_at descending
                    combinedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    
                    // Calculate pagination
                    const totalCount = combinedUsers.length;
                    const totalPages = Math.ceil(totalCount / limit);
                    const paginatedUsers = combinedUsers.slice(offset, offset + limit);
                    
                    // Enhance users with premium status and role information
                    const enhancedUsers = paginatedUsers.map(user => {
                        const isPremiumActive = user.plan_type === 'premium' && 
                                               (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date());
                        
                        const premiumDaysRemaining = user.premium_expires_at ? 
                            Math.max(0, Math.ceil((new Date(user.premium_expires_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                        
                        return {
                            ...user,
                            is_premium_active: isPremiumActive,
                            premium_days_remaining: premiumDaysRemaining,
                            role_display_name: user.admin_role || 'User'
                        };
                    });

                    return new Response(JSON.stringify({ 
                        data: enhancedUsers,
                        pagination: {
                            page,
                            limit,
                            totalCount,
                            totalPages,
                            hasNext: page < totalPages,
                            hasPrev: page > 1
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                    
                } catch (authError) {
                    console.warn('Auth API unavailable, falling back to profiles only:', authError);
                    
                    // Fallback to profiles-only approach
                    let query = `select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
                    
                    // Add search functionality
                    if (search) {
                        const searchTerm = encodeURIComponent(search.trim());
                        query += `&or=(email.ilike.*${searchTerm}*,full_name.ilike.*${searchTerm}*)`;
                    }
                    
                    // Add filters
                    if (hasVideoDownload === 'true') {
                        query += `&has_video_download=eq.true`;
                    } else if (hasVideoDownload === 'false') {
                        query += `&has_video_download=eq.false`;
                    }
                    
                    if (planType !== '' && planType !== 'all') {
                        query += `&plan_type=eq.${planType}`;
                    }
                    
                    if (isAdmin === 'true') {
                        query += `&is_admin=eq.true`;
                    } else if (isAdmin === 'false') {
                        query += `&is_admin=eq.false`;
                    }
                    
                    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?${query}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch users');
                    }
                    
                    const users = await response.json();
                    
                    // Get total count for pagination
                    let countQuery = `select=id`;
                    if (search) {
                        const searchTerm = encodeURIComponent(search.trim());
                        countQuery += `&or=(email.ilike.*${searchTerm}*,full_name.ilike.*${searchTerm}*)`;
                    }
                    
                    if (hasVideoDownload === 'true') {
                        countQuery += `&has_video_download=eq.true`;
                    } else if (hasVideoDownload === 'false') {
                        countQuery += `&has_video_download=eq.false`;
                    }
                    
                    if (planType !== '' && planType !== 'all') {
                        countQuery += `&plan_type=eq.${planType}`;
                    }
                    
                    if (isAdmin === 'true') {
                        countQuery += `&is_admin=eq.true`;
                    } else if (isAdmin === 'false') {
                        countQuery += `&is_admin=eq.false`;
                    }
                    
                    const countResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?${countQuery}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Prefer': 'count=exact'
                        }
                    });
                    
                    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || 0;
                    const totalPages = Math.ceil(parseInt(totalCount) / limit);
                    
                    // Enhance users with premium status and role information
                    const enhancedUsers = users.map(user => {
                        const isPremiumActive = user.plan_type === 'premium' && 
                                               (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date());
                        
                        const premiumDaysRemaining = user.premium_expires_at ? 
                            Math.max(0, Math.ceil((new Date(user.premium_expires_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                        
                        return {
                            ...user,
                            is_premium_active: isPremiumActive,
                            premium_days_remaining: premiumDaysRemaining,
                            role_display_name: user.admin_role || 'User'
                        };
                    });

                    return new Response(JSON.stringify({ 
                        data: enhancedUsers,
                        pagination: {
                            page,
                            limit,
                            totalCount: parseInt(totalCount),
                            totalPages,
                            hasNext: page < totalPages,
                            hasPrev: page > 1
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }



            // Get admin users for admin management
            if (action === 'admins' && canManageAdmins) {
                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?is_admin=eq.true&select=*&order=created_at.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch admin users');
                }

                const admins = await response.json();
                
                // Get admin role details for each admin
                const adminRolesResponse = await fetch(`${supabaseUrl}/rest/v1/admin_roles?select=*&order=hierarchy_level.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                let availableRoles = [];
                if (adminRolesResponse.ok) {
                    availableRoles = await adminRolesResponse.json();
                }
                
                // Enhance admin data with role information
                const enhancedAdmins = admins.map(admin => {
                    const roleDetails = availableRoles.find(role => role.role_name === admin.admin_role);
                    return {
                        ...admin,
                        role_details: roleDetails,
                        can_be_deleted: isSuperAdmin && admin.user_id !== userId
                    };
                });

                return new Response(JSON.stringify({ 
                    data: enhancedAdmins,
                    availableRoles: availableRoles.filter(role => {
                        if (!isSuperAdmin && role.role_name === 'super_admin') {
                            return false;
                        }
                        return role.is_active;
                    }),
                    permissions: {
                        canDelete: isSuperAdmin,
                        canCreate: canManageAdmins,
                        canEditRoles: canManageAdmins
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // Get admin roles for role management
            if (action === 'admin-roles' && canManageAdmins) {
                const response = await fetch(`${supabaseUrl}/rest/v1/admin_roles?select=*&order=hierarchy_level.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch admin roles');
                }

                const roles = await response.json();
                return new Response(JSON.stringify({ data: roles }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        if (req.method === 'PUT') {
            const { action, id, status, admin_notes, premium_expires_at, admin_role, email, full_name, user_id, is_admin, duration_days } = await req.json();

            if (action === 'process-premium-request') {
                if (!adminPermissions.manage_premium_requests && !isSuperAdmin) {
                    throw new Error('Insufficient permissions to manage premium requests');
                }
                
                const updateData = {
                    status,
                    admin_notes: admin_notes || null,
                    processed_at: new Date().toISOString(),
                    processed_by: userId,
                    updated_at: new Date().toISOString()
                };

                const response = await fetch(`${supabaseUrl}/rest/v1/premium_membership_requests?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update premium request');
                }

                if (status === 'approved') {
                    const requestResponse = await fetch(`${supabaseUrl}/rest/v1/premium_membership_requests?id=eq.${id}&select=user_id,duration_months`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });

                    const requests = await requestResponse.json();
                    const request = requests[0];

                    if (request) {
                        const expiresAt = new Date();
                        expiresAt.setMonth(expiresAt.getMonth() + request.duration_months);

                        await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${request.user_id}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                plan_type: 'premium',
                                premium_expires_at: expiresAt.toISOString(),
                                premium_purchase_date: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                        });
                    }
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: `Premium request ${status} successfully`
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (action === 'update-user-premium') {
                if (!adminPermissions.manage_users && !isSuperAdmin) {
                    throw new Error('Insufficient permissions to manage users');
                }
                
                const updateData = {
                    plan_type: status === 'premium' ? 'premium' : 'free',
                    premium_expires_at: premium_expires_at || null,
                    updated_at: new Date().toISOString()
                };

                if (status === 'premium' && premium_expires_at) {
                    updateData.premium_purchase_date = new Date().toISOString();
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update user premium status');
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: 'User premium status updated successfully'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }



            // Enhanced admin role management
            if (action === 'update-admin-role' && canManageAdmins) {
                if (!isSuperAdmin && admin_role === 'super_admin') {
                    throw new Error('Only super admin can assign super admin role');
                }
                
                const roleResponse = await fetch(`${supabaseUrl}/rest/v1/admin_roles?role_name=eq.${admin_role}&select=*`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                let targetRolePermissions = {};
                if (roleResponse.ok) {
                    const roles = await roleResponse.json();
                    if (roles.length > 0) {
                        targetRolePermissions = roles[0].permissions || {};
                    }
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        admin_role: admin_role,
                        admin_permissions: targetRolePermissions,
                        is_admin: admin_role !== null && admin_role !== '',
                        updated_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update admin role');
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: 'Admin role updated successfully'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // New action: Update user role (for frontend role assignment UI)
            if (action === 'update-user-role' && canManageAdmins) {
                if (!user_id) {
                    throw new Error('user_id is required');
                }
                
                if (!isSuperAdmin && admin_role === 'super_admin') {
                    throw new Error('Only super admin can assign super admin role');
                }
                
                let targetRolePermissions = {};
                if (admin_role) {
                    const roleResponse = await fetch(`${supabaseUrl}/rest/v1/admin_roles?role_name=eq.${admin_role}&select=*`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    
                    if (roleResponse.ok) {
                        const roles = await roleResponse.json();
                        if (roles.length > 0) {
                            targetRolePermissions = roles[0].permissions || {};
                        }
                    }
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        admin_role: admin_role,
                        admin_permissions: targetRolePermissions,
                        is_admin: is_admin,
                        updated_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update user role');
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: 'User role updated successfully'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // New action: Grant manual premium access
            if (action === 'grant-manual-premium') {
                if (!adminPermissions.manage_users && !isSuperAdmin) {
                    throw new Error('Insufficient permissions to manage users');
                }
                
                if (!user_id || !duration_days) {
                    throw new Error('user_id and duration_days are required');
                }
                
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + duration_days);
                
                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        plan_type: 'premium',
                        premium_expires_at: expiresAt.toISOString(),
                        premium_purchase_date: new Date().toISOString(),
                        manual_premium_granted_by: userId,
                        manual_premium_granted_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to grant manual premium access');
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: `Manual premium access granted for ${duration_days} days`
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // New action: Revoke manual premium access
            if (action === 'revoke-manual-premium') {
                if (!adminPermissions.manage_users && !isSuperAdmin) {
                    throw new Error('Insufficient permissions to manage users');
                }
                
                if (!user_id) {
                    throw new Error('user_id is required');
                }
                
                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        plan_type: 'free',
                        premium_expires_at: null,
                        premium_purchase_date: null,
                        manual_premium_revoked_by: userId,
                        manual_premium_revoked_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to revoke manual premium access');
                }

                const data = await response.json();
                return new Response(JSON.stringify({
                    data: data[0],
                    message: 'Manual premium access revoked successfully'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // Create new admin
            if (action === 'create-admin' && canManageAdmins) {
                if (!email || !admin_role) {
                    throw new Error('Email and admin role are required');
                }
                
                if (!isSuperAdmin && admin_role === 'super_admin') {
                    throw new Error('Only super admin can assign super admin role');
                }
                
                const roleResponse = await fetch(`${supabaseUrl}/rest/v1/admin_roles?role_name=eq.${admin_role}&select=*`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                let targetRolePermissions = {};
                if (roleResponse.ok) {
                    const roles = await roleResponse.json();
                    if (roles.length > 0) {
                        targetRolePermissions = roles[0].permissions || {};
                    }
                }

                const existingUserResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${email}&select=*`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (existingUserResponse.ok) {
                    const existingUsers = await existingUserResponse.json();
                    if (existingUsers.length > 0) {
                        const user = existingUsers[0];
                        
                        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.user_id}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify({
                                is_admin: true,
                                admin_role: admin_role,
                                admin_permissions: targetRolePermissions,
                                created_by: userId,
                                updated_at: new Date().toISOString()
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to promote existing user to admin');
                        }
                        
                        const data = await response.json();
                        return new Response(JSON.stringify({
                            data: data[0],
                            message: 'Existing user promoted to admin successfully'
                        }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    }
                }
                
                return new Response(JSON.stringify({
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User must first sign up on the platform before being made an admin. Please ask them to create an account first.'
                    }
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // DELETE method for admin deletion
        if (req.method === 'DELETE') {
            const url = new URL(req.url);
            const action = url.searchParams.get('action');
            const targetUserId = url.searchParams.get('id');

            if (action === 'delete-admin' && targetUserId) {
                if (!isSuperAdmin) {
                    throw new Error('Only super admin can delete admin accounts');
                }
                
                if (targetUserId === userId) {
                    throw new Error('Cannot delete your own admin account');
                }
                
                const targetAdminResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${targetUserId}&select=*`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (!targetAdminResponse.ok) {
                    throw new Error('Failed to find target admin');
                }
                
                const targetAdmins = await targetAdminResponse.json();
                if (targetAdmins.length === 0) {
                    throw new Error('Admin not found');
                }
                
                const targetAdmin = targetAdmins[0];
                
                const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${targetUserId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        is_admin: false,
                        admin_role: null,
                        admin_permissions: {},
                        updated_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to remove admin privileges');
                }
                
                const updatedUser = await response.json();

                return new Response(JSON.stringify({
                    data: updatedUser[0],
                    message: `Admin privileges removed from ${targetAdmin.full_name || targetAdmin.email} successfully`
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        throw new Error('Invalid request');

    } catch (error) {
        console.error('Admin dashboard error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'ADMIN_DASHBOARD_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});