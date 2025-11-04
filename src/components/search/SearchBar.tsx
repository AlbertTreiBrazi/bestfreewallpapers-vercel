import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, TrendingUp, Sparkles } from 'lucide-react'
import { debounce } from '@/utils/debounce'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

interface SearchSuggestion {
  text: string
  type: 'trending' | 'category' | 'popular' | 'content' | 'fallback' | 'general'
  count?: number
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  placeholder?: string
  className?: string
  variant?: 'hero' | 'header'
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search for wallpapers, categories, themes...',
  className = '',
  variant = 'hero'
}: SearchBarProps) {
  const { theme } = useTheme()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Popular search terms
  const defaultPopularSearches = [
    'aesthetic', 'anime', 'nature', 'space', 'minimalist', 'dark', 'cute',
    'galaxy', 'flowers', 'abstract', 'city', 'ocean', 'mountains', 'sunset'
  ]

  // Load popular searches on mount
  useEffect(() => {
    loadPopularSearches()
  }, [])

  // Load popular searches based on actual content
  const loadPopularSearches = async () => {
    try {
      // Try to get trending searches from the backend (now based on actual content)
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: { action: 'get_trending', limit: 10 }
      })

      if (data?.data?.trending && data.data.trending.length > 0) {
        const trending = data.data.trending.map((item: any) => item.search_term)
        setPopularSearches(trending)
      } else {
        // Fallback to terms that actually exist in our limited database
        const actualTerms = ['autumn', 'gnome', 'ghost', 'halloween', 'rainbow', 'neon', 'divine', 'cartoon', 'frogs']
        setPopularSearches(actualTerms)
      }
    } catch (error) {
      console.error('Error loading popular searches:', error)
      // Use terms that match our actual database content
      const actualTerms = ['autumn', 'gnome', 'ghost', 'halloween', 'rainbow', 'neon', 'divine', 'cartoon', 'frogs']
      setPopularSearches(actualTerms)
    }
  }

  // Enhanced debounced search with better fallback handling
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        // Show content-based popular searches when no query
        const popularSuggestions: SearchSuggestion[] = popularSearches.map(term => ({
          text: term,
          type: 'popular' as const
        }))
        setSuggestions(popularSuggestions)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // Get suggestions from enhanced backend
        const { data, error } = await supabase.functions.invoke('search-autocomplete', {
          body: { query, limit: 8 }
        })

        if (error) throw error

        if (data?.data?.suggestions && data.data.suggestions.length > 0) {
          // Use actual database-driven suggestions
          setSuggestions(data.data.suggestions)
        } else {
          // Enhanced fallback: filter popular searches but prioritize actual content
          const filtered = popularSearches
            .filter(term => term.toLowerCase().includes(query.toLowerCase()))
            .map(term => ({ text: term, type: 'popular' as const }))
            
          if (filtered.length > 0) {
            setSuggestions(filtered.slice(0, 6))
          } else {
            // Show a helpful message when no matches found
            setSuggestions([{
              text: `Search for "${query}"`,
              type: 'general' as const
            }])
          }
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        // Improved fallback logic
        const filtered = popularSearches
          .filter(term => term.toLowerCase().includes(query.toLowerCase()))
          .map(term => ({ text: term, type: 'popular' as const }))
        
        if (filtered.length > 0) {
          setSuggestions(filtered.slice(0, 6))
        } else {
          setSuggestions([{
            text: `Search for "${query}"`,
            type: 'general' as const
          }])
        }
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [popularSearches]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
    setIsLoading(true)
    debouncedSearch(newValue)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    performSearch(suggestion.text)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  // Perform search
  const performSearch = (query: string) => {
    if (query.trim()) {
      const sanitizedQuery = query.replace(/[<>"'%;()&+]/g, '').trim().substring(0, 100)
      if (onSearch) {
        onSearch(sanitizedQuery)
      } else {
        navigate(`/search?q=${encodeURIComponent(sanitizedQuery)}`)
      }
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      performSearch(value.trim())
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Escape clears the search
      e.preventDefault()
      clearSearch()
      setShowSuggestions(false)
      return
    }
    
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          performSearch(value)
        }
        break
    }
  }

  // Handle input focus
  const handleFocus = () => {
    setShowSuggestions(true)
    if (suggestions.length === 0) {
      debouncedSearch(value)
    }
  }

  // Clear search - preserves other URL parameters
  const clearSearch = () => {
    onChange('')
    const popularSuggestions: SearchSuggestion[] = popularSearches.map(term => ({
      text: term,
      type: 'popular' as const
    }))
    setSuggestions(popularSuggestions)
    
    // If we're on the search page, navigate to remove query param but keep other filters
    if (window.location.pathname === '/search') {
      const params = new URLSearchParams(searchParams)
      params.delete('q')
      navigate(`/search${params.toString() ? '?' + params.toString() : ''}`, { replace: true })
    }
    
    inputRef.current?.focus()
  }

  // Get suggestion icon with enhanced types
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'category':
        return <Search className="w-4 h-4 text-blue-500" />
      case 'content':
        return <Sparkles className="w-4 h-4 text-green-500" />
      case 'popular':
        return <Sparkles className="w-4 h-4 text-yellow-500" />
      case 'fallback':
        return <Search className="w-4 h-4 text-gray-500" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Different styles for hero vs header variants with theme support
  const getInputStyles = () => {
    const baseClasses = 'w-full rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200'
    
    if (variant === 'hero') {
      const heroSizes = 'pl-12 pr-12 py-4 md:pl-14 md:pr-14 md:py-5 text-base md:text-lg lg:text-xl'
      const heroStyles = 'border-2 rounded-2xl shadow-xl focus:ring-4 transition-all duration-300'
      
      if (theme === 'dark') {
        return `${baseClasses} ${heroSizes} ${heroStyles} bg-dark-secondary/95 border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 backdrop-blur-sm`
      }
      return `${baseClasses} ${heroSizes} ${heroStyles} bg-white/95 border-white/20 text-gray-900 placeholder-gray-500 focus:border-white focus:ring-white/20 backdrop-blur-sm`
    }
    
    const headerSizes = 'pl-6 pr-6 py-2 md:pl-8 md:pr-8 md:py-2.5 text-sm md:text-base border-2 min-h-[44px] md:min-h-[48px]'
    
    if (theme === 'dark') {
      return `${baseClasses} ${headerSizes} bg-dark-secondary border-dark-border text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20`
    }
    return `${baseClasses} ${headerSizes} bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-500 focus:ring-purple-200`
  }

  const getContainerStyles = () => {
    if (variant === 'hero') {
      return 'relative w-full max-w-3xl mx-auto'
    }
    return 'relative w-full max-w-2xl'
  }

  const getIconSize = () => variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5'
  const getIconPosition = () => variant === 'hero' ? 'left-5' : 'left-2.5 md:left-3'
  const getClearIconPosition = () => variant === 'hero' ? 'right-5' : 'right-2.5 md:right-3'

  return (
    <div className={`${getContainerStyles()} ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className={`absolute ${getIconPosition()} top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} ${getIconSize()} z-10`} />
          
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={getInputStyles()}
            autoComplete="off"
            spellCheck="false"
          />
          
          {value && (
            <button
              type="button"
              onClick={clearSearch}
              className={`absolute ${getClearIconPosition()} top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors z-10`}
            >
              <X className={getIconSize()} />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-2 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto transition-colors duration-200`}
        >
          {isLoading ? (
            <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mx-auto"></div>
              <span className="block mt-2">Searching...</span>
            </div>
          ) : (
            <>
              {/* Suggestions Header */}
              {suggestions.length > 0 && (
                <div className={`px-4 py-2 ${theme === 'dark' ? 'border-dark-border' : 'border-gray-100'} border-b text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-medium`}>
                  {value.length < 2 ? 'Popular Searches' : 'Suggestions'}
                </div>
              )}
              
              {/* Suggestions List */}
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${
                    index === selectedIndex 
                      ? (theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-50 text-gray-700')
                      : (theme === 'dark' 
                          ? 'text-gray-300 hover:text-white hover:bg-dark-tertiary' 
                          : 'text-gray-700 hover:bg-gray-50'
                        )
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getSuggestionIcon(suggestion.type)}
                    <span className="font-medium">{suggestion.text}</span>
                    {suggestion.type === 'popular' && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Popular
                      </span>
                    )}
                    {suggestion.type === 'content' && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Available
                      </span>
                    )}
                    {suggestion.type === 'fallback' && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        Suggested
                      </span>
                    )}
                    {suggestion.type === 'category' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Category
                      </span>
                    )}
                  </div>
                  
                  {suggestion.count && (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {suggestion.count.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}