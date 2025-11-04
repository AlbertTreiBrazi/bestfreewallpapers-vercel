import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, XCircle, Clock, Server, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CacheInvalidation {
  id: string;
  path: string;
  invalidation_type: string;
  status: 'pending' | 'processed' | 'error';
  created_at: string;
  processed_at?: string;
  metadata?: any;
}

interface CacheStats {
  pending: number;
  processed: number;
  errors: number;
  total: number;
  success_rate: number;
  recent: CacheInvalidation[];
}

export function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [customPaths, setCustomPaths] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load cache statistics
  const loadCacheStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
        body: { action: 'GET_CACHE_STATUS' }
      });

      if (error) {
        throw error;
      }

      setStats(data.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast.error('Failed to load cache statistics');
    } finally {
      setLoading(false);
    }
  };

  // Process pending invalidations
  const processPendingInvalidations = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
        body: { action: 'PROCESS_PENDING' }
      });

      if (error) {
        throw error;
      }

      const result = data.data;
      toast.success(`Processed ${result.total_processed} cache invalidations`);
      
      // Refresh stats
      await loadCacheStats();
    } catch (error) {
      console.error('Failed to process cache invalidations:', error);
      toast.error('Failed to process pending invalidations');
    } finally {
      setProcessing(false);
    }
  };

  // Clear all cache (emergency function)
  const clearAllCache = async () => {
    if (!confirm('Are you sure you want to clear ALL cache? This will purge the entire CDN cache and may temporarily impact performance.')) {
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
        body: { action: 'CLEAR_ALL_CACHE' }
      });

      if (error) {
        throw error;
      }

      if (data.data.success) {
        toast.success('All cache cleared successfully');
      } else {
        toast.error('Failed to clear cache');
      }
      
      // Refresh stats
      await loadCacheStats();
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setProcessing(false);
    }
  };

  // Invalidate custom paths
  const invalidateCustomPaths = async () => {
    if (!customPaths.trim()) {
      toast.error('Please enter paths to invalidate');
      return;
    }

    const paths = customPaths.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    
    if (paths.length === 0) {
      toast.error('No valid paths provided');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
        body: { 
          action: 'INVALIDATE_PATHS',
          paths: paths.map(path => `https://4d6j5atcx4pd.space.minimax.io${path.startsWith('/') ? path : '/' + path}`)
        }
      });

      if (error) {
        throw error;
      }

      if (data.data.success) {
        toast.success(`Successfully invalidated ${paths.length} paths`);
        setCustomPaths('');
      } else {
        toast.error('Failed to invalidate paths');
      }
      
      // Refresh stats
      await loadCacheStats();
    } catch (error) {
      console.error('Failed to invalidate custom paths:', error);
      toast.error('Failed to invalidate paths');
    } finally {
      setProcessing(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadCacheStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cache Management</h1>
          <p className="text-gray-600">Manage CDN cache invalidation and performance optimization</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadCacheStats}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Processed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Errors</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Success Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{stats.success_rate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Process Pending</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Process all pending cache invalidations in the queue.
          </p>
          <button
            onClick={processPendingInvalidations}
            disabled={processing || (stats?.pending || 0) === 0}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Processing...' : `Process ${stats?.pending || 0} Pending`}</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Invalidation</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Enter specific paths to invalidate manually.
          </p>
          <textarea
            value={customPaths}
            onChange={(e) => setCustomPaths(e.target.value)}
            placeholder="Enter paths (one per line):\n/\n/category/nature\n/wallpaper/sunset-beach"
            className="w-full h-20 p-3 border border-gray-300 rounded-md text-sm mb-3 resize-none"
          />
          <button
            onClick={invalidateCustomPaths}
            disabled={processing || !customPaths.trim()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Server className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Processing...' : 'Invalidate Paths'}</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Clear</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Clear all cached content. Use only when necessary.
          </p>
          <button
            onClick={clearAllCache}
            disabled={processing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <AlertTriangle className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Clearing...' : 'Clear All Cache'}</span>
          </button>
        </div>
      </div>

      {/* Recent Invalidations */}
      {stats?.recent && stats.recent.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invalidations</h3>
            <p className="text-gray-600 text-sm">Latest cache invalidation requests and their status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recent.map((invalidation) => (
                  <tr key={invalidation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invalidation.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invalidation.status)}`}>
                          {invalidation.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {invalidation.path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invalidation.invalidation_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invalidation.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invalidation.processed_at ? formatDate(invalidation.processed_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}