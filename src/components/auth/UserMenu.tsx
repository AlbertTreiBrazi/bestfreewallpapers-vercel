import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserLoadingSkeleton } from '@/components/ui/UserLoadingSkeleton'
import { User, LogOut, Crown, Settings, Heart } from 'lucide-react'

interface UserMenuProps {
  onOpenProfile?: () => void
}

export function UserMenu({ onOpenProfile }: UserMenuProps) {
  const { user, profile, profileLoading, signOut } = useAuth()

  // Don't render anything if no user
  if (!user) return null

  // Show loading skeleton while profile is loading (prevents flicker)
  if (profileLoading || !profile) {
    return <UserLoadingSkeleton />
  }

  const isPremium = profile?.plan_type === 'premium' && 
                   (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  // Determine display name and status
  const displayName = profile?.full_name || user.email
  const userStatus = profile?.role_display || (isPremium ? 'Premium' : 'Free')

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            {isPremium && <Crown className="w-3 h-3 text-yellow-500 mr-1" />}
            {userStatus}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
        <div className="py-2">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            {isPremium && (
              <div className="flex items-center mt-1">
                <Crown className="w-3 h-3 text-yellow-500 mr-1" />
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Premium Member</span>
              </div>
            )}
          </div>
          
          {profile?.is_admin && (
            <Link
              to="/admin"
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Link>
          )}
          
          <Link
            to="/favorites"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
          >
            <Heart className="w-4 h-4 mr-2" />
            My Favorites
          </Link>
          
          <button
            onClick={onOpenProfile}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
          >
            <User className="w-4 h-4 mr-2" />
            Profile Settings
          </button>
          
          <button
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}