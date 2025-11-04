// Unified Timer Service - Single Source of Truth for Download Timers
// Eliminates timer logic duplication and ensures consistency across components

export interface TimerSettings {
  guest_timer_duration: number
  logged_in_timer_duration: number
}

// CRITICAL FIX: Correct Default Timer Values
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  guest_timer_duration: 15,    // Guest users: 15 seconds (admin configurable 5-60s)
  logged_in_timer_duration: 6  // Free users: 6 seconds (admin configurable 3-30s)
}

class TimerService {
  private cachedSettings: TimerSettings | null = null
  private lastFetched = 0
  private readonly CACHE_TTL = 30 * 1000 // 30 seconds for immediate admin changes

  /**
   * Get timer duration for specific user type
   * @param userType 'guest' | 'free' | 'premium'
   * @returns Timer duration in seconds
   */
  async getTimerDuration(userType: 'guest' | 'free' | 'premium'): Promise<number> {
    if (userType === 'premium') {
      return 0 // Premium users get instant downloads
    }

    const settings = await this.getTimerSettings()
    return userType === 'guest' 
      ? settings.guest_timer_duration 
      : settings.logged_in_timer_duration
  }

  /**
   * Get all timer settings from admin panel (cached)
   */
  async getTimerSettings(): Promise<TimerSettings> {
    const now = Date.now()
    
    // Return cached settings if still valid
    if (this.cachedSettings && (now - this.lastFetched) < this.CACHE_TTL) {
      return this.cachedSettings
    }

    try {
      // Fetch guest timer settings
      const guestResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'get_guest' })
        }
      )

      // Fetch logged-in timer settings
      const loggedInResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'get_logged_in' })
        }
      )

      let settings = { ...DEFAULT_TIMER_SETTINGS }

      if (guestResponse.ok) {
        const guestData = await guestResponse.json()
        if (guestData.data?.guest_timer_duration) {
          settings.guest_timer_duration = guestData.data.guest_timer_duration
        }
      }

      if (loggedInResponse.ok) {
        const loggedInData = await loggedInResponse.json()
        if (loggedInData.data?.logged_in_timer_duration) {
          settings.logged_in_timer_duration = loggedInData.data.logged_in_timer_duration
        }
      }

      // Cache the settings
      this.cachedSettings = settings
      this.lastFetched = now

      console.log('TimerService: Loaded settings from admin panel:', settings)
      console.log('TIMER_DEBUG: Admin values applied:', {
        guest_timer: settings.guest_timer_duration,
        free_timer: settings.logged_in_timer_duration,
        cache_age: (now - this.lastFetched) / 1000 + 's'
      })
      return settings
    } catch (error) {
      console.error('TimerService: Failed to load admin settings, using defaults:', error)
      return DEFAULT_TIMER_SETTINGS
    }
  }

  /**
   * Clear cache to force refresh on next request
   * CRITICAL: Call this whenever admin saves timer settings
   */
  clearCache(): void {
    this.cachedSettings = null
    this.lastFetched = 0
    console.log('TimerService: Cache cleared, will fetch fresh admin settings')
  }

  /**
   * Force immediate refresh of timer settings
   */
  async refreshSettings(): Promise<TimerSettings> {
    this.clearCache()
    return this.getTimerSettings()
  }

  /**
   * Determine user type from auth context
   */
  getUserType(user: any, profile: any): 'guest' | 'free' | 'premium' {
    if (!user) {
      return 'guest'
    }

    const isPremium = profile?.plan_type === 'premium' && 
                     (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

    return isPremium ? 'premium' : 'free'
  }
}

// Export singleton instance
export const timerService = new TimerService()
export default timerService
