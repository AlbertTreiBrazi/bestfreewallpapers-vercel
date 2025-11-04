import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { ChevronDown, Grid, ArrowRight } from 'lucide-react'

interface Category {
  name: string
  slug: string
  preview_image: string | null
}

interface BestFreeWallpapersTabCategoriesProps {
  selectedCategory?: string
  onCategorySelect: (category: string) => void
  className?: string
}

export function BestFreeWallpapersTabCategories({ 
  selectedCategory = 'all', 
  onCategorySelect, 
  className = '' 
}: BestFreeWallpapersTabCategoriesProps) {
  const { theme } = useTheme()
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Load curated categories from database
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('name, slug, preview_image')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(50) // Reduced limit for better performance
      
      if (!error && data) {
        setCategories(data)
      } else {
        console.error('Error loading categories:', error)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Featured categories (first 8) for quick access
  const featuredCategories = useMemo(() => categories.slice(0, 8), [categories])

  const handleCategoryClick = useCallback((categorySlug: string) => {
    setShowCategoryDropdown(false)
    
    if (categorySlug === 'all') {
      onCategorySelect('all')
      navigate('/free-wallpapers')
      return
    }

    // Navigate to category page
    navigate(`/category/${categorySlug}`)
  }, [navigate, onCategorySelect])

  const getCurrentCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'All'
    
    const category = categories.find(cat => cat.slug === selectedCategory)
    return category?.name || 'All'
  }, [selectedCategory, categories])

  const toggleDropdown = useCallback(() => {
    setShowCategoryDropdown(!showCategoryDropdown)
  }, [showCategoryDropdown])

  const closeDropdown = useCallback(() => {
    setShowCategoryDropdown(false)
  }, [])

  const goToAllCategories = useCallback(() => {
    navigate('/categories')
  }, [navigate])

  if (loading) {
    return (
      <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-100'} border-b transition-colors duration-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-center py-4">
            <div className={`animate-pulse ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading categories...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-100'} border-b transition-colors duration-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 overflow-visible">
        <div className="flex flex-col space-y-3 py-3 md:flex-row md:items-center md:justify-between md:space-y-0 md:py-4 overflow-visible">
          {/* Category Selector */}
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-x-6 md:space-y-0 overflow-visible">
            {/* Main Category Dropdown */}
            <div className="relative z-[9999]">
              <button
                onClick={toggleDropdown}
                className={`inline-flex items-center px-4 py-2 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border text-white hover:bg-dark-tertiary' : 'bg-white border-gray-300 hover:bg-gray-50'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors`}
                aria-expanded={showCategoryDropdown}
                aria-haspopup="true"
              >
                <Grid className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Categories: {getCurrentCategoryName}
                </span>
                <ChevronDown className={`w-4 h-4 ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} transition-transform ${
                  showCategoryDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Dropdown Menu */}
              {showCategoryDropdown && (
                <div className={`category-dropdown-mobile absolute top-full left-0 mt-1 w-80 max-w-[calc(100vw-2rem)] ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-[9999]`}>
                  <div className="category-dropdown-content">
                    <div className={`px-3 py-2 text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                      Curated Categories
                    </div>
                    
                    {/* All option */}
                    <button
                      onClick={() => handleCategoryClick('all')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 ${
                        selectedCategory === 'all'
                          ? 'bg-gray-100 text-gray-700 font-medium dark:bg-purple-900 dark:text-purple-300'
                          : `${theme === 'dark' ? 'text-gray-200 hover:bg-dark-tertiary hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      All Wallpapers
                    </button>
                    
                    {/* Categories list - ONLY scrollable container */}
                    <div className="category-dropdown-list space-y-1">
                      {categories.map((category) => {
                        const isSelected = selectedCategory === category.slug
                        
                        return (
                          <button
                            key={category.slug}
                            onClick={() => handleCategoryClick(category.slug)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              isSelected
                                ? 'bg-gray-100 text-gray-700 font-medium dark:bg-purple-900 dark:text-purple-300'
                                : `${theme === 'dark' ? 'text-gray-200 hover:bg-dark-tertiary hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`
                            }`}
                          >
                            {category.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Featured Categories - Quick Access */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              {/* All button */}
              <button
                onClick={() => handleCategoryClick('all')}
                className={`flex-shrink-0 px-2.5 py-1.5 md:px-3 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors min-h-[32px] md:min-h-[36px] whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-gray-100 text-gray-700 dark:bg-purple-900 dark:text-purple-300'
                    : `${theme === 'dark' ? 'bg-dark-tertiary text-gray-200 hover:bg-gray-700 hover:text-white border border-dark-border' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                All
              </button>
              
              {/* Featured categories */}
              {featuredCategories.map((category) => {
                const isSelected = selectedCategory === category.slug
                const displayName = category.name.length > 15 ? category.name.substring(0, 15) + '...' : category.name
                
                return (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryClick(category.slug)}
                    className={`flex-shrink-0 px-2.5 py-1.5 md:px-3 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors min-h-[32px] md:min-h-[36px] whitespace-nowrap ${
                      isSelected
                        ? 'bg-gray-100 text-gray-700 dark:bg-purple-900 dark:text-purple-300'
                        : `${theme === 'dark' ? 'bg-dark-tertiary text-gray-200 hover:bg-gray-700 hover:text-white border border-dark-border' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    }`}
                    title={category.name}
                  >
                    {displayName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center justify-center md:justify-end space-x-2">
            <button
              onClick={goToAllCategories}
              className={`inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-dark-tertiary' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} hover:scale-105`}
            >
              <span>Browse all categories</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Close dropdown when clicking outside */}
      {showCategoryDropdown && (
        <div 
          className="fixed inset-0 z-[1099]" 
          onClick={closeDropdown}
          role="button"
          tabIndex={-1}
          aria-label="Close dropdown"
        ></div>
      )}
    </div>
  )
}
