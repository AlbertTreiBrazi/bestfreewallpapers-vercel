// Cache management component for admin panel
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Trash2, Clock, CheckCircle, AlertCircle, BarChart3, Server, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CacheStats {
  pending: number;
  processed: number;
  total: number;
  recent: Array<{
    path: string;
    invalidation_type: string;
    processed: boolean;
    created_at: string;
  }>;
}

interface PerformanceStats {
  totalLogs: number;
  avgResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

export function CacheManagement() {
  const { theme } = useTheme();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load cache statistics from new admin-cache-management endpoint
  const loadCacheStats = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-cache-management`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      const data = result.data;
      
      setCacheStats({
        pending: data.pending,
        processed: data.processed,
        total: data.total,
        recent: data.recent
      });
      
      setPerformanceStats(data.performance);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      // FIXED: Don't show fake data - display proper error state
      toast.error('Failed to load cache statistics');
      // Set empty state to show error UI instead of fake data
      setCacheStats(null);
      setPerformanceStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Performance stats are now loaded together with cache stats
  const loadPerformanceStats = () => {
    // This function is now integrated into loadCacheStats
    // No separate loading needed
  };

  // Process pending cache invalidations
  const processPendingInvalidations = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-cache-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'warm_cache'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      toast.success(result.message || 'Cache processing completed');
      
      // Reload stats
      loadCacheStats();
    } catch (error) {
      console.error('Failed to process invalidations:', error);
      toast.error('Failed to process pending invalidations');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all caches
  const clearAllCaches = async () => {
    if (!confirm('Are you sure you want to clear all caches? This will affect site performance temporarily.')) {
      return;
    }

    try {
      setIsClearing(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-cache-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'full_purge'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      toast.success(result.message || 'All caches cleared successfully');
      
      // Reload stats
      loadCacheStats();
    } catch (error) {
      console.error('Failed to clear caches:', error);
      toast.error('Failed to clear all caches');
    } finally {
      setIsClearing(false);
    }
  };

  // Load data on component mount with proper rendering
  useEffect(() => {
    // Add a small delay to ensure proper SPA navigation rendering
    const timer = setTimeout(() => {
      loadCacheStats();
      loadPerformanceStats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  const getStatusColor = (processed: boolean) => {
    return processed ? 'text-green-500' : 'text-yellow-500';
  };

  const getStatusIcon = (processed: boolean) => {
    return processed ? CheckCircle : Clock;
  };

  return (
    <div className={cn(
      'p-6 rounded-lg border',
      theme === 'dark' 
        ? 'bg-dark-secondary border-dark-border' 
        : 'bg-white border-gray-200'
    )}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={cn(
          'text-xl font-semibold',
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}>
          Cache & Performance Management
        </h2>
        
        <div className="flex space-x-2">
          <button
            onClick={processPendingInvalidations}
            disabled={isProcessing || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              'bg-blue-600 hover:bg-blue-700 text-white',
              (isProcessing || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', (isProcessing || isLoading) && 'animate-spin')} />
            <span>{isProcessing ? 'Processing...' : 'Process Pending'}</span>
          </button>
          
          <button
            onClick={clearAllCaches}
            disabled={isClearing || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              (isClearing || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Trash2 className={cn('w-4 h-4', isClearing && 'animate-pulse')} />
            <span>{isClearing ? 'Clearing...' : 'Clear All Cache'}</span>
          </button>
          
          <button
            onClick={() => { loadCacheStats(); loadPerformanceStats(); }}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              'bg-gray-600 hover:bg-gray-700 text-white',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Activity className={cn('w-4 h-4', isLoading && 'animate-pulse')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={cn(
          'p-4 rounded-lg mb-6 flex items-center space-x-2',
          message.type === 'success'
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-red-100 text-red-700 border border-red-200'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Statistics */}
        <div className={cn(
          'p-4 rounded-lg border',
          theme === 'dark' 
            ? 'bg-dark-tertiary border-dark-border' 
            : 'bg-gray-50 border-gray-200'
        )}>
          <h3 className={cn(
            'font-semibold mb-4 flex items-center space-x-2',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            <RefreshCw className="w-4 h-4" />
            <span>Cache Statistics</span>
          </h3>
          
          {cacheStats ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Pending Invalidations:
                </span>
                <span className={cn(
                  'font-semibold',
                  cacheStats.pending > 0 ? 'text-yellow-500' : 'text-green-500'
                )}>
                  {cacheStats.pending}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Processed:
                </span>
                <span className="text-green-500 font-semibold">
                  {cacheStats.processed}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Total Requests:
                </span>
                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                  {cacheStats.total}
                </span>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          )}
        </div>

        {/* Performance Statistics */}
        <div className={cn(
          'p-4 rounded-lg border',
          theme === 'dark' 
            ? 'bg-dark-tertiary border-dark-border' 
            : 'bg-gray-50 border-gray-200'
        )}>
          <h3 className={cn(
            'font-semibold mb-4 flex items-center space-x-2',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            <BarChart3 className="w-4 h-4" />
            <span>Performance Metrics</span>
          </h3>
          
          {performanceStats ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Total Logs:
                </span>
                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                  {performanceStats.totalLogs}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Avg Response Time:
                </span>
                <span className={cn(
                  'font-semibold',
                  performanceStats.avgResponseTime < 200 ? 'text-green-500' : 'text-yellow-500'
                )}>
                  {performanceStats.avgResponseTime.toFixed(0)}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Cache Hit Rate:
                </span>
                <span className={cn(
                  'font-semibold',
                  performanceStats.cacheHitRate > 0.8 ? 'text-green-500' : 'text-yellow-500'
                )}>
                  {(performanceStats.cacheHitRate * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Error Rate:
                </span>
                <span className={cn(
                  'font-semibold',
                  performanceStats.errorRate < 0.05 ? 'text-green-500' : 'text-red-500'
                )}>
                  {(performanceStats.errorRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Cache Invalidations */}
      {cacheStats?.recent && cacheStats.recent.length > 0 && (
        <div className="mt-6">
          <h3 className={cn(
            'font-semibold mb-4 flex items-center justify-between',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            <span>Recent Cache Invalidations</span>
            <span className={cn(
              'text-sm font-normal',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              {cacheStats.recent.length} total entries
            </span>
          </h3>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(() => {
              // Group consecutive entries with identical timestamps
              const grouped: Array<{
                timestamp: string;
                items: typeof cacheStats.recent;
              }> = [];
              
              cacheStats.recent.forEach((item) => {
                const lastGroup = grouped[grouped.length - 1];
                if (lastGroup && lastGroup.timestamp === item.created_at) {
                  lastGroup.items.push(item);
                } else {
                  grouped.push({
                    timestamp: item.created_at,
                    items: [item]
                  });
                }
              });
              
              return grouped.map((group, groupIndex) => {
                // If multiple items share the same timestamp, show them grouped
                if (group.items.length > 1) {
                  return (
                    <div key={groupIndex} className="space-y-1">
                      <div className={cn(
                        'text-xs font-medium px-2 py-1',
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {new Date(group.timestamp).toLocaleString()} ({group.items.length} simultaneous invalidations)
                      </div>
                      {group.items.map((item, itemIndex) => {
                        const StatusIcon = getStatusIcon(item.processed);
                        return (
                          <div
                            key={`${groupIndex}-${itemIndex}`}
                            className={cn(
                              'flex items-center justify-between p-2 pl-6 rounded-lg border-l-2',
                              theme === 'dark'
                                ? 'bg-dark-tertiary border-dark-border'
                                : 'bg-gray-50 border-gray-300'
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <StatusIcon className={cn('w-3 h-3', getStatusColor(item.processed))} />
                              <div>
                                <div className={cn(
                                  'text-sm',
                                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                                )}>
                                  {item.path}
                                </div>
                                <div className={cn(
                                  'text-xs',
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                                )}>
                                  {item.invalidation_type}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                
                // Single item - display normally
                const item = group.items[0];
                const StatusIcon = getStatusIcon(item.processed);
                return (
                  <div
                    key={groupIndex}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      theme === 'dark'
                        ? 'bg-dark-tertiary border-dark-border'
                        : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={cn('w-4 h-4', getStatusColor(item.processed))} />
                      <div>
                        <div className={cn(
                          'font-medium',
                          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        )}>
                          {item.path}
                        </div>
                        <div className={cn(
                          'text-sm',
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        )}>
                          {item.invalidation_type}
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn(
                      'text-sm',
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
