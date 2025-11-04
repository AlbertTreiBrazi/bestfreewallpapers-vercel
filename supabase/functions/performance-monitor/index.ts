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

    if (req.method === 'GET') {
      // Fetch performance logs data using direct REST API
      const performanceResponse = await fetch(`${supabaseUrl}/rest/v1/performance_logs?select=*&order=created_at.desc&limit=10`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      const performanceLogs = performanceResponse.ok ? await performanceResponse.json() : [];
      
      // Fetch cache invalidations data
      const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/cache_invalidations?select=*&order=created_at.desc&limit=10`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      const cacheInvalidations = cacheResponse.ok ? await cacheResponse.json() : [];

      // Calculate performance statistics
      const totalLogs = performanceLogs?.length || 0;
      const avgResponseTime = totalLogs > 0 
        ? performanceLogs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / totalLogs
        : 0;
      
      const errorLogs = performanceLogs?.filter(log => log.rating === 'error') || [];
      const errorRate = totalLogs > 0 ? errorLogs.length / totalLogs : 0;
      
      // Calculate cache statistics
      const totalInvalidations = cacheInvalidations?.length || 0;
      const pendingInvalidations = cacheInvalidations?.filter(inv => !inv.processed).length || 0;
      
      // Mock cache hit rate (in real implementation, this would be calculated from actual cache metrics)
      const cacheHitRate = 0.85;

      // Prepare the response data
      const responseData = {
        totalLogs: totalLogs,
        avgResponseTime: avgResponseTime,
        errorRate: errorRate,
        cacheHitRate: cacheHitRate,
        pendingInvalidations: pendingInvalidations,
        totalInvalidations: totalInvalidations,
        recentLogs: (performanceLogs || []).map(log => ({
          id: log.id,
          endpoint: log.query_type || log.url || 'Unknown',
          response_time: log.execution_time_ms || 0,
          status_code: 200,
          error_message: log.rating === 'error' ? 'Error occurred' : null,
          created_at: log.created_at
        })),
        recentInvalidations: (cacheInvalidations || []).map(inv => ({
          id: inv.id.toString(),
          cache_key: inv.path,
          reason: inv.invalidation_type,
          status: inv.processed ? 'processed' : 'pending',
          created_at: inv.created_at
        }))
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    else {
      return new Response(
        JSON.stringify({ 
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only GET method is supported'
          }
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Performance monitor error:', error);
    
    const errorResponse = {
      error: {
        code: 'PERFORMANCE_MONITOR_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
