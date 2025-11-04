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
        
        // Verify user token
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Authentication failed');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        const userEmail = userData.email;

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin,admin_role`, {
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
        const isSuperAdmin = userRole === 'super_admin';

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const action = url.searchParams.get('action') || 'list';

            if (action === 'list') {
                // Get admin actions log with filtering
                const page = parseInt(url.searchParams.get('page') || '1');
                const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
                const offset = (page - 1) * limit;
                
                const adminFilter = url.searchParams.get('admin_email');
                const userFilter = url.searchParams.get('user_email');
                const actionFilter = url.searchParams.get('action_type');
                const startDate = url.searchParams.get('start_date');
                const endDate = url.searchParams.get('end_date');

                // Build query with filters
                let query = 'admin_actions_log?select=*&order=timestamp.desc';
                const filters = [];

                if (adminFilter) {
                    filters.push(`admin_email.ilike.%${adminFilter}%`);
                }
                if (userFilter) {
                    filters.push(`user_email.ilike.%${userFilter}%`);
                }
                if (actionFilter && actionFilter !== 'all') {
                    filters.push(`action_type.eq.${actionFilter}`);
                }
                if (startDate) {
                    filters.push(`timestamp.gte.${startDate}T00:00:00Z`);
                }
                if (endDate) {
                    filters.push(`timestamp.lte.${endDate}T23:59:59Z`);
                }

                if (filters.length > 0) {
                    query += '&' + filters.join('&');
                }

                query += `&limit=${limit}&offset=${offset}`;

                const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch admin actions log: ${response.status}`);
                }

                const logs = await response.json();

                // Get total count for pagination
                let countQuery = 'admin_actions_log?select=id';
                if (filters.length > 0) {
                    countQuery += '&' + filters.join('&');
                }

                const countResponse = await fetch(`${supabaseUrl}/rest/v1/${countQuery}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                });

                const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0');

                return new Response(JSON.stringify({
                    data: logs,
                    pagination: {
                        page,
                        limit,
                        total: totalCount,
                        pages: Math.ceil(totalCount / limit)
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (action === 'export' && isSuperAdmin) {
                // Export admin actions log as CSV
                const url = new URL(req.url);
                const adminFilter = url.searchParams.get('admin_email');
                const userFilter = url.searchParams.get('user_email');
                const actionFilter = url.searchParams.get('action_type');
                const startDate = url.searchParams.get('start_date');
                const endDate = url.searchParams.get('end_date');

                // Build query with filters
                let query = 'admin_actions_log?select=*&order=timestamp.desc&limit=10000';
                const filters = [];

                if (adminFilter) {
                    filters.push(`admin_email.ilike.%${adminFilter}%`);
                }
                if (userFilter) {
                    filters.push(`user_email.ilike.%${userFilter}%`);
                }
                if (actionFilter && actionFilter !== 'all') {
                    filters.push(`action_type.eq.${actionFilter}`);
                }
                if (startDate) {
                    filters.push(`timestamp.gte.${startDate}T00:00:00Z`);
                }
                if (endDate) {
                    filters.push(`timestamp.lte.${endDate}T23:59:59Z`);
                }

                if (filters.length > 0) {
                    query += '&' + filters.join('&');
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch admin actions log: ${response.status}`);
                }

                const logs = await response.json();

                // Convert to CSV
                const headers = [
                    'ID',
                    'Admin Email',
                    'User Email',
                    'Action Type',
                    'Duration (Days)',
                    'Notes',
                    'Timestamp',
                    'Action Details'
                ];

                const csvRows = [headers.join(',')];

                logs.forEach(log => {
                    const row = [
                        log.id,
                        `"${log.admin_email || ''}"`,
                        `"${log.user_email || ''}"`,
                        `"${log.action_type}"`,
                        log.duration_days || '',
                        `"${(log.notes || '').replace(/"/g, '""')}"`,
                        new Date(log.timestamp).toISOString(),
                        `"${JSON.stringify(log.action_details || {}).replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(','));
                });

                const csvContent = csvRows.join('\n');
                const timestamp = new Date().toISOString().split('T')[0];

                return new Response(csvContent, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="admin-actions-log-${timestamp}.csv"`
                    }
                });
            }

            if (action === 'stats') {
                // Get statistics for admin actions
                const response = await fetch(`${supabaseUrl}/rest/v1/admin_actions_log?select=action_type,timestamp`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch admin actions stats: ${response.status}`);
                }

                const logs = await response.json();

                const stats = {
                    total: logs.length,
                    by_action: {},
                    recent_30_days: 0
                };

                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                logs.forEach(log => {
                    // Count by action type
                    stats.by_action[log.action_type] = (stats.by_action[log.action_type] || 0) + 1;

                    // Count recent actions
                    if (new Date(log.timestamp) > thirtyDaysAgo) {
                        stats.recent_30_days++;
                    }
                });

                return new Response(JSON.stringify({ data: stats }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        if (req.method === 'POST') {
            // Log admin action
            const requestData = await req.json();
            const {
                user_id,
                user_email,
                action_type,
                action_details = {},
                duration_days,
                notes
            } = requestData;

            if (!action_type) {
                throw new Error('action_type is required');
            }

            // Get client IP and user agent
            const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
            const userAgent = req.headers.get('user-agent') || 'unknown';

            // Log the action
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/log_admin_action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_admin_id: userId,
                    p_admin_email: userEmail,
                    p_user_id: user_id,
                    p_user_email: user_email,
                    p_action_type: action_type,
                    p_action_details: action_details,
                    p_duration_days: duration_days,
                    p_notes: notes,
                    p_ip_address: clientIP,
                    p_user_agent: userAgent
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to log admin action: ${errorText}`);
            }

            const logId = await response.json();

            return new Response(JSON.stringify({
                success: true,
                log_id: logId
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'DELETE' && isSuperAdmin) {
            // Delete admin action log entry (super admin only)
            const url = new URL(req.url);
            const logId = url.searchParams.get('id');

            if (!logId) {
                throw new Error('Log ID is required');
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/admin_actions_log?id=eq.${logId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete admin action log: ${response.status}`);
            }

            // Log the deletion action
            await fetch(`${supabaseUrl}/rest/v1/rpc/log_admin_action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_admin_id: userId,
                    p_admin_email: userEmail,
                    p_user_id: null,
                    p_user_email: null,
                    p_action_type: 'log_entry_deleted',
                    p_action_details: { deleted_log_id: logId },
                    p_duration_days: null,
                    p_notes: `Deleted admin action log entry #${logId}`,
                    p_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
                    p_user_agent: req.headers.get('user-agent') || 'unknown'
                })
            });

            return new Response(JSON.stringify({
                success: true,
                message: 'Admin action log entry deleted successfully'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Method not allowed');

    } catch (error) {
        console.error('Admin actions log error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_ACTIONS_LOG_ERROR',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Admin access required') ? 403 :
                          error.message.includes('Authentication') ? 401 : 
                          error.message.includes('Method not allowed') ? 405 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});