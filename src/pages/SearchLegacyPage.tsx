import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchFilters } from '@/components/search/SearchFilters';
import { TrendingSearches } from '@/components/search/TrendingSearches';
import { PopularTags } from '@/components/search/PopularTags';
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter';

import { SEOHead } from '@/components/seo/SEOHead';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { debounce } from '@/utils/debounce';
import { CategoryNavigationHelper, CategoryBreadcrumb, CategoryDisambiguation } from '@/components/category/CategoryNavigationHelper';
import { Search, Grid, List, SlidersHorizontal, TrendingUp, Filter as FilterIcon } from 'lucide-react';

interface SearchResults {
  wallpapers: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

interface SearchFiltersState {
  category: string;
  tags: string[];
  deviceType: string;
  resolution: string;
  showPremium: boolean;
  sortBy: string;
  videoOnly: boolean;
}

export function SearchLegacyPage() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Search state - searchQuery now comes from URL only, no local state
  const searchQuery = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults>({
    wallpapers: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter state
  const [filters, setFilters] = useState<SearchFiltersState>({
    category: searchParams.get('category') || 'all',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    deviceType: searchParams.get('device') || 'all',
    resolution: searchParams.get('resolution') || 'all',
    showPremium: searchParams.get('premium') !== 'false',
    sortBy: searchParams.get('sort') || 'newest',
    videoOnly: searchParams.get('video') === 'true'
  });
  
  // UI state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterChanging, setFilterChanging] = useState(false);
  
  // AbortController for request cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);
  


  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Sync filter state with URL parameters (for back/forward navigation)
  useEffect(() => {
    setFilters({
      category: searchParams.get('category') || 'all',
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      deviceType: searchParams.get('device') || 'all',
      resolution: searchParams.get('resolution') || 'all',
      showPremium: searchParams.get('premium') !== 'false',
      sortBy: searchParams.get('sort') || 'newest',
      videoOnly: searchParams.get('video') === 'true'
    });
    setCurrentPage(parseInt(searchParams.get('page') || '1'));
    setFilterChanging(false);
  }, [searchParams]);

  // Auto-search when URL changes
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    // Always perform search, even with empty query (to show all wallpapers with filters)
    performSearch(query, filters, page);
  }, [searchParams]); // Watch for any URL parameter changes



  // Debounced search function - removed as no longer needed
  // Search is now handled entirely by URL parameter changes

  // Perform search with abort controller for race condition safety
  const performSearch = async (query: string, searchFilters: SearchFiltersState, page: number = 1) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      // Track search analytics only if there's a query
      if (query && query.trim()) {
        await supabase.functions.invoke('advanced-search', {
          body: { action: 'track_search', query: query.trim() }
        });
      }
      
