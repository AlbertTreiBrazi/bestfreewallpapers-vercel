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

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin`, {
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

        if (req.method === 'GET') {
            // Get comprehensive dashboard metrics with caching
            const url = new URL(req.url);
            const forceRefresh = url.searchParams.get('force') === 'true';
            
            // Cache key for 5-minute cache
            const cacheKey = 'admin_dashboard_metrics';
            const cacheExpiry = 5 * 60 * 1000; // 5 minutes
            
            // Check for unprocessed cache invalidations
            const invalidationsResponse = await fetch(
                `${supabaseUrl}/rest/v1/cache_invalidations?path=in.(/admin/metrics,/admin/analytics,/admin/dashboard)&processed=eq.false&order=created_at.desc&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            
            let hasPendingInvalidations = false;
            if (invalidationsResponse.ok) {
                const invalidations = await invalidationsResponse.json();
                hasPendingInvalidations = invalidations.length > 0;
                
                if (hasPendingInvalidations) {
                    console.log('Cache invalidation detected - forcing fresh data');
                    
                    // Mark invalidations as processed
                    await fetch(`${supabaseUrl}/rest/v1/cache_invalidations?path=in.(/admin/metrics,/admin/analytics,/admin/dashboard)&processed=eq.false`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            processed: true,
                            processed_at: new Date().toISOString()
                        })
                    });
                }
            }
            
            // Check if we have cached data (skip if force refresh or pending invalidations)
            let cachedData = null;
            if (!forceRefresh && !hasPendingInvalidations) {
                const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/admin_dashboard_stats?cache_key=eq.${cacheKey}&select=*&order=created_at.desc&limit=1`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();
                    if (cacheData.length > 0) {
                        const lastCache = cacheData[0];
                        const cacheAge = Date.now() - new Date(lastCache.created_at).getTime();
                        if (cacheAge < cacheExpiry) {
                            cachedData = JSON.parse(lastCache.stats_data);
                        }
                    }
                }
            }
            
            if (cachedData && !forceRefresh && !hasPendingInvalidations) {
                return new Response(JSON.stringify({
                    data: cachedData,
                    cached: true,
                    cache_age: Math.floor((Date.now() - new Date(cachedData.generated_at).getTime()) / 1000)
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // Generate fresh metrics (live data, no cache dependencies)
            console.log('Fetching live data - Force refresh:', forceRefresh);
            const [usersResponse, subscriptionsResponse, downloadsResponse] = await Promise.all([
                // Get all users with timestamp for debugging
                fetch(`${supabaseUrl}/rest/v1/profiles?select=id,plan_type,premium_expires_at,created_at&order=created_at.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }),
                // Get active subscriptions
                fetch(`${supabaseUrl}/rest/v1/bfw_subscriptions?status=eq.active&select=id,plan_id,created_at&order=created_at.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }),
                // Get download statistics (live data, no limit for accuracy)
                fetch(`${supabaseUrl}/rest/v1/downloads?select=id,created_at,wallpaper_id&order=created_at.desc`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                })
            ]);

            const users = await usersResponse.json();
            const subscriptions = await subscriptionsResponse.json();
            const downloads = await downloadsResponse.json();

            console.log('Live data counts:', {
                users: Array.isArray(users) ? users.length : 0,
                subscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
                downloads: Array.isArray(downloads) ? downloads.length : 0,
                timestamp: new Date().toISOString()
            });

            // Calculate metrics
            const totalUsers = Array.isArray(users) ? users.length : 0;
            
            // Count premium users (active subscriptions + manual premium grants)
            let premiumUsers = 0;
            if (Array.isArray(subscriptions)) {
                premiumUsers += subscriptions.length;
            }
            if (Array.isArray(users)) {
                premiumUsers += users.filter(user => 
                    user.plan_type === 'premium' && 
                    (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date())
                ).length;
            }
            
            // Calculate revenue from active subscriptions (Stripe handles revenue tracking)
            const totalRevenue = Array.isArray(subscriptions) ? 
                subscriptions.length * 9.99 : 0; // Assuming $9.99 per subscription

            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const newUsersLast30Days = Array.isArray(users) ? 
                users.filter(user => new Date(user.created_at) > last30Days).length : 0;

            const downloadsLast30Days = Array.isArray(downloads) ? 
                downloads.filter(download => new Date(download.created_at) > last30Days).length : 0;

            const totalDownloads = Array.isArray(downloads) ? downloads.length : 0;

            // Calculate growth rate
            const growthRate = totalUsers > 0 ? ((newUsersLast30Days / totalUsers) * 100) : 0;
            
            // Calculate engagement (downloads per user in last 30 days)
            const engagement = totalUsers > 0 ? (downloadsLast30Days / totalUsers) : 0;

            const metricsData = {
                totalUsers,
                premiumUsers,
                totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
                newUsersLast30Days,
                downloadsLast30Days,
                totalDownloads,
                growthRate: Math.round(growthRate * 10) / 10, // Round to 1 decimal place
                engagement: Math.round(engagement * 10) / 10,
                generated_at: new Date().toISOString(),
                live_update: true,
                force_refresh: forceRefresh,
                data_timestamp: new Date().getTime()
            };

            // Cache the results
            try {
                await fetch(`${supabaseUrl}/rest/v1/admin_dashboard_stats`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cache_key: cacheKey,
                        stats_data: JSON.stringify(metricsData),
                        generated_by: userId
                    })
                });
            } catch (cacheError) {
                console.warn('Failed to cache metrics:', cacheError);
            }

            return new Response(JSON.stringify({
                data: metricsData,
                cached: false
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Admin metrics error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_METRICS_FAILED',
                message: error.message
            }
        };

        const statusCode = error.message.includes('Admin access required') ? 403 :
                          error.message.includes('Authentication') ? 401 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});