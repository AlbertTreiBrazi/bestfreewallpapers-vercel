Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('Diagnostic - Environment check:', {
      hasServiceKey: !!serviceRoleKey,
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      serviceKeyLength: serviceRoleKey?.length,
      url: supabaseUrl
    });

    const diagnostics = {
      environment: {
        service_role_key: serviceRoleKey ? `${serviceRoleKey.substring(0, 10)}...` : 'MISSING',
        supabase_url: supabaseUrl || 'MISSING',
        anon_key: anonKey ? `${anonKey.substring(0, 10)}...` : 'MISSING'
      },
      bucket_tests: [],
      storage_paths: [],
      auth_tests: []
    };

    // Test 1: List buckets with service role
    try {
      const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      const bucketData = await bucketResponse.json();
      diagnostics.bucket_tests.push({
        test: 'list_buckets_service_role',
        status: bucketResponse.status,
        success: bucketResponse.ok,
        data: bucketData
      });
    } catch (error) {
      diagnostics.bucket_tests.push({
        test: 'list_buckets_service_role',
        error: error.message
      });
    }

    // Test 2: List buckets with anon key
    try {
      const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        }
      });
      
      const bucketData = await bucketResponse.json();
      diagnostics.bucket_tests.push({
        test: 'list_buckets_anon',
        status: bucketResponse.status,
        success: bucketResponse.ok,
        data: bucketData
      });
    } catch (error) {
      diagnostics.bucket_tests.push({
        test: 'list_buckets_anon',
        error: error.message
      });
    }

    // Test 3: Common bucket names
    const commonBuckets = ['wallpapers', 'wallpapers-original', 'images', 'uploads', 'storage'];
    
    for (const bucketName of commonBuckets) {
      try {
        const listResponse = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucketName}`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });
        
        const listData = await listResponse.json();
        diagnostics.storage_paths.push({
          bucket: bucketName,
          test: 'list_objects',
          status: listResponse.status,
          success: listResponse.ok,
          count: Array.isArray(listData) ? listData.length : 0,
          sample: Array.isArray(listData) ? listData.slice(0, 3) : listData
        });
      } catch (error) {
        diagnostics.storage_paths.push({
          bucket: bucketName,
          test: 'list_objects',
          error: error.message
        });
      }
    }

    // Test 4: Try to sign a URL for a test file
    try {
      const signResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/wallpapers-original/test.jpg`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 300 })
      });
      
      const signData = await signResponse.json();
      diagnostics.auth_tests.push({
        test: 'sign_url',
        status: signResponse.status,
        success: signResponse.ok,
        data: signData
      });
    } catch (error) {
      diagnostics.auth_tests.push({
        test: 'sign_url',
        error: error.message
      });
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Storage diagnostic error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});