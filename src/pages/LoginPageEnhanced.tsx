import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Chrome, Facebook, Loader2, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { FEATURE_FLAGS, AUTH_CONFIG, isFeatureEnabled } from '@/config/features'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

type EmailAuthMode = 'password' | 'magic-link' | null

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signIn, resetPassword } = useAuth()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<'google' | 'facebook' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileFailed, setTurnstileFailed] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
  } | null>(null)

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password strength validation
  const validatePasswordStrength = (pwd: string): { score: number; feedback: string[] } => {
    if (!isFeatureEnabled('AUTH_PASSWORD_VALIDATION')) {
      return { score: 100, feedback: [] }
    }

    const feedback: string[] = []
    let score = 0

    // Length check (most important)
    if (pwd.length >= AUTH_CONFIG.PASSWORD.MIN_LENGTH) {
      score += 40  // Increased weight for length
    } else {
      feedback.push(`At least ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} characters required`)
    }

    // Uppercase check
    if (AUTH_CONFIG.PASSWORD.REQUIRE_UPPERCASE && /[A-Z]/.test(pwd)) {
      score += 20
    } else if (AUTH_CONFIG.PASSWORD.REQUIRE_UPPERCASE) {
      feedback.push('Include at least one uppercase letter')
    }

    // Lowercase check
    if (AUTH_CONFIG.PASSWORD.REQUIRE_LOWERCASE && /[a-z]/.test(pwd)) {
      score += 20
    } else if (AUTH_CONFIG.PASSWORD.REQUIRE_LOWERCASE) {
      feedback.push('Include at least one lowercase letter')
    }

    // Number check
    if (AUTH_CONFIG.PASSWORD.REQUIRE_NUMBER && /\d/.test(pwd)) {
      score += 20
    } else if (AUTH_CONFIG.PASSWORD.REQUIRE_NUMBER) {
      feedback.push('Include at least one number')
    }

    // Common password check
    if (AUTH_CONFIG.PASSWORD.COMMON_PASSWORDS.some(common => pwd.toLowerCase().includes(common))) {
      score = Math.max(0, score - 30)
      feedback.push('Password is too common. Try adding numbers, symbols, or making it longer (16+ characters)')
    }

    return { score, feedback }
  }

  // Update password strength on password change
  useEffect(() => {
    if (password && emailAuthMode === 'password' && isFeatureEnabled('AUTH_PASSWORD_VALIDATION')) {
      const strength = validatePasswordStrength(password)
      setPasswordStrength(strength)
      console.log('Password strength updated:', { password: password.substring(0, 3) + '***', score: strength.score, feedback: strength.feedback })
    } else if (emailAuthMode === 'password' && !isFeatureEnabled('AUTH_PASSWORD_VALIDATION')) {
      // If validation is disabled, set score to 100 so button is enabled
      setPasswordStrength({ score: 100, feedback: [] })
    } else {
      setPasswordStrength(null)
    }
  }, [password, emailAuthMode])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, searchParams])

  // Load Cloudflare Turnstile (only for Magic Link mode)
  useEffect(() => {
    if (!isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED') || emailAuthMode !== 'magic-link') {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    const timeout = setTimeout(() => {
      if (!turnstileLoaded) {
        console.warn('Turnstile failed to load - allowing auth without CAPTCHA')
        setTurnstileFailed(true)
      }
    }, AUTH_CONFIG.TURNSTILE.TIMEOUT_MS)
    
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
  }, [emailAuthMode])

  // Render Turnstile widget
  const renderTurnstile = () => {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      const container = document.getElementById('turnstile-container')
      if (container && container.children.length === 0) {
        try {
          (window as any).turnstile.render('#turnstile-container', {
            sitekey: AUTH_CONFIG.TURNSTILE.SITE_KEY,
            callback: (token: string) => {
              setTurnstileToken(token)
              setTurnstileFailed(false)
            },
            'error-callback': () => {
              console.error('Turnstile verification failed')
              setTurnstileToken(null)
              if (AUTH_CONFIG.TURNSTILE.FALLBACK_ENABLED) {
                setTimeout(() => setTurnstileFailed(true), 3000)
              }
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
    if (turnstileLoaded && !emailSent && emailAuthMode === 'magic-link') {
      renderTurnstile()
    }
  }, [turnstileLoaded, emailSent, emailAuthMode])

  // Handle OAuth sign in
  const handleOAuthSignIn = async (oauthProvider: 'google' | 'facebook') => {
    if (!isFeatureEnabled(`AUTH_OAUTH_${oauthProvider.toUpperCase()}` as any)) {
      toast.error(`${oauthProvider} authentication is currently disabled`)
      return
    }

    setLoading(true)
    setProvider(oauthProvider)

    try {
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
    } catch (error: any) {
      console.error('OAuth error:', error)
      toast.error(error.message || 'Failed to sign in. Please try again.')
      setLoading(false)
      setProvider(null)
    }
  }

  // Handle Email + Password sign in
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFeatureEnabled('AUTH_EMAIL_PASSWORD')) {
      toast.error('Email+password authentication is currently disabled')
      return
    }
    
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check password strength
    if (isFeatureEnabled('AUTH_PASSWORD_VALIDATION')) {
      const strength = validatePasswordStrength(password)
      if (strength.score < 60) {
        toast.error('Password does not meet security requirements')
        return
      }
    }

    setLoading(true)
    setProvider('email')

    try {
      const redirectUrl = searchParams.get('redirect') || '/'
      sessionStorage.setItem('auth_redirect_url', redirectUrl)
      
      await signIn(email, password)
      
      // Navigate to redirect URL
      navigate(redirectUrl, { replace: true })
    } catch (error: any) {
      console.error('Password sign in error:', error)
      toast.error(error.message || 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }

  // Handle Magic Link sign in
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) {
      toast.error('Magic link authentication is currently disabled')
      return
    }
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
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

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFeatureEnabled('AUTH_FORGOT_PASSWORD')) {
      toast.error('Password reset is currently disabled')
      return
    }
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      await resetPassword(email)
      setPasswordResetSent(true)
      toast.success('Password reset email sent!')
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to send password reset email.')
    } finally {
      setLoading(false)
    }
  }

  // Handle resend magic link
  const handleResendMagicLink = async () => {
    setEmailSent(false)
    setTurnstileToken(null)
    setTurnstileFailed(false)
    
    if ((window as any).turnstile) {
      const container = document.getElementById('turnstile-container')
      if (container) {
        container.innerHTML = ''
        renderTurnstile()
      }
    }
  }

  // Password reset sent state
  if (passwordResetSent) {
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
              We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
            
            <button
              onClick={() => {
                setPasswordResetSent(false)
                setShowForgotPassword(false)
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Magic link sent state
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

  // Forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reset Password
            </h1>
            <p className="text-gray-600">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isValidEmail(email)}
                className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <button
              onClick={() => setShowForgotPassword(false)}
              className="mt-6 w-full text-center text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Back to login
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
          {(isFeatureEnabled('AUTH_OAUTH_GOOGLE') || isFeatureEnabled('AUTH_OAUTH_FACEBOOK')) && (
            <form className="space-y-3 mb-6" onSubmit={(e) => e.preventDefault()}>
              {isFeatureEnabled('AUTH_OAUTH_GOOGLE') && (
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading && provider === 'google'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  data-testid="google-oauth-button"
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
              )}

              {isFeatureEnabled('AUTH_OAUTH_FACEBOOK') && (
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('facebook')}
                  disabled={loading && provider === 'facebook'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  data-testid="facebook-oauth-button"
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
              )}
            </form>
          )}

          {/* Divider */}
          {(isFeatureEnabled('AUTH_EMAIL_PASSWORD') || isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
          )}

          {/* Expandable Email Section */}
          {(isFeatureEnabled('AUTH_EMAIL_PASSWORD') || isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED')) && (
            <div className="space-y-4">
              {/* Email Expand Button */}
              <button
                onClick={() => setEmailExpanded(!emailExpanded)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-700">
                  Continue with Email
                </span>
                {emailExpanded ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>

              {/* Expanded Email Options */}
              {emailExpanded && (
                <div className="space-y-4 border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* Email Input (shared) */}
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white"
                      />
                    </div>
                  </div>

                  {/* Auth Mode Selection */}
                  {!emailAuthMode && (
                    <div className="space-y-3">
                      {/* Password Option */}
                      {isFeatureEnabled('AUTH_EMAIL_PASSWORD') && (
                        <button
                          onClick={() => setEmailAuthMode('password')}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer"
                        >
                          <Lock className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-700">
                            Sign in with Password
                          </span>
                        </button>
                      )}

                      {/* Magic Link Option */}
                      {isFeatureEnabled('AUTH_EMAIL_OTP_ENHANCED') && (
                        <button
                          onClick={() => setEmailAuthMode('magic-link')}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer"
                        >
                          <Mail className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-700">
                            Get Magic Link
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Password Form */}
                  {emailAuthMode === 'password' && (
                    <form onSubmit={handlePasswordSignIn} className="space-y-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            data-testid="password-toggle"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Password Strength Indicator */}
                      {passwordStrength && password.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  passwordStrength.score >= 70
                                    ? 'bg-green-500'
                                    : passwordStrength.score >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${passwordStrength.score}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600">
                              {passwordStrength.score >= 70
                                ? 'Strong'
                                : passwordStrength.score >= 50
                                ? 'Medium'
                                : 'Weak'}
                            </span>
                          </div>
                          {passwordStrength.feedback.length > 0 && (
                            <ul className="text-xs text-gray-600 space-y-1">
                              {passwordStrength.feedback.map((msg, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="text-red-500">•</span> {msg}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode(null)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          ← Back
                        </button>
                        {isFeatureEnabled('AUTH_FORGOT_PASSWORD') && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotPassword(true)
                              setEmailExpanded(false)
                              setEmailAuthMode(null)
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !isValidEmail(email) || !password || (isFeatureEnabled('AUTH_PASSWORD_VALIDATION') && (!passwordStrength || passwordStrength.score < 60))}
                        className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        data-testid="password-submit"
                      >
                        {loading && provider === 'email' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign in'
                        )}
                      </button>
                    </form>
                  )}

                  {/* Magic Link Form */}
                  {emailAuthMode === 'magic-link' && (
                    <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                      {/* Cloudflare Turnstile */}
                      <div className="w-full" style={{ display: 'block', visibility: 'visible' }}>
                        <div className="flex justify-center min-h-[65px] w-full" style={{ display: 'flex', visibility: 'visible' }}>
                          <div id="turnstile-container" className="w-full flex justify-center" style={{ display: 'block', visibility: 'visible', minHeight: '65px' }}></div>
                        </div>
                        
                        {!turnstileLoaded && !turnstileFailed && (
                          <div className="text-sm text-gray-500 text-center mt-2">
                            Loading security verification...
                          </div>
                        )}
                        
                        {turnstileFailed && !emailSent && (
                          <div className="text-sm text-gray-600 text-center mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            Quick security check couldn't load. You can continue.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setEmailAuthMode(null)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          ← Back
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || (!turnstileFailed && turnstileLoaded && !turnstileToken) || !isValidEmail(email)}
                        className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  )}
                </div>
              )}
            </div>
          )}

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
