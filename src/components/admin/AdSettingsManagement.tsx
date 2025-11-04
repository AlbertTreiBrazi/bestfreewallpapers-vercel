import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Save, Upload, Eye, EyeOff, Users, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { timerService } from '@/services/timerService'
import { cn } from '@/lib/utils'

interface AdSettings {
  id: number
  countdown_duration: number
  ad_title: string
  ad_description: string
  ad_image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface GuestAdSettings {
  id: number
  guest_ad_active: boolean
  guest_timer_duration: number
  guest_ad_content_type: 'image_upload' | 'external_url' | 'html_adsense'
  guest_ad_image_url: string | null
  guest_ad_external_url: string | null
  guest_ad_html_content: string | null
  guest_ad_click_url: string | null
  created_at: string
  updated_at: string
}

interface LoggedInAdSettings {
  id: number
  logged_in_ad_active: boolean
  logged_in_timer_duration: number
  logged_in_ad_content_type: 'image_upload' | 'external_url' | 'html_adsense'
  logged_in_ad_image_url: string | null
  logged_in_ad_external_url: string | null
  logged_in_ad_html_content: string | null
  logged_in_ad_click_url: string | null
  created_at: string
  updated_at: string
}

export function AdSettingsManagement() {
  const { theme } = useTheme()
  const [activeSection, setActiveSection] = useState<'logged_users' | 'guests'>('logged_users')
  const [settings, setSettings] = useState<AdSettings | null>(null)
  const [guestSettings, setGuestSettings] = useState<GuestAdSettings | null>(null)
  const [loggedInSettings, setLoggedInSettings] = useState<LoggedInAdSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGuest, setSavingGuest] = useState(false)
  const [savingLoggedIn, setSavingLoggedIn] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingLoggedInImage, setUploadingLoggedInImage] = useState(false)
  const [formData, setFormData] = useState({
    countdown_duration: 5,
    ad_title: 'Support Us',
    ad_description: 'Please wait while we prepare your download...',
    ad_image_url: '',
    is_active: true
  })
  const [guestFormData, setGuestFormData] = useState({
    guest_ad_active: true,
    guest_timer_duration: 15, // FIXED: Use correct admin panel default (Guest: 15s)
    guest_ad_content_type: 'image_upload' as 'image_upload' | 'external_url' | 'html_adsense',
    guest_ad_image_url: '',
    guest_ad_external_url: '',
    guest_ad_html_content: '',
    guest_ad_click_url: ''
  })
  const [loggedInFormData, setLoggedInFormData] = useState({
    logged_in_ad_active: true,
    logged_in_timer_duration: 6, // FIXED: Use correct admin panel default (Free: 6s)
    logged_in_ad_content_type: 'image_upload' as 'image_upload' | 'external_url' | 'html_adsense',
    logged_in_ad_image_url: '',
    logged_in_ad_external_url: '',
    logged_in_ad_html_content: '',
    logged_in_ad_click_url: ''
  })
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    loadAdSettings()
    loadGuestAdSettings()
    loadLoggedInAdSettings()
  }, [])

  const loadAdSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'get' })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setSettings(result.data)
        setFormData({
          countdown_duration: result.data.countdown_duration,
          ad_title: result.data.ad_title,
          ad_description: result.data.ad_description,
          ad_image_url: result.data.ad_image_url || '',
          is_active: result.data.is_active
        })
      } else {
        toast.error('Failed to load ad settings')
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
      toast.error('Failed to load ad settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update',
            ...formData
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setSettings(result.data)
        toast.success('Ad settings updated successfully')
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to update ad settings')
      }
    } catch (error) {
      console.error('Failed to update ad settings:', error)
      toast.error('Failed to update ad settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const loadGuestAdSettings = async () => {
    try {
      const response = await fetch(
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

      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setGuestSettings(result.data)
          setGuestFormData({
            guest_ad_active: result.data.guest_ad_active,
            guest_timer_duration: result.data.guest_timer_duration,
            guest_ad_content_type: result.data.guest_ad_content_type,
            guest_ad_image_url: result.data.guest_ad_image_url || '',
            guest_ad_external_url: result.data.guest_ad_external_url || '',
            guest_ad_html_content: result.data.guest_ad_html_content || '',
            guest_ad_click_url: result.data.guest_ad_click_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Failed to load guest ad settings:', error)
    }
  }

  const loadLoggedInAdSettings = async () => {
    try {
      const response = await fetch(
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

      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setLoggedInSettings(result.data)
          setLoggedInFormData({
            logged_in_ad_active: result.data.logged_in_ad_active,
            logged_in_timer_duration: result.data.logged_in_timer_duration,
            logged_in_ad_content_type: result.data.logged_in_ad_content_type,
            logged_in_ad_image_url: result.data.logged_in_ad_image_url || '',
            logged_in_ad_external_url: result.data.logged_in_ad_external_url || '',
            logged_in_ad_html_content: result.data.logged_in_ad_html_content || '',
            logged_in_ad_click_url: result.data.logged_in_ad_click_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Failed to load logged-in ad settings:', error)
    }
  }

  const handleGuestInputChange = (field: string, value: any) => {
    setGuestFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLoggedInInputChange = (field: string, value: any) => {
    setLoggedInFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveGuest = async () => {
    setSavingGuest(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_guest',
            ...guestFormData
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setGuestSettings(result.data)
        // CRITICAL FIX: Clear timer cache for immediate effect
        timerService.clearCache()
        toast.success('Guest ad settings updated successfully - Timer changes active immediately')
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to update guest ad settings')
      }
    } catch (error) {
      console.error('Failed to update guest ad settings:', error)
      toast.error('Failed to update guest ad settings')
    } finally {
      setSavingGuest(false)
    }
  }

  const handleSaveLoggedIn = async () => {
    setSavingLoggedIn(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_logged_in',
            ...loggedInFormData
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setLoggedInSettings(result.data)
        // CRITICAL FIX: Clear timer cache for immediate effect
        timerService.clearCache()
        toast.success('Logged-in ad settings updated successfully - Timer changes active immediately')
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to update logged-in ad settings')
      }
    } catch (error) {
      console.error('Failed to update logged-in ad settings:', error)
      toast.error('Failed to update logged-in ad settings')
    } finally {
      setSavingLoggedIn(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-ad-image-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: formData
        }
      )

      if (response.ok) {
        const result = await response.json()
        handleGuestInputChange('guest_ad_image_url', result.data.publicUrl)
        toast.success('Image uploaded successfully')
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleLoggedInImageUpload = async (file: File) => {
    setUploadingLoggedInImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/logged-in-ad-image-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: formData
        }
      )

      if (response.ok) {
        const result = await response.json()
        handleLoggedInInputChange('logged_in_ad_image_url', result.data.publicUrl)
        toast.success('Image uploaded successfully')
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingLoggedInImage(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-300 h-8 w-64 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="border-b border-theme-light">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('logged_users')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'logged_users'
                ? 'border-gray-500 text-gray-600'
                : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-light'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Logged-in Users</span>
          </button>
          <button
            onClick={() => setActiveSection('guests')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'guests'
                ? 'border-gray-500 text-gray-600'
                : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-light'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guest Users</span>
          </button>
        </nav>
      </div>

      {/* Logged-in Users Section */}
      {activeSection === 'logged_users' && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-theme-primary">
              Logged-in Non-Premium Users Ad Configuration
            </h3>
            <button
              onClick={handleSaveLoggedIn}
              disabled={savingLoggedIn}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingLoggedIn ? 'Saving...' : 'Save Logged-in Settings'}</span>
            </button>
          </div>

          <div className="bg-theme-surface border border-theme-light rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-theme-primary mb-4">
              Logged-in Non-Premium User Ad Configuration
            </h4>
            
            {/* CRITICAL FIX: Prominent Timer Configuration */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h5 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                🕐 Timer Configuration
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Free User Timer (seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={loggedInFormData.logged_in_timer_duration}
                    onChange={(e) => handleLoggedInInputChange('logged_in_timer_duration', parseInt(e.target.value))}
                    className="w-full px-4 py-3 text-lg font-bold rounded-lg border-2 border-blue-300 dark:border-blue-600 focus:border-blue-500 bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100"
                  />
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Countdown time for logged-in non-premium users (3-30s)
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {loggedInFormData.logged_in_timer_duration}s
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Current Timer
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Logged-in Ad System Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-theme-secondary">
                    Logged-in Non-Premium Ad System Active
                  </label>
                  <p className="text-xs text-theme-tertiary mt-1">
                    Enable or disable ads for logged-in non-premium users
                  </p>
                </div>
                <button
                  onClick={() => handleLoggedInInputChange('logged_in_ad_active', !loggedInFormData.logged_in_ad_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    loggedInFormData.logged_in_ad_active ? 'bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      loggedInFormData.logged_in_ad_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Timer configured above in prominent section */}

              {/* Ad Content Type */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-3">
                  Ad Content Type
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="logged_in_ad_content_type"
                      value="image_upload"
                      checked={loggedInFormData.logged_in_ad_content_type === 'image_upload'}
                      onChange={(e) => handleLoggedInInputChange('logged_in_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">Image Upload</span>
                      <p className="text-xs text-theme-tertiary">Upload an image file to display as the ad</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="logged_in_ad_content_type"
                      value="external_url"
                      checked={loggedInFormData.logged_in_ad_content_type === 'external_url'}
                      onChange={(e) => handleLoggedInInputChange('logged_in_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">External Image URL</span>
                      <p className="text-xs text-theme-tertiary">Link to an external image URL</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="logged_in_ad_content_type"
                      value="html_adsense"
                      checked={loggedInFormData.logged_in_ad_content_type === 'html_adsense'}
                      onChange={(e) => handleLoggedInInputChange('logged_in_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">HTML/AdSense Code</span>
                      <p className="text-xs text-theme-tertiary">Custom HTML or AdSense ad code</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional Content Fields */}
              {loggedInFormData.logged_in_ad_content_type === 'image_upload' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Upload Image
                  </label>
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-theme-light rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => document.getElementById('logged-in-image-upload')?.click()}
                    >
                      <Upload className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
                      <p className="text-sm text-theme-secondary">
                        {uploadingLoggedInImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-theme-tertiary">PNG, JPG, GIF, WebP up to 5MB</p>
                      <input
                        id="logged-in-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLoggedInImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleLoggedInImageUpload(file)
                          }
                        }}
                      />
                    </div>
                    
                    {loggedInFormData.logged_in_ad_image_url && (
                      <div className="relative">
                        <img
                          src={loggedInFormData.logged_in_ad_image_url}
                          alt="Logged-in ad preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleLoggedInInputChange('logged_in_ad_image_url', '')}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loggedInFormData.logged_in_ad_content_type === 'external_url' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    External Image URL
                  </label>
                  <input
                    type="url"
                    value={loggedInFormData.logged_in_ad_external_url}
                    onChange={(e) => handleLoggedInInputChange('logged_in_ad_external_url', e.target.value)}
                    placeholder="https://example.com/your-ad-image.jpg"
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    URL to the image you want to display as an ad
                  </p>
                </div>
              )}

              {loggedInFormData.logged_in_ad_content_type === 'html_adsense' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    HTML/AdSense Code
                  </label>
                  <textarea
                    value={loggedInFormData.logged_in_ad_html_content}
                    onChange={(e) => handleLoggedInInputChange('logged_in_ad_html_content', e.target.value)}
                    placeholder="Paste your HTML or AdSense ad code here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary font-mono text-sm"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    Paste your AdSense code or custom HTML content
                  </p>
                </div>
              )}

              {/* Click-through URL */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Click-through URL (optional)
                </label>
                <input
                  type="url"
                  value={loggedInFormData.logged_in_ad_click_url}
                  onChange={(e) => handleLoggedInInputChange('logged_in_ad_click_url', e.target.value)}
                  placeholder="https://example.com/advertiser-page"
                  className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
                />
                <p className="text-xs text-theme-tertiary mt-1">
                  URL to redirect users to when they click the ad
                </p>
              </div>
            </div>
          </div>

          {/* Current Logged-in Settings Info */}
          {loggedInSettings && (
            <div className="bg-theme-muted rounded-lg p-4">
              <h5 className="text-sm font-semibold text-theme-primary mb-2">
                Current Logged-in Settings
              </h5>
              <div className="space-y-1 text-xs text-theme-secondary">
                <p>Status: <span className={loggedInFormData.logged_in_ad_active ? 'text-green-600' : 'text-red-600'}>
                  {loggedInFormData.logged_in_ad_active ? 'Active' : 'Inactive'}
                </span></p>
                <p>Timer: {loggedInFormData.logged_in_timer_duration} seconds</p>
                <p>Content Type: {loggedInFormData.logged_in_ad_content_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p>Click URL: {loggedInFormData.logged_in_ad_click_url || 'None'}</p>
                <p>Last updated: {new Date(loggedInSettings.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest Users Section */}
      {activeSection === 'guests' && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-theme-primary">
              Guest Ad Configuration
            </h3>
            <button
              onClick={handleSaveGuest}
              disabled={savingGuest}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingGuest ? 'Saving...' : 'Save Guest Settings'}</span>
            </button>
          </div>

          <div className="bg-theme-surface border border-theme-light rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-theme-primary mb-4">
              Guest User Ad Configuration
            </h4>
            
            {/* CRITICAL FIX: Prominent Timer Configuration */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
              <h5 className="text-md font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center">
                🕑 Timer Configuration
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                    Guest User Timer (seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={guestFormData.guest_timer_duration}
                    onChange={(e) => handleGuestInputChange('guest_timer_duration', parseInt(e.target.value))}
                    className="w-full px-4 py-3 text-lg font-bold rounded-lg border-2 border-orange-300 dark:border-orange-600 focus:border-orange-500 bg-white dark:bg-gray-800 text-orange-900 dark:text-orange-100"
                  />
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Countdown time for guest users (5-60s)
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {guestFormData.guest_timer_duration}s
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                      Current Timer
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Guest Ad System Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-theme-secondary">
                    Guest Ad System Active
                  </label>
                  <p className="text-xs text-theme-tertiary mt-1">
                    Enable or disable ads for non-logged-in users
                  </p>
                </div>
                <button
                  onClick={() => handleGuestInputChange('guest_ad_active', !guestFormData.guest_ad_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    guestFormData.guest_ad_active ? 'bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      guestFormData.guest_ad_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Timer configured above in prominent section */}

              {/* Ad Content Type */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-3">
                  Ad Content Type
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="guest_ad_content_type"
                      value="image_upload"
                      checked={guestFormData.guest_ad_content_type === 'image_upload'}
                      onChange={(e) => handleGuestInputChange('guest_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">Image Upload</span>
                      <p className="text-xs text-theme-tertiary">Upload an image file to display as the ad</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="guest_ad_content_type"
                      value="external_url"
                      checked={guestFormData.guest_ad_content_type === 'external_url'}
                      onChange={(e) => handleGuestInputChange('guest_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">External Image URL</span>
                      <p className="text-xs text-theme-tertiary">Link to an external image URL</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="guest_ad_content_type"
                      value="html_adsense"
                      checked={guestFormData.guest_ad_content_type === 'html_adsense'}
                      onChange={(e) => handleGuestInputChange('guest_ad_content_type', e.target.value)}
                      className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-theme-primary">HTML/AdSense Code</span>
                      <p className="text-xs text-theme-tertiary">Custom HTML or AdSense ad code</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional Content Fields */}
              {guestFormData.guest_ad_content_type === 'image_upload' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Upload Image
                  </label>
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-theme-light rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => document.getElementById('guest-image-upload')?.click()}
                    >
                      <Upload className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
                      <p className="text-sm text-theme-secondary">
                        {uploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-theme-tertiary">PNG, JPG, GIF, WebP up to 5MB</p>
                      <input
                        id="guest-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleImageUpload(file)
                          }
                        }}
                      />
                    </div>
                    
                    {guestFormData.guest_ad_image_url && (
                      <div className="relative">
                        <img
                          src={guestFormData.guest_ad_image_url}
                          alt="Guest ad preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleGuestInputChange('guest_ad_image_url', '')}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {guestFormData.guest_ad_content_type === 'external_url' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    External Image URL
                  </label>
                  <input
                    type="url"
                    value={guestFormData.guest_ad_external_url}
                    onChange={(e) => handleGuestInputChange('guest_ad_external_url', e.target.value)}
                    placeholder="https://example.com/your-ad-image.jpg"
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    URL to the image you want to display as an ad
                  </p>
                </div>
              )}

              {guestFormData.guest_ad_content_type === 'html_adsense' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    HTML/AdSense Code
                  </label>
                  <textarea
                    value={guestFormData.guest_ad_html_content}
                    onChange={(e) => handleGuestInputChange('guest_ad_html_content', e.target.value)}
                    placeholder="Paste your HTML or AdSense ad code here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary font-mono text-sm"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    Paste your AdSense code or custom HTML content
                  </p>
                </div>
              )}

              {/* Click-through URL */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Click-through URL (optional)
                </label>
                <input
                  type="url"
                  value={guestFormData.guest_ad_click_url}
                  onChange={(e) => handleGuestInputChange('guest_ad_click_url', e.target.value)}
                  placeholder="https://example.com/advertiser-page"
                  className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
                />
                <p className="text-xs text-theme-tertiary mt-1">
                  URL to redirect users to when they click the ad
                </p>
              </div>
            </div>
          </div>

          {/* Current Guest Settings Info */}
          {guestSettings && (
            <div className="bg-theme-muted rounded-lg p-4">
              <h5 className="text-sm font-semibold text-theme-primary mb-2">
                Current Guest Settings
              </h5>
              <div className="space-y-1 text-xs text-theme-secondary">
                <p>Status: <span className={guestFormData.guest_ad_active ? 'text-green-600' : 'text-red-600'}>
                  {guestFormData.guest_ad_active ? 'Active' : 'Inactive'}
                </span></p>
                <p>Timer: {guestFormData.guest_timer_duration} seconds</p>
                <p>Content Type: {guestFormData.guest_ad_content_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p>Click URL: {guestFormData.guest_ad_click_url || 'None'}</p>
                <p>Last updated: {new Date(guestSettings.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}