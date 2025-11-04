import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TrendingSearch {
  search_term: string;
  search_count: number;
  trend_score: number;
}

interface TrendingSearchesProps {
  onSearchSelect: (query: string) => void;
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

export function TrendingSearches({ 
  onSearchSelect, 
  className = '',
  limit = 8,
  showHeader = true
}: TrendingSearchesProps) {
  const [trending, setTrending] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingSearches();
  }, []);

  const fetchTrendingSearches = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: { action: 'get_trending' }
      });

      if (error) throw error;

      if (data?.data?.trending) {
        setTrending(data.data.trending.slice(0, limit));
      }
    } catch (error) {
      console.error('Error fetching trending searches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {showHeader && (
          <div className="h-6 bg-gray-300 rounded mb-4 w-48"></div>
        )}
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!trending.length) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {showHeader && (
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900">Trending Searches</h3>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {trending.map((item, index) => (
          <button
            key={item.search_term}
            onClick={() => onSearchSelect(item.search_term)}
            className="flex items-center justify-between p-3 text-left hover:bg-purple-50 
                     rounded-lg border border-gray-200 hover:border-purple-300 
                     transition duration-200 group"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r 
                            from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex-shrink-0">
                {index + 1}
              </div>
              <span className="font-medium text-gray-700 group-hover:text-gray-700 
                           truncate text-sm">
                {item.search_term}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <span className="text-xs text-gray-500 group-hover:text-gray-600">
                {item.search_count.toLocaleString()}
              </span>
              <Search className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
            </div>
          </button>
        ))}
      </div>
      
      {trending.length >= limit && (
        <div className="mt-4 text-center">
          <button
            onClick={fetchTrendingSearches}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Refresh trending
          </button>
        </div>
      )}
    </div>
  );
}
