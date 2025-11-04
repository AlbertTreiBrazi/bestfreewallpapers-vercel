import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SEOHead } from '@/components/seo/SEOHead'
import toast from 'react-hot-toast'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { theme } = useTheme()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the redirect URL from sessionStorage (set during login)
        const redirectUrl = sessionStorage.getItem('auth_redirect_url') || '/'
        
        // Check for error parameters first
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        if (error) {
          console.error('Auth callback error:', error, error_description)
          setStatus('error')
          setMessage(error_description || 'Authentication failed')
          toast.error(error_description || 'Email verification failed')
          // Clear stored redirect on error
          sessionStorage.removeItem('auth_redirect_url')
          setTimeout(() => navigate('/'), 5000)
          return
        }

        // Check for direct token parameters
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        if (access_token && refresh_token) {
          // Set the session with the tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setStatus('error')
            setMessage('Failed to establish session')
            toast.error('Failed to complete authentication')
            sessionStorage.removeItem('auth_redirect_url')
            setTimeout(() => navigate('/'), 5000)
            return
          }

          if (data.user) {
            if (type === 'recovery') {
              setStatus('success')
              setMessage('Password reset successful! You can now change your password.')
              toast.success('Password reset successful!')
              sessionStorage.removeItem('auth_redirect_url')
              setTimeout(() => navigate('/'), 3000)
            } else {
              setStatus('success')
              setMessage('Authentication successful! Redirecting you back...')
              toast.success('Successfully authenticated!')
              sessionStorage.removeItem('auth_redirect_url')
              setTimeout(() => navigate(redirectUrl, { replace: true }), 2000)
            }
          } else {
            setStatus('error')
            setMessage('Failed to authenticate user')
            toast.error('Authentication failed')
            sessionStorage.removeItem('auth_redirect_url')
            setTimeout(() => navigate('/'), 5000)
          }
        } else {
          // Handle PKCE flow - exchange the code for tokens
          try {
            const { data, error: authError } = await supabase.auth.exchangeCodeForSession(
              window.location.href
            )

            if (authError) {
              console.error('Code exchange error:', authError)
              setStatus('error')
              setMessage('Failed to verify email')
              toast.error('Email verification failed')
              sessionStorage.removeItem('auth_redirect_url')
              setTimeout(() => navigate('/'), 5000)
              return
            }

            if (data.user) {
              setStatus('success')
              setMessage('Authentication successful! Redirecting you back...')
              toast.success('Successfully authenticated!')
              sessionStorage.removeItem('auth_redirect_url')
              setTimeout(() => navigate(redirectUrl, { replace: true }), 2000)
            } else {
              setStatus('error')
              setMessage('No user data received')
              toast.error('Authentication failed')
              sessionStorage.removeItem('auth_redirect_url')
              setTimeout(() => navigate('/'), 5000)
            }
          } catch (exchangeError) {
            console.error('Exchange error:', exchangeError)
            setStatus('error')
            setMessage('Failed to process authentication')
            toast.error('Authentication processing failed')
            sessionStorage.removeItem('auth_redirect_url')
            setTimeout(() => navigate('/'), 5000)
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
        toast.error('Authentication failed')
        sessionStorage.removeItem('auth_redirect_url')
        setTimeout(() => navigate('/'), 5000)
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate])

  const seoConfig = {
    title: 'Authenticating - Best Free Wallpapers',
    description: 'Processing your authentication request for Best Free Wallpapers.',
    keywords: ['authentication', 'email verification', 'best free wallpapers']
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'
    } transition-colors duration-200 flex items-center justify-center p-4`}>
      <SEOHead config={seoConfig} />
      
      <div className={`max-w-md w-full ${
        theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'
      } border rounded-lg shadow-lg p-8 text-center transition-colors duration-200`}>
        {status === 'loading' && (
          <div>
            <Loader2 className={`w-16 h-16 mx-auto mb-4 animate-spin ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } transition-colors duration-200`}>
              Processing authentication...
            </h2>
            <p className={`${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            } transition-colors duration-200`}>
              Please wait while we verify your request.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } transition-colors duration-200`}>
              Success!
            </h2>
            <p className={`mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            } transition-colors duration-200`}>
              {message}
            </p>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            } transition-colors duration-200`}>
              Redirecting you back to where you were...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } transition-colors duration-200`}>
              Authentication Failed
            </h2>
            <p className={`mb-6 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            } transition-colors duration-200`}>
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-gray-600 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-gray-700 hover:to-blue-700 transition-colors duration-200"
              >
                Return to Home
              </button>
              <button
                onClick={() => navigate('/auth')}
                className={`w-full py-2 px-4 rounded-lg border transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'border-dark-border text-gray-300 hover:bg-dark-tertiary'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage
