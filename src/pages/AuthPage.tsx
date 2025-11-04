import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft, Shield, AlertTriangle } from 'lucide-react'
import { SEOHead } from '@/components/seo/SEOHead'
import { supabase } from '@/lib/supabase'
import usePerformanceMonitoring from '@/hooks/usePerformanceMonitoring'
import toast from 'react-hot-toast'

interface PasswordValidation {
  valid: boolean
  errors: string[]
  requirements: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  }
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signIn, signUp, resetPassword } = useAuth()
  const { theme } = useTheme()
  const { measureCustomMetric } = usePerformanceMonitoring()
  
  // Get initial mode from URL params or default to login
  const initialMode = searchParams.get('mode') as 'login' | 'register' | 'forgot' || 'login'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null)
  const [requiresCaptcha, setRequiresCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaChallenge, setCaptchaChallenge] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  })

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  // Update mode when URL params change
  useEffect(() => {
    const urlMode = searchParams.get('mode') as 'login' | 'register' | 'forgot'
    if (urlMode && ['login', 'register', 'forgot'].includes(urlMode)) {
      setMode(urlMode)
    }
  }, [searchParams])

  // Enhanced password validation
  const validatePassword = async (password: string) => {
    if (!password || password.length === 0) {
      setPasswordValidation(null)
      return
    }
    
    const startTime = performance.now()
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-auth-security', {
        body: {
          action: 'validate_password',
          password
        }
      })
      
      measureCustomMetric('password-validation', startTime)
      
      if (error) {
        console.error('Password validation error:', error)
        return
      }
      
      setPasswordValidation(data.data)
    } catch (error) {
      console.error('Password validation failed:', error)
    }
  }

  // Check rate limiting before login
  const checkRateLimit = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-auth-security', {
        body: {
          action: 'check_login_rate_limit',
          email: formData.email,
          captchaToken: requiresCaptcha ? captchaToken : undefined
        }
      })
      
      if (error) {
        if (error.message?.includes('CAPTCHA_REQUIRED')) {
          setRequiresCaptcha(true)
          setAttemptsRemaining(0)
          return false
        }
        if (error.message?.includes('INVALID_CAPTCHA')) {
          toast.error('CAPTCHA verification failed. Please try again.')
          return false
        }
        throw error
      }
      
      setAttemptsRemaining(data.data.attemptsRemaining)
      return data.data.allowed
    } catch (error) {
      console.error('Rate limit check failed:', error)
      return true // Allow if check fails
    }
  }

  // Simple CAPTCHA implementation
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const startTime = performance.now()

    try {
      if (mode === 'login') {
        // Check rate limit before attempting login
        const rateLimitOk = await checkRateLimit()
        if (!rateLimitOk) {
          setLoading(false)
          return
        }
        
        await signIn(formData.email, formData.password)
        measureCustomMetric('auth-login', startTime)
        toast.success('Welcome back!')
        navigate('/')
      } else if (mode === 'register') {
        // Enhanced password validation
        if (!passwordValidation?.valid) {
          toast.error('Please fix password requirements before continuing')
          return
        }
        
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match')
          return
        }
        
        await signUp(formData.email, formData.password, formData.fullName)
        measureCustomMetric('auth-register', startTime)
        toast.success('Account created! Please check your email to verify.')
        setMode('login')
      } else if (mode === 'forgot') {
        await resetPassword(formData.email)
        measureCustomMetric('auth-reset', startTime)
        toast.success('Password reset email sent!')
        setMode('login')
      }
    } catch (error) {
      // Error handling is done in the auth context
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode)
    // Update URL without triggering navigation
    const newParams = new URLSearchParams(searchParams)
    if (newMode === 'login') {
      newParams.delete('mode')
    } else {
      newParams.set('mode', newMode)
    }
    navigate({ search: newParams.toString() }, { replace: true })
  }

  const seoConfig = {
    title: mode === 'login' ? 'Sign In - Best Free Wallpapers' :
           mode === 'register' ? 'Create Account - Best Free Wallpapers' :
           'Reset Password - Best Free Wallpapers',
    description: mode === 'login' ? 'Sign in to access your account and download the best free wallpapers.' :
                mode === 'register' ? 'Create your free account to access premium wallpapers and features.' :
                'Reset your password to regain access to your Best Free Wallpapers account.',
    keywords: ['sign in', 'login', 'register', 'account', 'best free wallpapers']
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} />
      
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Back to Home Button */}
          <div className="flex justify-start">
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center text-sm ${
                theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              } transition-colors duration-200`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </button>
          </div>

          {/* Auth Form Card */}
          <div className={`${
            theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'
          } border rounded-lg shadow-lg p-8 transition-colors duration-200`}>
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              } transition-colors duration-200`}>
                {mode === 'login' && 'Welcome Back'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>
              <p className={`mt-2 text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              } transition-colors duration-200`}>
                {mode === 'login' && 'Sign in to access your account'}
                {mode === 'register' && 'Join to download the best free wallpapers'}
                {mode === 'forgot' && 'Enter your email to reset your password'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } transition-colors duration-200`}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required={mode === 'register'}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'bg-dark-tertiary border-dark-border text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                } transition-colors duration-200`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-dark-tertiary border-dark-border text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } transition-colors duration-200`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'bg-dark-tertiary border-dark-border text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      } transition-colors duration-200`}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } transition-colors duration-200`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={mode === 'register'}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'bg-dark-tertiary border-dark-border text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gray-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-gray-700 hover:to-blue-700 transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Loading...' : (
                  mode === 'login' ? 'Sign In' :
                  mode === 'register' ? 'Create Account' : 'Send Reset Email'
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-3">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => switchMode('forgot')}
                    className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-500'
                    } transition-colors duration-200`}
                  >
                    Forgot your password?
                  </button>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('register')}
                      className={`font-medium ${
                        theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                      } transition-colors duration-200`}
                    >
                      Sign up
                    </button>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <div className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className={`font-medium ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                    } transition-colors duration-200`}
                  >
                    Sign in
                  </button>
                </div>
              )}

              {mode === 'forgot' && (
                <div className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Remember your password?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className={`font-medium ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                    } transition-colors duration-200`}
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
