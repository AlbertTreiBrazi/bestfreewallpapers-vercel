// Health Check Edge Function - Phase 3 Priority 3
// System health monitoring and status endpoint

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  services: {
    database: 'healthy' | 'degraded' | 'critical';
    storage: 'healthy' | 'degraded' | 'critical';
    edge_functions: 'healthy' | 'degraded' | 'critical';
    auth: 'healthy' | 'degraded' | 'critical';
  };
  metrics: {
    response_time_ms: number;
    error_rate_24h: number;
    active_users_1h: number;
    storage_usage_mb: number;
  };
  alerts: {
    count: number;
    critical_count: number;
  };
}

// Test database connectivity
async function testDatabase(supabaseUrl: string, serviceKey: string): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/wallpapers?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return 'critical';
    }
    
    // Response time thresholds
    if (responseTime > 5000) return 'critical';
    if (responseTime > 2000) return 'degraded';
    
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'critical';
  }
}

// Test storage connectivity
async function testStorage(supabaseUrl: string, serviceKey: string): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok && response.status !== 404) {
      return 'critical';
    }
    
    if (responseTime > 3000) return 'degraded';
    
    return 'healthy';
  } catch (error) {
    console.error('Storage health check failed:', error);
    return 'degraded'; // Storage issues are less critical
  }
}

// Test auth service
async function testAuth(supabaseUrl: string, anonKey: string): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': anonKey
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok && response.status !== 404) {
      return 'critical';
    }
    
    if (responseTime > 3000) return 'degraded';
    
    return 'healthy';
  } catch (error) {
    console.error('Auth health check failed:', error);
    return 'degraded';
  }
}

// Get error rate for last 24 hours
async function getErrorRate24h(supabaseUrl: string, serviceKey: string): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Get total requests
    const totalResponse = await fetch(
      `${supabaseUrl}/rest/v1/performance_logs?created_at=gte.${twentyFourHoursAgo}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    // Get errors
    const errorResponse = await fetch(
      `${supabaseUrl}/rest/v1/error_logs?created_at=gte.${twentyFourHoursAgo}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    if (totalResponse.ok && errorResponse.ok) {
      const totalRequests = (await totalResponse.json()).length;
      const errorCount = (await errorResponse.json()).length;
      
      return totalRequests > 0 ? errorCount / totalRequests : 0;
    }
  } catch (error) {
    console.error('Failed to calculate error rate:', error);
  }
  
  return 0;
}

// Get active users in last hour
async function getActiveUsers1h(supabaseUrl: string, serviceKey: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.page_view&created_at=gte.${oneHourAgo}&select=user_id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    if (response.ok) {
      const events = await response.json();
      const uniqueUsers = new Set(events.map((e: any) => e.user_id).filter(Boolean));
      return uniqueUsers.size;
    }
  } catch (error) {
    console.error('Failed to get active users:', error);
  }
  
  return 0;
}

// Get active alerts count
async function getActiveAlerts(supabaseUrl: string, serviceKey: string): Promise<{ count: number; critical_count: number }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/performance_alerts?resolved_at=is.null&select=severity`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    if (response.ok) {
      const alerts = await response.json();
      const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length;
      return {
        count: alerts.length,
        critical_count: criticalCount
      };
    }
  } catch (error) {
    console.error('Failed to get active alerts:', error);
  }
  
  return { count: 0, critical_count: 0 };
}

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

  const startTime = Date.now();

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!serviceKey || !supabaseUrl || !anonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Run health checks in parallel
    const [databaseHealth, storageHealth, authHealth, errorRate, activeUsers, alerts] = await Promise.all([
      testDatabase(supabaseUrl, serviceKey),
      testStorage(supabaseUrl, serviceKey),
      testAuth(supabaseUrl, anonKey),
      getErrorRate24h(supabaseUrl, serviceKey),
      getActiveUsers1h(supabaseUrl, serviceKey),
      getActiveAlerts(supabaseUrl, serviceKey)
    ]);

    const responseTime = Date.now() - startTime;

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (databaseHealth === 'critical' || authHealth === 'critical' || alerts.critical_count > 0) {
      overallStatus = 'critical';
    } else if (
      databaseHealth === 'degraded' || 
      storageHealth === 'degraded' || 
      authHealth === 'degraded' ||
      errorRate > 0.05 || 
      responseTime > 3000 ||
      alerts.count > 5
    ) {
      overallStatus = 'degraded';
    }

    const healthData: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        storage: storageHealth,
        edge_functions: 'healthy', // This function is running
        auth: authHealth
      },
      metrics: {
        response_time_ms: responseTime,
        error_rate_24h: errorRate,
        active_users_1h: activeUsers,
        storage_usage_mb: 0 // Could be implemented with storage API
      },
      alerts
    };

    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (overallStatus === 'degraded') httpStatus = 207; // Multi-Status
    if (overallStatus === 'critical') httpStatus = 503; // Service Unavailable

    return new Response(JSON.stringify({
      data: healthData
    }), {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorHealthData: SystemHealth = {
      status: 'critical',
      timestamp: new Date().toISOString(),
      services: {
        database: 'critical',
        storage: 'critical',
        edge_functions: 'critical',
        auth: 'critical'
      },
      metrics: {
        response_time_ms: Date.now() - startTime,
        error_rate_24h: 1.0,
        active_users_1h: 0,
        storage_usage_mb: 0
      },
      alerts: {
        count: 1,
        critical_count: 1
      }
    };

    return new Response(JSON.stringify({
      data: errorHealthData,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'System health check failed'
      }
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
