import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { AuthModal } from '@/components/auth/AuthModal'
import { ProfileModal } from '@/components/auth/ProfileModal'
import { SearchBar } from '@/components/search/SearchBar'
import { Search, Menu, X, Sun, Moon, Crown } from 'lucide-react'

export function Header() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const navigate = useNavigate()

  // Smart header scroll behavior (mobile only)
  useEffect(() => {
    const handleScroll = () => {
      const isMobile = window.innerWidth < 768
      const currentScrollY = window.scrollY
      
      // Always show header on desktop
      if (!isMobile) {
        setIsHeaderVisible(true)
        setLastScrollY(currentScrollY)
        return
      }
      
      // Mobile scroll behavior
      const scrollDifference = Math.abs(currentScrollY - lastScrollY)
      
      // Only trigger after significant scroll (reduces sensitivity)
      if (scrollDifference < 10) return
      
      // Show header when at top or scrolling up
      if (currentScrollY < 50 || currentScrollY < lastScrollY) {
        setIsHeaderVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide header when scrolling down on mobile
        setIsHeaderVisible(false)
        setIsMobileMenuOpen(false) // Close mobile menu when hiding
      }
      
      setLastScrollY(currentScrollY)
    }

    // Add scroll listener with throttling
    let ticking = false
    const scrollListener = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', scrollListener, { passive: true })
    
    // Handle resize to ensure proper behavior
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsHeaderVisible(true)
      }
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('scroll', scrollListener)
      window.removeEventListener('resize', handleResize)
    }
  }, [lastScrollY])

  // Clear search input when navigating to search page to prevent conflicts
  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery('')
    }
  }, [location.pathname])

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (searchTerm.trim()) {
      // Sanitize search query to prevent XSS attacks
      const sanitizedQuery = searchTerm.replace(/[<>"'%;()&+]/g, '').trim().substring(0, 100)
      navigate(`/search?q=${encodeURIComponent(sanitizedQuery)}`)
      // Clear local search state after navigation to prevent conflicts
      setSearchQuery('')
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/free-wallpapers', label: 'Free Wallpapers' },
    { href: '/categories', label: 'Categories' },
    { href: '/premium', label: 'Premium' },
    { href: '/collections', label: 'Collections' },
  ]

  return (
    <>
      <header className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-200'} shadow-lg sticky top-0 z-50 transition-all duration-300 overflow-visible ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Optimized for Mobile */}
            <Link to="/" className="flex items-center shrink-0 min-w-0 max-w-[60vw] md:max-w-none">
              <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent truncate leading-tight">
                BestFreeWallpapers
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`${theme === 'dark' ? 'text-white hover:text-gray-400' : 'text-gray-700 hover:text-gray-600'} transition duration-200 font-medium text-sm lg:text-base whitespace-nowrap`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions - Mobile Optimized */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Crown Icon */}
              <button
                onClick={() => navigate('/upgrade')}
                className={`hidden md:block p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-dark-tertiary' : 'hover:bg-gray-100'} transition duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group`}
                aria-label="Upgrade to Premium"
                title="Upgrade to Premium"
              >
                <Crown className="w-5 h-5 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
              </button>

              {/* Desktop Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`hidden md:block p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-dark-tertiary text-white' : 'hover:bg-gray-100 text-gray-700'} transition duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Auth Section - Mobile Optimized */}
              {user ? (
                <UserMenu onOpenProfile={() => setIsProfileModalOpen(true)} />
              ) : (
                <button
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
                  className="bg-gradient-to-r from-gray-600 to-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold hover:from-gray-700 hover:to-blue-700 transition duration-200 text-sm min-w-[70px] min-h-[44px] flex items-center justify-center whitespace-nowrap"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Button - Properly Positioned */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${theme === 'dark' ? 'text-white hover:bg-dark-tertiary' : 'text-gray-700 hover:bg-gray-100'} transition duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center`}
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Search Bar Section - Mobile Optimized */}
        <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-dark-secondary to-dark-primary border-dark-border' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'} border-t transition-colors duration-200`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2 md:py-3">
            <div className="flex justify-center">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder="Search wallpapers, categories, themes..."
                className="w-full max-w-4xl"
                variant="header"
              />
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Enhanced Organization and Touch Targets */}
        {isMobileMenuOpen && (
          <div className={`md:hidden ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} border-t transition-colors duration-200 absolute top-full left-0 right-0 z-[1001] max-h-[calc(100vh-140px)] overflow-y-auto`}>
            <div className="px-3 py-4 space-y-1">
              {/* Navigation Links - Improved Touch Targets */}
              {navLinks
                .filter(link => link.href !== '/about')  // Exclude About from mobile menu to ensure theme toggle is visible
                .map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 ${theme === 'dark' ? 'text-white hover:text-gray-400 hover:bg-dark-tertiary' : 'text-gray-700 hover:text-gray-600 hover:bg-gray-50'} rounded-md transition duration-200 font-medium min-h-[48px] flex items-center text-base active:bg-opacity-70`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Divider */}
              <div className={`border-t ${theme === 'dark' ? 'border-dark-border' : 'border-gray-200'} my-3`}></div>
              
              {/* Mobile Sign In Button (for non-logged-in users) */}
              {!user && (
                <button
                  onClick={() => {
                    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-600 to-blue-600 text-white rounded-md font-semibold hover:from-gray-700 hover:to-blue-700 transition duration-200 min-h-[48px] text-base active:bg-opacity-70`}
                >
                  Sign In
                </button>
              )}
              
              {/* Mobile Crown Icon - Upgrade */}
              <button
                onClick={() => {
                  navigate('/upgrade')
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'hover:bg-dark-tertiary' : 'hover:bg-gray-50'} rounded-md transition duration-200 font-medium min-h-[48px] text-base active:bg-opacity-70`}
                aria-label="Upgrade to Premium"
              >
                <Crown className="w-5 h-5 text-yellow-500 shrink-0" />
                <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Upgrade to Premium</span>
              </button>
              
              {/* Mobile Theme Toggle - Improved */}
              <button
                onClick={() => {
                  toggleTheme()
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-white hover:text-gray-400 hover:bg-dark-tertiary' : 'text-gray-700 hover:text-gray-600 hover:bg-gray-50'} rounded-md transition duration-200 font-medium min-h-[48px] text-base active:bg-opacity-70`}
                aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 shrink-0" />
                ) : (
                  <Moon className="w-5 h-5 shrink-0" />
                )}
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      
      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  )
}