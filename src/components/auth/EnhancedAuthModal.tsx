import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff, User, Mail, Lock, Shield, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { serializeError, handleAndLogError } from '@/utils/errorFormatting'

interface EnhancedAuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

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

interface RateLimitResponse {
  allowed: boolean
  attemptsRemaining: number
  requiresCaptcha?: boolean
  resetTime?: string
}

export function EnhancedAuthModal({ isOpen, onClose, initialMode = 'login' }: EnhancedAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requiresCaptcha, setRequiresCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  
  const { signIn, signUp, resetPassword } = useAuth()
  const { theme } = useTheme()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  })

  // Enhanced password validation
  const validatePassword = async (password: string) => {
    if (!password || password.length === 0) {
      setPasswordValidation(null)
      return
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-auth-security', {
        body: {
          action: 'validate_password',
          password
        }
      })
      
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

  // Log authentication attempt
  const logAuthAttempt = async (success: boolean, action: string, failureReason?: string) => {
    try {
      await supabase.functions.invoke('enhanced-auth-security', {
        body: {
          action: 'log_auth_attempt',
          success,
          logAction: action,
          failureReason
        }
      })
    } catch (error) {
      console.error('Failed to log auth attempt:', error)
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

  const [captchaChallenge, setCaptchaChallenge] = useState('')

  useEffect(() => {
    if (requiresCaptcha) {
      setCaptchaChallenge(generateCaptcha())
    }
  }, [requiresCaptcha])

  // Enhanced Body Scroll Lock Effect
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.classList.add('modal-open')
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('modal-open')
      const scrollY = document.body.style.top
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
    
    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen])

  // Validate password on change for registration
  useEffect(() => {
    if (mode === 'register' && formData.password) {
      const debounceTimer = setTimeout(() => {
        validatePassword(formData.password)
      }, 500)
      
      return () => clearTimeout(debounceTimer)
    }
  }, [formData.password, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        // Check rate limit before attempting login
        const rateLimitOk = await checkRateLimit()
        if (!rateLimitOk) {
          setLoading(false)
          return
        }
        
        try {
          await signIn(formData.email, formData.password)
          await logAuthAttempt(true, 'login_attempt')
          toast.success('Welcome back!')
          onClose()
        } catch (error: any) {
          await logAuthAttempt(false, 'login_attempt', error.message)
          throw error
        }
        
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
        
        try {
          await signUp(formData.email, formData.password, formData.fullName)
          await logAuthAttempt(true, 'signup_attempt')
          toast.success('Account created! Please check your email to verify.')
          setMode('login')
        } catch (error: any) {
          await logAuthAttempt(false, 'signup_attempt', error.message)
          throw error
        }
        
      } else if (mode === 'forgot') {
        try {
          await resetPassword(formData.email)
          await logAuthAttempt(true, 'password_reset')
          toast.success('Password reset email sent!')
          setMode('login')
        } catch (error: any) {
          await logAuthAttempt(false, 'password_reset', error.message)
          throw error
        }
      }
    } catch (error) {
      // Error handling is done in the auth context and above
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
    setRequiresCaptcha(false)
    setAttemptsRemaining(null)
    setCaptchaToken('')
    setPasswordValidation(null)
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop bg-black bg-opacity-50">
      <div className={`modal-content bg-theme-modal border border-theme-light rounded-lg shadow-xl w-full max-w-[calc(100vw-1rem)] sm:max-w-sm md:max-w-md mx-auto my-auto relative ${theme} safe-area-inset`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-theme-tertiary hover:text-theme-secondary text-xl z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-theme-secondary transition-colors touch-manipulation"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="p-4 sm:p-5 md:p-6">
          {/* Header */}
          <div className="text-center mb-5 md:mb-6">
            <div className="flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
              <h2 className="text-xl md:text-2xl font-bold text-theme-primary">
                {mode === 'login' && 'Secure Sign In'}
                {mode === 'register' && 'Create Secure Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>
            </div>
            
            {attemptsRemaining !== null && attemptsRemaining < 3 && (
              <div className="flex items-center justify-center mb-2 text-orange-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  {attemptsRemaining} attempts remaining
                </span>
              </div>
            )}
            
            <p className="text-theme-secondary text-sm md:text-base">
              {mode === 'login' && 'Enhanced security with rate limiting'}
              {mode === 'register' && 'Strong password requirements for security'}
              {mode === 'forgot' && 'Enter your email to reset password'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required={mode === 'register'}
                    className="form-input w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Password
                  {mode === 'register' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="form-input w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary hover:text-theme-secondary min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {mode === 'register' && passwordValidation && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">
                      Password Requirements:
                    </div>
                    <div className="space-y-1 text-xs">
                      {passwordValidation.errors.map((error, index) => (
                        <div key={index} className="flex items-center text-red-600">
                          <span className="mr-2">×</span>
                          {error}
                        </div>
                      ))}
                      {passwordValidation.valid && (
                        <div className="flex items-center text-green-600">
                          <span className="mr-2">✓</span>
                          All requirements met
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-theme-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={mode === 'register'}
                    className="form-input w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {/* CAPTCHA */}
            {requiresCaptcha && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Security Verification
                </label>
                <div className="bg-gray-100 p-3 rounded border mb-2 text-center font-mono text-lg tracking-wider">
                  {captchaChallenge}
                </div>
                <input
                  type="text"
                  value={captchaToken}
                  onChange={(e) => setCaptchaToken(e.target.value)}
                  placeholder="Enter the characters above"
                  className="form-input w-full py-3 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] touch-manipulation"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCaptchaChallenge(generateCaptcha())}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Refresh CAPTCHA
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !passwordValidation?.valid)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition duration-200 disabled:opacity-50 text-base min-h-[44px] touch-manipulation"
            >
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Sign In Securely' :
                mode === 'register' ? 'Create Secure Account' : 'Send Reset Email'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-5 md:mt-6 text-center">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => switchMode('forgot')}
                  className="text-gray-600 hover:text-gray-700 text-sm mb-4 block min-h-[44px] w-full flex items-center justify-center touch-manipulation"
                >
                  Forgot your password?
                </button>
                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('register')}
                    className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Sign in
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAuthModal