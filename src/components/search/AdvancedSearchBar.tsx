import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, Tag, Hash, Filter } from 'lucide-react';
import { debounce } from '@/utils/debounce';
import { supabase } from '@/lib/supabase';

interface SearchSuggestion {
  text: string;
  type: 'trending' | 'category' | 'tag' | 'general';
  slug?: string;
  count?: number;
}

interface AdvancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: string) => void;
  placeholder?: string;
  className?: string;
  showTrending?: boolean;
}

export function AdvancedSearchBar({
  value,
  onChange,
  onSearch,
  onCategorySelect,
  placeholder = 'Search wallpapers...',
  className = '',
  showTrending = true
}: AdvancedSearchBarProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Fetch trending searches on mount
  useEffect(() => {
    if (showTrending) {
      fetchTrending();
    }
  }, [showTrending]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        if (showTrending && trending.length > 0) {
          setSuggestions(trending);
        } else {
          setSuggestions([]);
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('search-autocomplete', {
          body: { query, limit: 8 }
        });

        if (error) throw error;

        if (data?.data?.suggestions) {
          setSuggestions(data.data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [showTrending, trending]
  );

  // Fetch trending searches
  const fetchTrending = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: { action: 'get_trending' }
      });

      if (error) throw error;

      if (data?.data?.trending) {
        const trendingSuggestions = data.data.trending.map((item: any) => ({
          text: item.search_term,
          type: 'trending' as const,
          count: item.search_count
        }));
        setTrending(trendingSuggestions);
        
        // Set as initial suggestions if no current value
        if (!value) {
          setSuggestions(trendingSuggestions);
        }
      }
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setIsLoading(true);
    debouncedSearch(newValue);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category' && suggestion.slug && onCategorySelect) {
      onCategorySelect(suggestion.slug);
    } else {
      onChange(suggestion.text);
      if (onSearch) {
        onSearch(suggestion.text);
      }
    }
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSearch) {
      onSearch(value.trim());
    }
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (value.trim() && onSearch) {
          onSearch(value.trim());
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setShowSuggestions(true);
    if (suggestions.length === 0) {
      debouncedSearch(value);
    }
  };

  // Clear search
  const clearSearch = () => {
    onChange('');
    setSuggestions(trending);
    inputRef.current?.focus();
  };

  // Get suggestion icon
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'category':
        return <Hash className="w-4 h-4 text-blue-500" />;
      case 'tag':
        return <Tag className="w-4 h-4 text-green-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full max-w-2xl ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-3 md:py-4 border-2 border-gray-200 rounded-xl 
                     focus:border-gray-500 focus:outline-none transition duration-200 
                     text-base md:text-lg bg-white shadow-sm text-gray-900 placeholder-gray-500"
          />
          
          {value && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 
                       hover:text-gray-600 transition duration-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="md:hidden absolute -right-12 top-1/2 transform -translate-y-1/2 
                   p-2 text-gray-500 hover:text-gray-700 transition duration-200"
        >
          <Filter className="w-6 h-6" />
        </button>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 
                   rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mx-auto"></div>
              <span className="block mt-2">Searching...</span>
            </div>
          ) : (
            <>
              {/* Suggestions Header */}
              {suggestions.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-500 font-medium">
                  {value.length < 2 ? 'Trending Searches' : 'Suggestions'}
                </div>
              )}
              
              {/* Suggestions List */}
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center 
                           justify-between transition duration-150 ${
                             index === selectedIndex ? 'bg-purple-50 text-gray-700' : 'text-gray-700'
                           }`}
                >
                  <div className="flex items-center space-x-3">
                    {getSuggestionIcon(suggestion.type)}
                    <span className="font-medium">{suggestion.text}</span>
                    {suggestion.type === 'category' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Category
                      </span>
                    )}
                    {suggestion.type === 'tag' && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Tag
                      </span>
                    )}
                  </div>
                  
                  {suggestion.count && suggestion.type === 'trending' && (
                    <span className="text-xs text-gray-400">
                      {suggestion.count.toLocaleString()} searches
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
