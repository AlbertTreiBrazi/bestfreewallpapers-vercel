// Enhanced Cache & Performance Management Component
// Real-time dashboard with comprehensive monitoring and controls

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Server, 
  Database, 
  Zap,
  Download,
  AlertTriangle,
  Globe,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CacheStats {
  pending: number;
  processed: number;
  total: number;
  hit_rate: number;
  miss_rate: number;
  recent: Array<{
    path: string;
    invalidation_type: string;
    processed: boolean;
    created_at: string;
  }>;
}

interface PerformanceMetrics {
  web_vitals: {
    lcp: { average: number; p95: number };
    fid: { average: number; p95: number };
    cls: { average: number; p95: number };
    ttfb: { average: number; p95: number };
  };
  server_metrics: {
    response_time: { average: number; p95: number };
    error_rate: number;
    success_rate: number;
  };
  database_metrics: {
    query_time: { average: number; p95: number };
    connection_count: number;
  };
  edge_function_metrics: {
    execution_time: { average: number; p95: number };
    invocation_count: number;
    error_count: number;
  };
}

interface SystemAlert {
  id: number;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
}

interface ComprehensiveStats {
  cache: CacheStats;
  performance: PerformanceMetrics;
  alerts: SystemAlert[];
  last_updated: string;
}

