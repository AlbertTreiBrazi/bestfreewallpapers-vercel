import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ExternalLink, Search, Folder, Info } from 'lucide-react'

interface CategoryNavigationHelperProps {
  isSearchResults?: boolean
  searchQuery?: string
  categoryName?: string
  className?: string
}

export function CategoryNavigationHelper({ 
  isSearchResults = false, 
  searchQuery = '', 
  categoryName = '',
  className = '' 
}: CategoryNavigationHelperProps) {
  const { theme } = useTheme()
  
  if (!isSearchResults && !categoryName) return null
  
  return (
    <div className={`${className} ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${isSearchResults ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
          {isSearchResults ? (
            <Search className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
          ) : (
            <Folder className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
            {isSearchResults ? 'Search Results' : 'Category Page'}
          </h3>
          
          {isSearchResults ? (
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} space-y-1`}>
              <p>Showing wallpapers matching "{searchQuery}"</p>
              <p className="flex items-center space-x-1">
                <Search className="w-3 h-3" />
                <span>Results from our wallpaper database based on tags and titles</span>
              </p>
            </div>
          ) : (
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} space-y-1`}>
              <p>You're browsing the dedicated "{categoryName}" category</p>
              <p className="flex items-center space-x-1">
                <Folder className="w-3 h-3" />
                <span>Curated collection with organized wallpapers</span>
              </p>
            </div>
          )}
        </div>
        
        <div className={`p-1 rounded ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <Info className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

// Navigation breadcrumb component for better UX
export function CategoryBreadcrumb({ 
  isSearchResults = false, 
  searchQuery = '', 
  categoryName = '',
  className = '' 
}: CategoryNavigationHelperProps) {
  const { theme } = useTheme()
  
  return (
    <div className={`${className} flex items-center space-x-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
      <span>Home</span>
      <span>/</span>
      
      {isSearchResults ? (
        <>
          <span>Search</span>
          <span>/</span>
          <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
            "{searchQuery}"
          </span>
          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
            🔍 Search
          </span>
        </>
      ) : (
        <>
          <span>Categories</span>
          <span>/</span>
          <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
            {categoryName}
          </span>
          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
            📂 Category
          </span>
        </>
      )}
    </div>
  )
}

// Helper component for category disambiguation
export function CategoryDisambiguation({ 
  searchQuery,
  availableCategories = [],
  onCategoryClick
}: {
  searchQuery: string
  availableCategories: Array<{id: string, name: string, slug: string}>
  onCategoryClick: (slug: string) => void
}) {
  const { theme } = useTheme()
  
  const relatedCategories = availableCategories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    searchQuery.toLowerCase().includes(cat.name.toLowerCase())
  ).slice(0, 3)
  
  if (relatedCategories.length === 0) return null
  
  return (
    <div className={`p-4 ${theme === 'dark' ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg mb-6`}>
      <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-gray-700'} mb-2`}>
        🔍 Looking for a specific category?
      </h4>
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
        We found dedicated category pages that might match your search:
      </p>
      
      <div className="flex flex-wrap gap-2">
        {relatedCategories.map(category => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.slug)}
            className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              theme === 'dark' 
                ? 'bg-purple-800 text-gray-200 hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-purple-200'
            }`}
          >
            <Folder className="w-3 h-3" />
            <span>{category.name}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        ))}
      </div>
    </div>
  )
}
