/**
 * Cloudflare Turnstile Verification Edge Function
 * Verifies Turnstile tokens to prevent bot attacks
 */

interface TurnstileRequest {
  token: string
  remoteip?: string
}

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { token, remoteip }: TurnstileRequest = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing Turnstile token',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Turnstile secret from environment
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    
    if (!turnstileSecret) {
      console.error('TURNSTILE_SECRET_KEY not configured')
      // For development/test: allow if using test key
      if (token.startsWith('XXXX.DUMMY.TOKEN')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Test token accepted (development mode)',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Turnstile not configured',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify token with Cloudflare
    const verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    const verificationData = new FormData()
    verificationData.append('secret', turnstileSecret)
    verificationData.append('response', token)
    if (remoteip) {
      verificationData.append('remoteip', remoteip)
    }

    const verifyResponse = await fetch(verificationUrl, {
      method: 'POST',
      body: verificationData,
    })

    const result: TurnstileResponse = await verifyResponse.json()

    if (!result.success) {
      console.error('Turnstile verification failed:', result['error-codes'])
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Verification failed',
          'error-codes': result['error-codes'],
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verification successful
    return new Response(
      JSON.stringify({
        success: true,
        challenge_ts: result.challenge_ts,
        hostname: result.hostname,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Turnstile verification error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
