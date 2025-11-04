import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the tokens from URL parameters
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        if (error) {
          console.error('Auth callback error:', error, error_description)
          setStatus('error')
          setMessage(error_description || 'Authentication failed')
          toast.error(error_description || 'Email verification failed')
          setTimeout(() => navigate('/'), 3000)
          return
        }

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
            toast.error('Failed to complete sign up')
            setTimeout(() => navigate('/'), 3000)
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Email verified successfully! Welcome to BestFreeWallpapers!')
            toast.success('Email verified! Your account is now active.')
            
            // Redirect to home page after success
            setTimeout(() => navigate('/'), 2000)
          } else {
            setStatus('error')
            setMessage('Failed to verify email')
            toast.error('Email verification failed')
            setTimeout(() => navigate('/'), 3000)
          }
        } else {
          // Handle the exchange of the code for tokens
          const { data, error: authError } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          )

          if (authError) {
            console.error('Code exchange error:', authError)
            setStatus('error')
            setMessage('Failed to verify email')
            toast.error('Email verification failed')
            setTimeout(() => navigate('/'), 3000)
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Email verified successfully! Welcome to BestFreeWallpapers!')
            toast.success('Email verified! Your account is now active.')
            setTimeout(() => navigate('/'), 2000)
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
        toast.error('Email verification failed')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <div>
            <Loader2 className="w-16 h-16 text-gray-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying your email...
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your account.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Redirecting you to the homepage...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go to Homepage
              </button>
              <p className="text-xs text-gray-500">
                If you continue to have issues, please contact support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
