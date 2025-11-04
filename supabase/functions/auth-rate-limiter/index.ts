/**
 * Auth Rate Limiter Edge Function
 * Implements rate limiting for authentication attempts (5 attempts per 15 minutes)
 * Protects against brute force attacks and abuse
 */

interface RateLimitRequest {
  identifier: string // IP address or email
  action: 'login' | 'magic_link' | 'oauth'
}

interface RateLimitRecord {
  attempts: number
  first_attempt: number
  blocked_until?: number
}

const RATE_LIMITS = {
  login: { max_attempts: 5, window_ms: 15 * 60 * 1000 }, // 5 attempts per 15 min
  magic_link: { max_attempts: 3, window_ms: 60 * 60 * 1000 }, // 3 attempts per hour
  oauth: { max_attempts: 10, window_ms: 60 * 60 * 1000 }, // 10 attempts per hour
}

const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// In-memory store (in production, use Supabase or Redis)
const rateLimitStore = new Map<string, RateLimitRecord>()

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { identifier, action }: RateLimitRequest = await req.json()

    if (!identifier || !action) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: identifier and action',
          allowed: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const key = `${action}:${identifier}`
    const now = Date.now()
    const limit = RATE_LIMITS[action]

    // Get or initialize rate limit record
    let record = rateLimitStore.get(key)
    
    if (!record) {
      record = {
        attempts: 0,
        first_attempt: now,
      }
    }

    // Check if currently blocked
    if (record.blocked_until && now < record.blocked_until) {
      const remainingMs = record.blocked_until - now
      const remainingMinutes = Math.ceil(remainingMs / 60000)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          error: 'Rate limit exceeded',
          message: `Too many attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
          blocked_until: record.blocked_until,
          retry_after: remainingMs,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(remainingMs / 1000)),
          } 
        }
      )
    }

    // Check if time window has expired
    if (now - record.first_attempt > limit.window_ms) {
      // Reset counter for new window
      record = {
        attempts: 1,
        first_attempt: now,
      }
      rateLimitStore.set(key, record)
      
      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: limit.max_attempts - 1,
          reset_at: now + limit.window_ms,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment attempts
    record.attempts++

    // Check if limit exceeded
    if (record.attempts > limit.max_attempts) {
      record.blocked_until = now + BLOCK_DURATION_MS
      rateLimitStore.set(key, record)
      
      const remainingMinutes = Math.ceil(BLOCK_DURATION_MS / 60000)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          error: 'Rate limit exceeded',
          message: `Too many attempts. Please try again in ${remainingMinutes} minutes.`,
          blocked_until: record.blocked_until,
          retry_after: BLOCK_DURATION_MS,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(BLOCK_DURATION_MS / 1000),
          } 
        }
      )
    }

    // Update record
    rateLimitStore.set(key, record)

    // Allow request
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: limit.max_attempts - record.attempts,
        reset_at: record.first_attempt + limit.window_ms,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Rate limiter error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        allowed: true, // Fail open for safety
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
