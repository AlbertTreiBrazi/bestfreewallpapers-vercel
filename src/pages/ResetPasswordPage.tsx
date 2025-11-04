import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    password?: string
    confirmPassword?: string
  }>({})

  useEffect(() => {
    const handleRecoveryFlow = async () => {
      try {
        // Check for recovery token in URL hash (format: #access_token=...&type=recovery)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        const recovery_type = hashParams.get('type')
        
        // Also check URL search params as fallback
        const access_token_param = searchParams.get('access_token')
        const refresh_token_param = searchParams.get('refresh_token')
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        if (error) {
          console.error('Recovery flow error:', error, error_description)
          setStatus('error')
          setMessage(error_description || 'Password reset link is invalid or expired')
          return
        }

        const finalAccessToken = access_token || access_token_param
        const finalRefreshToken = refresh_token || refresh_token_param

        if (finalAccessToken && finalRefreshToken && recovery_type === 'recovery') {
          // Set the recovery session
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken
          })

          if (sessionError) {
            console.error('Recovery session error:', sessionError)
            setStatus('error')
            setMessage('Invalid or expired password reset link. Please request a new one.')
            toast.error('Invalid password reset link')
            return
          }

          if (data.user) {
            setStatus('form')
            setMessage('')
            toast.success('Ready to set your new password!')
          } else {
            setStatus('error')
            setMessage('Unable to verify password reset token')
          }
        } else {
          // No valid recovery tokens found
          setStatus('error')
          setMessage('No password reset token found. Please check your email and click the reset link.')
        }
      } catch (error: any) {
        console.error('Recovery flow error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try requesting a new password reset.')
      }
    }

    handleRecoveryFlow()
  }, [searchParams])

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation errors as user types
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Validate form
    const errors: typeof validationErrors = {}
    
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      errors.password = passwordError
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setIsSubmitting(false)
      return
    }

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) {
        console.error('Password update error:', error)
        toast.error(error.message)
        setIsSubmitting(false)
        return
      }

      // Success - password updated
      setStatus('success')
      setMessage('Your password has been successfully updated!')
      toast.success('Password updated successfully!')
      
      // Redirect to login after success
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 3000)

    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error('Failed to update password. Please try again.')
      setIsSubmitting(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/(?=.*[a-z])/.test(password)) strength += 1
    if (/(?=.*[A-Z])/.test(password)) strength += 1
    if (/(?=.*\d)/.test(password)) strength += 1
    if (/(?=.*[!@#$%^&*])/.test(password)) strength += 1
    
    if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' }
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' }
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-gray-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying password reset link...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your request.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Unable to Reset Password
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go to Homepage
              </button>
              <p className="text-sm text-gray-500">
                Need help? Please contact our support team.
              </p>
            </div>
          </div>
        )}

        {status === 'form' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Set New Password
              </h2>
              <p className="text-gray-600">
                Enter your new password below. Make sure it's strong and secure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 pr-10 ${
                      validationErrors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
                
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.level === 'weak' ? 'text-red-600' :
                        passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.color
                        }`}
                        style={{
                          width: `${(getPasswordStrength(formData.password).level === 'weak' ? 33 :
                                   getPasswordStrength(formData.password).level === 'medium' ? 66 : 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 pr-10 ${
                      validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains at least one uppercase letter</li>
                <li>• Contains at least one lowercase letter</li>
                <li>• Contains at least one number</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Password Updated Successfully!
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Homepage
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Redirecting automatically in a few seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage