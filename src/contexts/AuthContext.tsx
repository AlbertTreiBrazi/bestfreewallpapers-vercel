import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authSecurity, RateLimitResult } from '@/utils/authSecurity'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: any | null
  session: Session | null
  loading: boolean
  profileLoading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<any>
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<any>
  refreshProfile: () => Promise<void>
  checkLoginRateLimit: (captchaToken?: string) => Promise<RateLimitResult>
  checkDownloadRateLimit: () => Promise<RateLimitResult>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const isLoggingOutRef = useRef(false)

  // Session caching helper functions
  const getCachedProfile = (userId: string) => {
    try {
      const cacheKey = `profile_${userId}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        // Cache valid for 5 minutes
        const isValid = Date.now() - timestamp < 5 * 60 * 1000
        if (isValid) {
          return data
        }
        // Remove expired cache
        sessionStorage.removeItem(cacheKey)
      }
    } catch (error) {
      console.error('Error reading cached profile:', error)
    }
    return null
  }

  const setCachedProfile = (userId: string, profileData: any) => {
    try {
      const cacheKey = `profile_${userId}`
      const cacheData = {
        data: profileData,
        timestamp: Date.now()
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error caching profile:', error)
    }
  }

  // Load user and profile on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        
        if (session?.user) {
          // Check for cached profile first to prevent flicker
          const cachedProfile = getCachedProfile(session.user.id)
          
          if (cachedProfile) {
            // Use cached profile immediately to prevent flicker
            setProfile(cachedProfile)
            setUser(session.user)
            // Refresh profile silently in background
            loadProfile(session.user.id, true).catch(console.error)
          } else {
            // No cache - load profile before setting user to prevent flicker
            setProfileLoading(true)
            await loadProfile(session.user.id)
            setUser(session.user)
            setProfileLoading(false)
          }
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }
    loadUser()

    // Set up auth listener with logout protection
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session', 'isLoggingOut:', isLoggingOutRef.current)
        
        // If we're in the middle of logging out, ignore ALL auth state changes
        // This prevents session restoration during logout process
        if (isLoggingOutRef.current) {
          console.log('BLOCKED: Ignoring auth state change during logout process')
          return
        }
        
        // Handle sign out events
        if (event === 'SIGNED_OUT' || !session) {
          console.log('Processing SIGNED_OUT event - clearing all state')
          setSession(null)
          setUser(null)
          setProfile(null)
          localStorage.clear()
          sessionStorage.clear()
          return
        }
        
        // Handle sign in events
        if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && session)) {
          console.log('Processing sign in event:', event)
          setSession(session)
          
          // Only load profile for genuine sign-in events
          if (session?.user) {
            // Check for cached profile first
            const cachedProfile = getCachedProfile(session.user.id)
            
            if (cachedProfile) {
              setProfile(cachedProfile)
              setUser(session.user)
              // Refresh silently in background
              loadProfile(session.user.id, true).catch(console.error)
            } else {
              setProfileLoading(true)
              loadProfile(session.user.id).then(() => {
                setUser(session.user)
                setProfileLoading(false)
              }).catch(error => {
                console.error('Profile load error:', error)
                setUser(session.user) // Set user even if profile fails
                setProfileLoading(false)
              })
            }
          }
          return
        }
        
        // Handle initial session loading
        if (event === 'INITIAL_SESSION') {
          console.log('Processing initial session')
          setSession(session)
          
          if (session?.user) {
            const cachedProfile = getCachedProfile(session.user.id)
            
            if (cachedProfile) {
              setProfile(cachedProfile)
              setUser(session.user)
              loadProfile(session.user.id, true).catch(console.error)
            } else {
              setProfileLoading(true)
              loadProfile(session.user.id).then(() => {
                setUser(session.user)
                setProfileLoading(false)
              }).catch(error => {
                console.error('Profile load error:', error)
                setUser(session.user)
                setProfileLoading(false)
              })
            }
          } else {
            setUser(null)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string, silent = false) {
    try {
      // First try to get existing profile directly from database
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (existingProfile && !profileError) {
        if (!silent) {
          setProfile(existingProfile)
        } else {
          // Silent update - only update if data has changed
          setProfile(prev => {
            const hasChanged = JSON.stringify(prev) !== JSON.stringify(existingProfile)
            return hasChanged ? existingProfile : prev
          })
        }
        // Cache the profile
        setCachedProfile(userId, existingProfile)
        return
      }
      
      // If no profile exists, try to create one via edge function
      const { data, error } = await supabase.functions.invoke('user-profile', {
        method: 'GET'
      })

      if (error) {
        console.error('Error loading profile via edge function:', error)
        // If edge function fails, try to get from database again
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (fallbackProfile) {
          if (!silent) {
            setProfile(fallbackProfile)
          } else {
            setProfile(prev => {
              const hasChanged = JSON.stringify(prev) !== JSON.stringify(fallbackProfile)
              return hasChanged ? fallbackProfile : prev
            })
          }
          setCachedProfile(userId, fallbackProfile)
        }
        return
      }

      if (!silent) {
        setProfile(data.data)
      } else {
        setProfile(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(data.data)
          return hasChanged ? data.data : prev
        })
      }
      setCachedProfile(userId, data.data)
    } catch (error) {
      console.error('Error in loadProfile:', error)
      // Final fallback - try direct database query
      try {
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (fallbackProfile) {
          if (!silent) {
            setProfile(fallbackProfile)
          } else {
            setProfile(prev => {
              const hasChanged = JSON.stringify(prev) !== JSON.stringify(fallbackProfile)
              return hasChanged ? fallbackProfile : prev
            })
          }
          setCachedProfile(userId, fallbackProfile)
        }
      } catch (fallbackError) {
        console.error('Fallback profile load failed:', fallbackError)
      }
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    let userId: string | undefined = undefined;
    
    try {
      // Validate password with enhanced security
      const passwordValidation = await authSecurity.validatePassword(password);
      
      if (!passwordValidation.valid) {
        const errorMessage = passwordValidation.errors.join('. ');
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Get the current hostname from the deployment
      const redirectUrl = window.location.hostname.includes('minimax.io') || window.location.hostname.includes('bestfreewallpapers.com') 
        ? `https://${window.location.hostname}/auth/callback`
        : `${window.location.origin}/auth/callback`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: redirectUrl
        }
      })

      if (error) {
        toast.error(error.message)
        
        // Log failed signup attempt
        await authSecurity.logAuthAttempt({
          userId,
          action: 'signup_attempt',
          success: false,
          failureReason: error.message
        });
        
        throw error
      }

      userId = data.user?.id;

      // Log successful signup attempt
      await authSecurity.logAuthAttempt({
        userId,
        action: 'signup_attempt',
        success: true
      });

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Please check your email to confirm your account before signing in')
      }

      return data
    } catch (error: any) {
      // Log failed signup attempt if not already logged
      if (userId === undefined) {
        await authSecurity.logAuthAttempt({
          action: 'signup_attempt',
          success: false,
          failureReason: error.message || 'Unknown error'
        });
      }
      throw error;
    }
  }

  async function signIn(email: string, password: string, captchaToken?: string) {
    let userId: string | undefined = undefined;
    
    try {
      // Check rate limiting before attempting sign in
      const rateLimitResult = await authSecurity.checkLoginRateLimit(captchaToken);
      
      if (!rateLimitResult.allowed) {
        const errorMessage = rateLimitResult.resetTime 
          ? `Too many login attempts. Please try again after ${new Date(rateLimitResult.resetTime).toLocaleTimeString()}`
          : 'Too many login attempts. Please try again later.';
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      if (rateLimitResult.requiresCaptcha && !captchaToken) {
        const errorMessage = 'CAPTCHA verification required due to multiple failed attempts';
        toast.error(errorMessage);
        
        const error = new Error(errorMessage) as any;
        error.requiresCaptcha = true;
        error.attemptsRemaining = rateLimitResult.attemptsRemaining;
        throw error;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        toast.error(error.message)
        
        // Log failed login attempt
        await authSecurity.logAuthAttempt({
          userId,
          action: 'login_attempt',
          success: false,
          failureReason: error.message
        });
        
        throw error
      }

      userId = data.user?.id;

      // Log successful login attempt
      await authSecurity.logAuthAttempt({
        userId,
        action: 'login_attempt',
        success: true
      });

      toast.success('Welcome back!')
      return data
    } catch (error: any) {
      // Log failed login attempt if not already logged
      if (userId === undefined && !error.requiresCaptcha) {
        await authSecurity.logAuthAttempt({
          action: 'login_attempt',
          success: false,
          failureReason: error.message || 'Unknown error'
        });
      }
      throw error;
    }
  }

  async function signOut() {
    try {
      console.log('Starting logout process... Current user:', user?.email, 'Profile:', profile?.plan_type)
      
      // Set logout flag FIRST using ref to avoid closure issues
      isLoggingOutRef.current = true
      console.log('LOGOUT FLAG SET:', isLoggingOutRef.current)
      
      // Clear browser storage immediately (including profile cache)
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear all local state immediately
      setUser(null)
      setProfile(null)
      setSession(null)
      setProfileLoading(false)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Supabase logout error:', error)
        // Continue with logout process even if Supabase fails
      }
      
      console.log('Logout process completed, forcing page reload...')
      
      // Add delay to ensure all auth events are processed with the logout flag
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Force complete page reload to ensure clean state
      window.location.replace('/')
      
    } catch (error: any) {
      console.error('Critical sign out error:', error)
      
      // Force logout even if there's a critical error
      isLoggingOutRef.current = true
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      setProfile(null)
      setSession(null)
      setProfileLoading(false)
      
      // Force reload even on error
      window.location.replace('/')
    }
  }

  async function resetPassword(email: string) {
    try {
      // Get the current hostname from the deployment
      const redirectUrl = window.location.hostname.includes('minimax.io') || window.location.hostname.includes('bestfreewallpapers.com') 
        ? `https://${window.location.hostname}/reset-password`
        : `${window.location.origin}/reset-password`

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) {
        toast.error(error.message)
        
        // Log failed password reset attempt
        await authSecurity.logAuthAttempt({
          action: 'password_reset',
          success: false,
          failureReason: error.message
        });
        
        throw error
      }

      // Log successful password reset attempt
      await authSecurity.logAuthAttempt({
        action: 'password_reset',
        success: true
      });

      toast.success('Password reset email sent!')
      return data
    } catch (error: any) {
      throw error;
    }
  }

  async function checkLoginRateLimit(captchaToken?: string): Promise<RateLimitResult> {
    return await authSecurity.checkLoginRateLimit(captchaToken);
  }

  async function checkDownloadRateLimit(): Promise<RateLimitResult> {
    return await authSecurity.checkDownloadRateLimit();
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    checkLoginRateLimit,
    checkDownloadRateLimit
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}