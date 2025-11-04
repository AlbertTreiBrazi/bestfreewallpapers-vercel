import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Chrome, Facebook, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signIn } = useAuth()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<'google' | 'facebook' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileFailed, setTurnstileFailed] = useState(false)

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, searchParams])

  // Load Cloudflare Turnstile
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    // Set timeout to mark Turnstile as failed if it doesn't load in 5 seconds
    const timeout = setTimeout(() => {
      if (!turnstileLoaded) {
        console.warn('Turnstile failed to load - allowing auth without CAPTCHA')
        setTurnstileFailed(true)
      }
    }, 5000)
    
    script.onload = () => {
      clearTimeout(timeout)
      setTurnstileLoaded(true)
      renderTurnstile()
    }
    
    script.onerror = () => {
      clearTimeout(timeout)
      console.error('Turnstile script failed to load')
      setTurnstileFailed(true)
    }
    
    document.body.appendChild(script)
    
    return () => {
      clearTimeout(timeout)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Render Turnstile widget
  const renderTurnstile = () => {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      const container = document.getElementById('turnstile-container')
      if (container && container.children.length === 0) {
        try {
          (window as any).turnstile.render('#turnstile-container', {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAAgQvBhEOvUl_pVP', // Cloudflare test key
            callback: (token: string) => {
              setTurnstileToken(token)
              setTurnstileFailed(false)
            },
            'error-callback': () => {
              console.error('Turnstile verification failed')
              setTurnstileToken(null)
              // Mark as failed after 3 seconds to allow user to proceed
              setTimeout(() => setTurnstileFailed(true), 3000)
            },
            'expired-callback': () => {
              setTurnstileToken(null)
            },
            theme: 'light',
            size: 'normal'
          })
        } catch (error) {
          console.error('Turnstile render error:', error)
          setTurnstileFailed(true)
        }
      }
    }
  }

  // Re-render Turnstile when needed
  useEffect(() => {
    if (turnstileLoaded && !emailSent) {
      renderTurnstile()
    }
  }, [turnstileLoaded, emailSent])

  // Check rate limit
  const checkRateLimit = async (action: 'login' | 'magic_link' | 'oauth', identifier: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limiter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action, identifier }),
        }
      )

      const result = await response.json()
      
      if (!result.allowed) {
        throw new Error(result.message || 'Rate limit exceeded. Please try again later.')
      }
      
      return result
    } catch (error: any) {
      throw error
    }
  }

  // Handle OAuth sign in
  const handleOAuthSignIn = async (oauthProvider: 'google' | 'facebook') => {
    setLoading(true)
    setProvider(oauthProvider)

    try {
      // Store redirect URL in sessionStorage for callback
      const redirectUrl = searchParams.get('redirect') || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      const redirectTo = `${window.location.protocol}//${window.location.host}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false
        }
      })

      if (error) throw error

      // The browser will redirect to OAuth provider
      // No need to handle response here
    } catch (error: any) {
      console.error('OAuth error:', error)
      toast.error(error.message || 'Failed to sign in. Please try again.')
      setLoading(false)
      setProvider(null)
    }
  }

  // Handle Magic Link sign in
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    // Check Turnstile only if it loaded successfully
    if (turnstileLoaded && !turnstileFailed && !turnstileToken) {
      toast.error('Please complete the security verification')
      return
    }

    setLoading(true)
    setProvider('email')

    try {
      // Store redirect URL in sessionStorage for callback
      const redirectUrl = searchParams.get('redirect') || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
        }
      })

      if (error) throw error

      setEmailSent(true)
      toast.success('Magic link sent! Check your email.')
    } catch (error: any) {
      console.error('Magic link error:', error)
      toast.error(error.message || 'Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }

  // Handle resend magic link
  const handleResendMagicLink = async () => {
    setEmailSent(false)
    setTurnstileToken(null)
    setTurnstileFailed(false)
    
    // Reset Turnstile
    if ((window as any).turnstile) {
      const container = document.getElementById('turnstile-container')
      if (container) {
        container.innerHTML = ''
        renderTurnstile()
      }
    }
  }

  // Success state after email sent
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h2>
            
            <p className="text-gray-600 mb-6">
              We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
            
            <button
              onClick={handleResendMagicLink}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Resend magic link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to access premium wallpapers and more
          </p>
        </div>

        {/* Error Message */}
        {searchParams.get('error') && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Authentication Error
              </h3>
              <p className="text-sm text-red-700">
                {decodeURIComponent(searchParams.get('error') || 'An error occurred during sign in')}
              </p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading && provider === 'google'}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading && provider === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Chrome className="w-5 h-5 text-blue-600" />
              )}
              <span className="font-medium text-gray-700">
                Continue with Google
              </span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading && provider === 'facebook'}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading && provider === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Facebook className="w-5 h-5 text-blue-600" />
              )}
              <span className="font-medium text-gray-700">
                Continue with Facebook
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Cloudflare Turnstile */}
            <div>
              <div className="flex justify-center">
                <div id="turnstile-container"></div>
              </div>
              
              {/* Turnstile status feedback */}
              {!turnstileLoaded && !turnstileFailed && (
                <div className="text-sm text-gray-500 text-center mt-2">
                  Loading security verification...
                </div>
              )}
              
              {turnstileFailed && (
                <div className="text-sm text-yellow-600 text-center mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  Security verification unavailable. You can proceed without it.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!turnstileFailed && turnstileLoaded && !turnstileToken) || !isValidEmail(email)}
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && provider === 'email' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending magic link...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </form>

          {/* Info Text */}
          <p className="mt-6 text-center text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
