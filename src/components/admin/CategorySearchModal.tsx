import React, { useState, useEffect, useMemo } from 'react'
import { Search, X, Tag, ChevronRight } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  parent_id: number | null
  is_premium: boolean
  sort_order: number
}

interface CategorySearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (categoryId: number, categoryName: string) => void
  categories: Category[]
  selectedCategoryId?: string | number
}

export function CategorySearchModal({
  isOpen,
  onClose,
  onSelect,
  categories,
  selectedCategoryId
}: CategorySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 200)

  // Filter and sort categories based on search query
  const filteredCategories = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      // Return all active categories sorted by sort_order and name
      return categories
        .filter(cat => cat.is_active)
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order
          }
          return a.name.localeCompare(b.name)
        })
    }

    const query = debouncedSearchQuery.toLowerCase()
    return categories
      .filter(cat => {
        const matchesName = cat.name.toLowerCase().includes(query)
        const matchesSlug = cat.slug.toLowerCase().includes(query)
        const matchesDescription = cat.description?.toLowerCase().includes(query) || false
        return cat.is_active && (matchesName || matchesSlug || matchesDescription)
      })
      .sort((a, b) => {
        // Sort by relevance: exact name match first, then contains match
        const aNameExact = a.name.toLowerCase() === query
        const bNameExact = b.name.toLowerCase() === query
        if (aNameExact && !bNameExact) return -1
        if (!aNameExact && bNameExact) return 1
        
        const aNameStarts = a.name.toLowerCase().startsWith(query)
        const bNameStarts = b.name.toLowerCase().startsWith(query)
        if (aNameStarts && !bNameStarts) return -1
        if (!aNameStarts && bNameStarts) return 1
        
        return a.name.localeCompare(b.name)
      })
  }, [categories, debouncedSearchQuery])

  // Reset search when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSelect = (category: Category) => {
    onSelect(category.id, category.name)
    onClose()
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Tag className="w-5 h-5 mr-2 text-gray-600" />
            Select Category
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredCategories.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCategories.map((category) => {
                const isSelected = selectedCategoryId && 
                  (category.id.toString() === selectedCategoryId.toString())
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelect(category)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${
                      isSelected ? 'bg-gray-100 dark:bg-gray-700 border-l-4 border-gray-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-sm font-medium truncate ${
                            isSelected 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200'
                          }`}>
                            {category.name}
                          </h4>
                          {category.is_premium && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                              Premium
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Slug: {category.slug}
                          </span>
                          <span className="text-xs text-gray-400">
                            Order: {category.sort_order}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                        isSelected
                          ? 'text-gray-600'
                          : 'text-gray-400 group-hover:text-gray-600'
                      } transition-colors`} />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {searchQuery ? 'No categories found' : 'No active categories'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {searchQuery 
                  ? `No categories match "${searchQuery}"` 
                  : 'No active categories are available'}
              </p>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="mt-3 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear search to see all categories
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{filteredCategories.length} categories available</span>
            <span>Click a category to select</span>
          </div>
        </div>
      </div>
    </div>
  )
}