      // Perform the search (empty query returns all wallpapers with filters)
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: {
          action: 'search_wallpapers',
          query: query.trim(),
          filters: {
            category: searchFilters.category,
            tags: searchFilters.tags,
            deviceType: searchFilters.deviceType,
            resolution: searchFilters.resolution,
            showPremium: searchFilters.showPremium,
            videoOnly: searchFilters.videoOnly
          },
          page,
          limit: 12,
          sortBy: searchFilters.sortBy
        }
      });

      // Check if this request was aborted
      if (currentController.signal.aborted) {
        return;
      }

      if (error) throw error;

      if (data?.data) {
        setResults(data.data);
        setCurrentPage(page);
      } else {
        setResults({
          wallpapers: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1,
          hasMore: false
        });
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error?.name === 'AbortError') {
        return;
      }
      
      console.error('Search error:', error);
      setResults({
        wallpapers: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        hasMore: false
      });
    } finally {
      // Only set loading to false if this request wasn't aborted
      if (!currentController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Search is now handled entirely by the header - no local search handling needed
  // The searchQuery comes from URL parameters managed by the header search

  // Handle filter changes - update URL which will trigger search
  const handleFilterChange = (filterId: string, value: any) => {
    setFilterChanging(true);
    const newFilters = { ...filters, [filterId]: value };
    
    // Build new URL params
    const params = new URLSearchParams(searchParams);
    
    // Preserve search query
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    
    // Update filter params
    if (newFilters.category !== 'all') {
      params.set('category', newFilters.category);
    } else {
      params.delete('category');
    }
    
    if (newFilters.tags.length > 0) {
      params.set('tags', newFilters.tags.join(','));
    } else {
      params.delete('tags');
    }
    
    if (newFilters.deviceType !== 'all') {
      params.set('device', newFilters.deviceType);
    } else {
      params.delete('device');
    }
    
    if (newFilters.resolution !== 'all') {
      params.set('resolution', newFilters.resolution);
    } else {
      params.delete('resolution');
    }
    
    // Include Premium: OFF = false (free only), ON = omit (include all)
    if (!newFilters.showPremium) {
      params.set('premium', 'false');
    } else {
      params.delete('premium');
    }
    
    if (newFilters.sortBy !== 'newest') {
      params.set('sort', newFilters.sortBy);
    } else {
      params.delete('sort');
    }
    
    if (newFilters.videoOnly) {
      params.set('video', 'true');
    } else {
      params.delete('video');
    }
    
    // Reset page to 1 when filters change
    params.delete('page');
    
    // Navigate with new params
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  // Handle category selection from search - navigate to update URL
  const handleCategorySelect = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (categorySlug !== 'all') {
      params.set('category', categorySlug);
    } else {
      params.delete('category');
    }
    navigate(`/search?${params.toString()}`);
  };

  // Handle tag selection - navigate to update URL
  const handleTagSelect = (tag: string) => {
    const params = new URLSearchParams(searchParams);
    const currentTags = params.get('tags')?.split(',').filter(Boolean) || [];
    
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    if (newTags.length > 0) {
      params.set('tags', newTags.join(','));
    } else {
      params.delete('tags');
    }
    
    navigate(`/search?${params.toString()}`);
  };

  // Handle trending search selection - navigate to update URL
  const handleTrendingSelect = (query: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('q', query);
    navigate(`/search?${params.toString()}`);
  };

  // Clear all filters - navigate to /search with no params
  const clearFilters = () => {
    navigate('/search', { replace: true });
  };

  // Handle pagination - update URL which will trigger search
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    
    navigate(`/search?${params.toString()}`, { replace: true });
    window.scrollTo(0, 0);
  };

  // Define search filters configuration
  const searchFilters = [
    {
      id: 'category',
      label: 'Category',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Categories' },
        ...categories.map(cat => ({ value: cat.slug, label: cat.name }))
      ],
      defaultValue: 'all'
    },
    {
      id: 'deviceType',
      label: 'Device Type',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Devices' },
        { value: 'desktop', label: 'Desktop' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'tablet', label: 'Tablet' }
      ],
      defaultValue: 'all'
    },
    {
      id: 'resolution',
      label: 'Resolution',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Any Resolution' },
        { value: 'hd', label: 'HD (720p+)' },
        { value: 'fhd', label: 'Full HD (1080p+)' },
        { value: '4k', label: '4K (2160p+)' }
      ],
      defaultValue: 'all'
    },
    {
      id: 'sortBy',
      label: 'Sort By',
      type: 'select' as const,
      options: [
        { value: 'newest', label: 'Newest First' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'title', label: 'Alphabetical' }
      ],
      defaultValue: 'newest'
    },
    {
      id: 'showPremium',
      label: 'Include Premium Wallpapers',
      type: 'toggle' as const,
      defaultValue: true
    },
    {
      id: 'videoOnly',
      label: 'Video Wallpapers Only',
      type: 'toggle' as const,
      defaultValue: false
    }
  ];

  // SEO configuration
  const seoConfig = {
    title: searchQuery 
      ? `Search Results for "${searchQuery}" - Free Wallpapers | BestFreeWallpapers`
      : 'Advanced Search - Find Perfect Wallpapers | BestFreeWallpapers',
    description: searchQuery
      ? `Search results for "${searchQuery}". Find and download free HD wallpapers matching your search criteria.`
      : 'Use our advanced search to find the perfect wallpapers. Filter by category, tags, device type, resolution and more.',
    keywords: searchQuery 
      ? [searchQuery, `${searchQuery} wallpapers`, 'search results']
      : ['wallpaper search', 'advanced search', 'filter wallpapers', 'find wallpapers']
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} />
      
      {/* Removed large hero section - clean and minimal design */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Always show search results - no discovery section */}
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:w-64 flex-shrink-0">
              <SearchFilters
                filters={searchFilters}
                values={filters}
                onChange={handleFilterChange}
                onClear={clearFilters}
                isChanging={filterChanging}
              />
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Navigation Helper for Category Searches */}
              {searchParams.get('type') === 'category' && (
                <>
                  <CategoryBreadcrumb 
                    isSearchResults={true}
                    searchQuery={searchQuery}
                    className="mb-4"
                  />
                  
                  <CategoryNavigationHelper 
                    isSearchResults={true}
                    searchQuery={searchQuery}
                    className="mb-6"
                  />
                  
                  <CategoryDisambiguation 
                    searchQuery={searchQuery}
                    availableCategories={categories}
                    onCategoryClick={(slug) => navigate(`/category/${slug}`)}
                  />
                </>
              )}  

              {/* Mobile Filters */}
              <div className="lg:hidden mb-6">
                <SearchFilters
                  filters={searchFilters}
                  values={filters}
                  onChange={handleFilterChange}
                  onClear={clearFilters}
                  isMobile={true}
                  isOpen={showMobileFilters}
                  onToggle={() => setShowMobileFilters(!showMobileFilters)}
                  isChanging={filterChanging}
                />
              </div>

              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-200`}>
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'All Wallpapers'}
                  </h1>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>
                    {loading 
                      ? 'Loading...' 
                      : `${results.totalCount.toLocaleString()} wallpapers${searchQuery ? ' found' : ''}`
                    }
                  </p>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors duration-200 ${
                      viewMode === 'grid' 
                        ? (theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-100 text-gray-600')
                        : (theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600')
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors duration-200 ${
                      viewMode === 'list'
                        ? (theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-100 text-gray-600')
                        : (theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600')
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Active Filters Display */}
              {(filters.tags.length > 0 || filters.category !== 'all' || filters.deviceType !== 'all') && (
                <div className={`mb-6 p-4 ${theme === 'dark' ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg transition-colors duration-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-gray-700'} transition-colors duration-200`}>Active Filters:</span>
                    <button
                      onClick={clearFilters}
                      className={`text-xs ${theme === 'dark' ? 'text-gray-400 hover:text-purple-300' : 'text-gray-600 hover:text-gray-700'} font-medium transition-colors duration-200`}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filters.category !== 'all' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Category: {categories.find(c => c.slug === filters.category)?.name || filters.category}
                      </span>
                    )}
                    {filters.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {tag}
                        <button
                          onClick={() => handleTagSelect(tag)}
                          className="ml-1 text-green-500 hover:text-green-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.deviceType !== 'all' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Device: {filters.deviceType}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Search Results Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-300 rounded-lg aspect-video mb-4"></div>
                      <div className="bg-gray-300 h-4 rounded mb-2"></div>
                      <div className="bg-gray-300 h-3 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : results.wallpapers.length > 0 ? (
                <div className={viewMode === 'grid' ? 
                  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' :
                  'space-y-6'
                }>
                  {results.wallpapers.map((wallpaper, index) => (
                    <EnhancedWallpaperCardAdapter
                      key={wallpaper.id}
                      wallpaper={wallpaper}

                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} mb-4`}>
                    <Search className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-200`}>
                    {filters.category !== 'all' ? 
                      `No wallpapers found in ${categories.find(c => c.slug === filters.category)?.name || filters.category}` :
                      searchQuery ? `No wallpapers found for "${searchQuery}"` : 'No wallpapers found'
                    }
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4 transition-colors duration-200`}>
                    {searchQuery ? (
                      <span>
                        We currently have a limited collection of wallpapers. Try searching for:
                        <span className="block mt-2 font-medium">
                          "autumn", "gnome", "ghost", "halloween", "rainbow", "neon", or "divine"
                        </span>
                      </span>
                    ) : (
                      'Try browsing available wallpapers or search for specific terms'
                    )}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={clearFilters}
                      className={`${theme === 'dark' ? 'text-gray-400 hover:text-purple-300' : 'text-gray-600 hover:text-gray-700'} font-semibold transition-colors duration-200`}
                    >
                      Clear all filters
                    </button>
                    <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} hidden sm:inline`}>•</span>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('q', 'autumn');
                        navigate(`/search?${params.toString()}`);
                      }}
                      className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} font-semibold transition-colors duration-200`}
                    >
                      Search available content
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {results.totalPages > 1 && !loading && (
                <div className="mt-12 flex justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    {[...Array(Math.min(5, results.totalPages))].map((_, i) => {
                      const page = Math.max(1, currentPage - 2) + i;
                      if (page > results.totalPages) return null;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg ${
                            page === currentPage
                              ? 'bg-gray-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === results.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>


    </div>
  );
}


export default SearchLegacyPage
