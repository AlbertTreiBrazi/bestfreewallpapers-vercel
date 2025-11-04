import React, { useState, useEffect } from 'react'
import { X, User, Mail, Crown, Save, Loader2, Key } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal'
import toast from 'react-hot-toast'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, profileLoading, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  // Initialize form data when modal opens or profile changes
  useEffect(() => {
    if (isOpen && profile && user) {
      setFormData({
        full_name: profile.full_name || '',
        email: user.email || ''
      })
    }
  }, [isOpen, profile, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('You must be logged in to update your profile')
      return
    }

    // Basic validation
    if (!formData.full_name.trim()) {
      toast.error('Please enter your full name')
      return
    }

    if (formData.full_name.trim().length < 2) {
      toast.error('Full name must be at least 2 characters long')
      return
    }

    if (formData.full_name.trim().length > 100) {
      toast.error('Full name must be less than 100 characters')
      return
    }

    setSaving(true)
    
    try {
      // Update profile via edge function
      const { data, error } = await supabase.functions.invoke('user-profile', {
        method: 'PATCH',
        body: {
          full_name: formData.full_name.trim()
        }
      })

      if (error) {
        throw error
      }

      // Refresh the profile data in the auth context
      await refreshProfile()
      
      toast.success('Profile updated successfully!')
      onClose()
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Sanitize input to prevent XSS
    const sanitizedValue = value.replace(/[<>"']/g, '').substring(0, 100)
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }))
  }

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Profile Settings</h2>
                <p className="text-gray-100 text-sm">Manage your account information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
              disabled={saving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading || profileLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Premium Status */}
              {isPremiumUser && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Premium Member</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have access to premium wallpapers and instant downloads
                    {profile?.premium_expires_at && (
                      <> • Expires: {new Date(profile.premium_expires_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              )}

              {/* Account Type */}
              {!isPremiumUser && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">Free Account</p>
                      <p className="text-sm text-gray-600">Upgrade to Premium for exclusive benefits</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        // Navigate to premium page
                        window.location.href = '/premium'
                      }}
                      className="bg-gradient-to-r from-gray-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-gray-700 hover:to-blue-700 transition-all duration-200"
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              )}

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {/* Full Name Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your full name"
                  disabled={saving}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your display name for the website (2-100 characters)
                </p>
              </div>

              {/* Change Password Button */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Password & Security
                </label>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  disabled={saving}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-500 hover:bg-purple-50 transition-all duration-200 text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <Key className="w-4 h-4 mr-3 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Change Password</p>
                      <p className="text-xs text-gray-500">Update your account password</p>
                    </div>
                  </div>
                  <span className="text-gray-600 text-sm font-medium">Update</span>
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Click to open the password change form
                </p>
              </div>

              {/* Account Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Account Information</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Account Type: <span className="font-medium">
                    {profile?.role_display || (isPremiumUser ? 'Premium' : 'Free')}
                  </span></p>
                  <p>Member Since: <span className="font-medium">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </span></p>
                  {profile?.is_admin && (
                    <p>Admin Level: <span className="font-medium text-purple-600">
                      {profile?.admin_level === 'super_admin' ? 'Super Administrator' : 
                       profile?.admin_level === 'admin' ? 'Administrator' : 'Administrator'}
                    </span></p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.full_name.trim()}
                  className="bg-gradient-to-r from-gray-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-gray-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  )
}