export function EnhancedCacheManagement() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'cache' | 'performance' | 'alerts'>('overview');
  const [bulkPaths, setBulkPaths] = useState('');
  const [warmingUrls, setWarmingUrls] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load comprehensive statistics
  const loadStats = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('cache-performance-manager', {
        body: { action: 'GET_COMPREHENSIVE_STATS' }
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      showMessage('error', 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Process pending cache invalidations
  const processPendingInvalidations = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
        body: { action: 'PROCESS_PENDING' }
      });

      if (error) throw error;
      
      showMessage('success', `Processed ${data.processed} of ${data.total} pending invalidations`);
      loadStats();
    } catch (error) {
      console.error('Failed to process invalidations:', error);
      showMessage('error', 'Failed to process pending invalidations');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk cache invalidation
  const handleBulkInvalidation = async () => {
    if (!bulkPaths.trim()) {
      showMessage('error', 'Please enter paths to invalidate');
      return;
    }

    const paths = bulkPaths.split('\n').map(p => p.trim()).filter(p => p);
    
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('cache-performance-manager', {
        body: { 
          action: 'INVALIDATE_CACHE_BULK',
          paths,
          priority: 'high'
        }
      });

      if (error) throw error;
      
      showMessage('success', `Queued ${data.queued_paths} paths for invalidation`);
      setBulkPaths('');
      loadStats();
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      showMessage('error', 'Failed to queue cache invalidation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cache warming
  const handleCacheWarming = async () => {
    if (!warmingUrls.trim()) {
      showMessage('error', 'Please enter URLs to warm');
      return;
    }

    const urls = warmingUrls.split('\n').map(u => u.trim()).filter(u => u);
    
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('cache-performance-manager', {
        body: { 
          action: 'WARM_CACHE',
          urls
        }
      });

      if (error) throw error;
      
      const successful = data.results.filter(r => r.status === 'warmed').length;
      showMessage('success', `Successfully warmed ${successful} of ${urls.length} URLs`);
      setWarmingUrls('');
    } catch (error) {
      console.error('Failed to warm cache:', error);
      showMessage('error', 'Failed to warm cache');
    } finally {
      setIsProcessing(false);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: number) => {
    try {
      const { error } = await supabase.functions.invoke('cache-performance-manager', {
        body: { 
          action: 'ACKNOWLEDGE_ALERT',
          alert_id: alertId,
          admin_user_id: 'current-admin-id' // TODO: Get from auth context
        }
      });

      if (error) throw error;
      
      showMessage('success', 'Alert acknowledged');
      loadStats();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      showMessage('error', 'Failed to acknowledge alert');
    }
  };

  // Helper function to show messages
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    if (type === 'success') {
      toast.success(text);
    } else if (type === 'error') {
      toast.error(text);
    } else {
      toast(text);
    }
  };

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    loadStats();
    
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className={cn(
      'p-6 rounded-lg border',
      theme === 'dark' 
        ? 'bg-dark-secondary border-dark-border' 
        : 'bg-white border-gray-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={cn(
            'text-xl font-semibold',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Cache & Performance Management
          </h2>
          <p className={cn(
            'text-sm mt-1',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>
            Real-time monitoring and control system
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              theme === 'dark'
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
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
            : message.type === 'error'
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-blue-100 text-blue-700 border border-blue-200'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : message.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1">
          {[{id: 'overview', label: 'Overview', icon: Activity}, 
            {id: 'cache', label: 'Cache Control', icon: Server}, 
            {id: 'performance', label: 'Performance', icon: BarChart3}, 
            {id: 'alerts', label: 'Alerts', icon: AlertTriangle}].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors',
                  selectedTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Cache Hit Rate */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-blue-500" />
                <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>Cache Hit Rate</span>
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">
              {stats.cache.hit_rate.toFixed(1)}%
            </div>
            <div className={cn('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
              {stats.cache.total} total requests
            </div>
          </div>

          {/* Performance Score */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>LCP Average</span>
              </div>
              <TrendingDown className="w-4 h-4 text-green-500" />
            </div>
            <div className={cn(
              'text-2xl font-bold',
              getMetricColor(stats.performance.web_vitals.lcp.average, { good: 2500, warning: 4000 })
            )}>
              {Math.round(stats.performance.web_vitals.lcp.average)}ms
            </div>
            <div className={cn('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
              Core Web Vitals
            </div>
          </div>

          {/* Error Rate */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>Error Rate</span>
              </div>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              stats.performance.server_metrics.error_rate < 0.05 ? 'text-green-500' : 'text-red-500'
            )}>
              {(stats.performance.server_metrics.error_rate * 100).toFixed(2)}%
            </div>
            <div className={cn('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
              Last 24 hours
            </div>
          </div>

          {/* Active Alerts */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>Active Alerts</span>
              </div>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              stats.alerts.length > 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {stats.alerts.length}
            </div>
            <div className={cn('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
              Unacknowledged
            </div>
          </div>
        </div>
      )}

      {/* Cache Control Tab */}
      {selectedTab === 'cache' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <h3 className={cn('font-semibold mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={processPendingInvalidations}
                disabled={isProcessing}
                className={cn(
                  'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
                  'bg-blue-600 hover:bg-blue-700 text-white',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('w-4 h-4', isProcessing && 'animate-spin')} />
                <span>Process Pending</span>
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Clear all cache? This will affect performance temporarily.')) {
                    // Call clear all cache function
                  }
                }}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Cache</span>
              </button>
            </div>
          </div>

          {/* Bulk Cache Invalidation */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <h3 className={cn('font-semibold mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Bulk Cache Invalidation</h3>
            <div className="space-y-3">
              <textarea
                value={bulkPaths}
                onChange={(e) => setBulkPaths(e.target.value)}
                placeholder="Enter cache paths to invalidate (one per line):\n/images/wallpaper-123.jpg\n/api/wallpapers/*\n/categories/nature/*"
                className={cn(
                  'w-full p-3 rounded-lg border resize-none',
                  theme === 'dark'
                    ? 'bg-dark-secondary border-dark-border text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
                rows={4}
              />
              <button
                onClick={handleBulkInvalidation}
                disabled={isProcessing || !bulkPaths.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
                  'bg-orange-600 hover:bg-orange-700 text-white',
                  (isProcessing || !bulkPaths.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span>Invalidate Paths</span>
              </button>
            </div>
          </div>

          {/* Cache Warming */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <h3 className={cn('font-semibold mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Cache Warming</h3>
            <div className="space-y-3">
              <textarea
                value={warmingUrls}
                onChange={(e) => setWarmingUrls(e.target.value)}
                placeholder="Enter URLs to warm (one per line):\nhttps://example.com/popular-page\nhttps://example.com/api/trending"
                className={cn(
                  'w-full p-3 rounded-lg border resize-none',
                  theme === 'dark'
                    ? 'bg-dark-secondary border-dark-border text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
                rows={4}
              />
              <button
                onClick={handleCacheWarming}
                disabled={isProcessing || !warmingUrls.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
                  'bg-green-600 hover:bg-green-700 text-white',
                  (isProcessing || !warmingUrls.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Zap className="w-4 h-4" />
                <span>Warm Cache</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {selectedTab === 'performance' && stats && (
        <div className="space-y-6">
          {/* Web Vitals */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
          )}>
            <h3 className={cn('font-semibold mb-4 flex items-center space-x-2', theme === 'dark' ? 'text-white' : 'text-gray-900')}>              <Globe className="w-4 h-4" />
              <span>Core Web Vitals</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold mb-1',
                  getMetricColor(stats.performance.web_vitals.lcp.average, { good: 2500, warning: 4000 })
                )}>
                  {Math.round(stats.performance.web_vitals.lcp.average)}ms
                </div>
                <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>LCP (Largest Contentful Paint)</div>
                <div className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-500')}>P95: {Math.round(stats.performance.web_vitals.lcp.p95)}ms</div>
              </div>
              
              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold mb-1',
                  getMetricColor(stats.performance.web_vitals.fid.average, { good: 100, warning: 300 })
                )}>
                  {Math.round(stats.performance.web_vitals.fid.average)}ms
                </div>
                <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>FID (First Input Delay)</div>
                <div className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-500')}>P95: {Math.round(stats.performance.web_vitals.fid.p95)}ms</div>
              </div>
              
              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold mb-1',
                  getMetricColor(stats.performance.web_vitals.cls.average * 1000, { good: 100, warning: 250 })
                )}>
                  {stats.performance.web_vitals.cls.average.toFixed(3)}
                </div>
                <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>CLS (Cumulative Layout Shift)</div>
                <div className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-500')}>P95: {stats.performance.web_vitals.cls.p95.toFixed(3)}</div>
              </div>
              
              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold mb-1',
                  getMetricColor(stats.performance.web_vitals.ttfb.average, { good: 600, warning: 1000 })
                )}>
                  {Math.round(stats.performance.web_vitals.ttfb.average)}ms
                </div>
                <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>TTFB (Time to First Byte)</div>
                <div className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-500')}>P95: {Math.round(stats.performance.web_vitals.ttfb.p95)}ms</div>
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Server Metrics */}
            <div className={cn(
              'p-4 rounded-lg border',
              theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
            )}>
              <h4 className={cn('font-semibold mb-3 flex items-center space-x-2', theme === 'dark' ? 'text-white' : 'text-gray-900')}>                <Server className="w-4 h-4" />
                <span>Server</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Response Time:</span>
                  <span className="text-sm font-medium">{Math.round(stats.performance.server_metrics.response_time.average)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Success Rate:</span>
                  <span className="text-sm font-medium text-green-500">{(stats.performance.server_metrics.success_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Error Rate:</span>
                  <span className={cn(
                    'text-sm font-medium',
                    stats.performance.server_metrics.error_rate < 0.05 ? 'text-green-500' : 'text-red-500'
                  )}>{(stats.performance.server_metrics.error_rate * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Database Metrics */}
            <div className={cn(
              'p-4 rounded-lg border',
              theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
            )}>
              <h4 className={cn('font-semibold mb-3 flex items-center space-x-2', theme === 'dark' ? 'text-white' : 'text-gray-900')}>                <Database className="w-4 h-4" />
                <span>Database</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Query Time:</span>
                  <span className="text-sm font-medium">{Math.round(stats.performance.database_metrics.query_time.average)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>P95 Query Time:</span>
                  <span className="text-sm font-medium">{Math.round(stats.performance.database_metrics.query_time.p95)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Connections:</span>
                  <span className="text-sm font-medium">{stats.performance.database_metrics.connection_count}</span>
                </div>
              </div>
            </div>

            {/* Edge Functions */}
            <div className={cn(
              'p-4 rounded-lg border',
              theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
            )}>
              <h4 className={cn('font-semibold mb-3 flex items-center space-x-2', theme === 'dark' ? 'text-white' : 'text-gray-900')}>                <Zap className="w-4 h-4" />
                <span>Edge Functions</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Execution Time:</span>
                  <span className="text-sm font-medium">{Math.round(stats.performance.edge_function_metrics.execution_time.average)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Invocations:</span>
                  <span className="text-sm font-medium">{stats.performance.edge_function_metrics.invocation_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Errors:</span>
                  <span className={cn(
                    'text-sm font-medium',
                    stats.performance.edge_function_metrics.error_count > 0 ? 'text-red-500' : 'text-green-500'
                  )}>{stats.performance.edge_function_metrics.error_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {selectedTab === 'alerts' && stats && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={cn('font-semibold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>System Alerts</h3>
            <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
              {stats.alerts.length} alert{stats.alerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {stats.alerts.length === 0 ? (
            <div className={cn(
              'text-center py-8',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
              <p className="text-sm">System is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-4 rounded-lg border flex items-start justify-between',
                    getSeverityColor(alert.severity)
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold capitalize">{alert.severity}</span>
                      <span className="text-sm opacity-75">•</span>
                      <span className="text-sm opacity-75">{alert.alert_type}</span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-xs opacity-75">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.acknowledged && (
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Acknowledged</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-4 px-3 py-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded text-xs font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last Updated */}
      <div className={cn(
        'mt-6 pt-4 border-t text-center text-xs',
        theme === 'dark' 
          ? 'border-dark-border text-gray-400' 
          : 'border-gray-200 text-gray-500'
      )}>
        {stats && (
          <div className="flex items-center justify-center space-x-2">
            <Timer className="w-3 h-3" />
            <span>Last updated: {new Date(stats.last_updated).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
