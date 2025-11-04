import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SortOption } from '@/components/ui/SortDropdown'

interface UseSortOptions {
  defaultSort?: SortOption
  updateUrl?: boolean
}

export function useSort({ defaultSort = 'newest', updateUrl = true }: UseSortOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSort = searchParams.get('sort') as SortOption
  const initialSort = urlSort && isValidSortOption(urlSort) ? urlSort : defaultSort
  
  const [sortBy, setSortBy] = useState<SortOption>(initialSort)

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort)
    
    if (updateUrl) {
      const params = new URLSearchParams(searchParams)
      if (newSort !== defaultSort) {
        params.set('sort', newSort)
      } else {
        params.delete('sort')
      }
      setSearchParams(params)
    }
  }, [searchParams, setSearchParams, updateUrl, defaultSort])

  // Generate SQL ORDER BY clause based on sort option
  const getSortQuery = useCallback((sortOption: SortOption = sortBy) => {
    switch (sortOption) {
      case 'newest':
        return { column: 'created_at', ascending: false }
      case 'oldest':
        return { column: 'created_at', ascending: true }
      case 'popular':
        // Use download_count as popularity metric, with featured items first
        return [{ column: 'is_featured', ascending: false }, { column: 'download_count', ascending: false }]
      case 'downloaded':
        return { column: 'download_count', ascending: false }
      case 'title_asc':
        return { column: 'title', ascending: true }
      case 'title_desc':
        return { column: 'title', ascending: false }
      default:
        return { column: 'created_at', ascending: false }
    }
  }, [sortBy])

  // Apply sorting to a Supabase query
  const applySorting = useCallback((query: any, sortOption: SortOption = sortBy) => {
    const sortConfig = getSortQuery(sortOption)
    
    if (Array.isArray(sortConfig)) {
      // Multiple sort conditions (for popular)
      let sortedQuery = query
      sortConfig.forEach(({ column, ascending }) => {
        sortedQuery = sortedQuery.order(column, { ascending })
      })
      return sortedQuery
    } else {
      // Single sort condition
      return query.order(sortConfig.column, { ascending: sortConfig.ascending })
    }
  }, [getSortQuery, sortBy])

  return {
    sortBy,
    setSortBy: handleSortChange,
    getSortQuery,
    applySorting
  }
}

// Helper function to validate sort options
function isValidSortOption(value: string): value is SortOption {
  return ['newest', 'oldest', 'popular', 'downloaded', 'title_asc', 'title_desc'].includes(value)
}

export default useSort