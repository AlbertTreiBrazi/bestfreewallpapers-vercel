// Performance Charts Component
// Real-time performance visualizations and metrics

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface ChartData {
  lcp: MetricPoint[];
  fid: MetricPoint[];
  cls: MetricPoint[];
  ttfb: MetricPoint[];
  error_rate: MetricPoint[];
  cache_hit_rate: MetricPoint[];
}

export function PerformanceCharts() {
  const { theme } = useTheme();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(false);

  // Load chart data
  const loadChartData = async () => {
    try {
      setLoading(true);
      
      // Calculate time range based on selected period
      let hoursBack = 24;
      switch (selectedPeriod) {
        case '1h': hoursBack = 1; break;
        case '24h': hoursBack = 24; break;
        case '7d': hoursBack = 168; break;
      }
      
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      
      // Get performance metrics
      const { data: perfData, error: perfError } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', startTime)
        .order('created_at', { ascending: true });
        
      if (perfError) throw perfError;
      
      // Get cache statistics
      const { data: cacheData, error: cacheError } = await supabase
        .from('cache_statistics')
        .select('*')
        .gte('created_at', startTime)
        .order('created_at', { ascending: true });
        
      if (cacheError) throw cacheError;
      
      // Process data for charts
      const processedData: ChartData = {
        lcp: processMetricData(perfData, 'LCP'),
        fid: processMetricData(perfData, 'FID'),
        cls: processMetricData(perfData, 'CLS'),
        ttfb: processMetricData(perfData, 'TTFB'),
        error_rate: processMetricData(perfData, 'error_rate'),
        cache_hit_rate: processMetricData(cacheData, 'hit_rate')
      };
      
      setChartData(processedData);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process metric data for chart display
  const processMetricData = (data: any[], metricName: string): MetricPoint[] => {
    return data
      .filter(item => item.metric_name === metricName || item.metric_type === metricName)
      .map(item => ({
        timestamp: item.created_at,
        value: Number(item.metric_value)
      }))
      .slice(-50); // Limit to last 50 points for performance
  };

  // Generate simple bar chart visualization
  const renderSimpleChart = (data: MetricPoint[], color: string, label: string, unit: string = '', threshold?: number) => {
    if (!data || data.length === 0) {
      return (
        <div className={cn(
          'h-24 rounded-lg border flex items-center justify-center',
          theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
        )}>
          <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>No data available</span>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    return (
      <div className={cn(
        'p-4 rounded-lg border',
        theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-white' : 'text-gray-900')}>{label}</span>
          <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
            {data[data.length - 1]?.value.toFixed(label.includes('CLS') ? 3 : 0)}{unit}
          </span>
        </div>
        
        {/* Simple bar chart */}
        <div className="flex items-end space-x-1 h-16">
          {data.slice(-20).map((point, index) => {
            const height = Math.max(4, ((point.value - minValue) / range) * 60);
            const isAboveThreshold = threshold && point.value > threshold;
            
            return (
              <div
                key={index}
                className={cn(
                  'flex-1 rounded-sm transition-colors',
                  isAboveThreshold ? 'bg-red-400' : color
                )}
                style={{ height: `${height}px` }}
                title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.value.toFixed(2)}${unit}`}
              />
            );
          })}
        </div>
        
        {/* Threshold line indicator */}
        {threshold && (
          <div className="mt-2 text-xs text-center">
            <span className={cn(
              'px-2 py-1 rounded',
              data[data.length - 1]?.value > threshold 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            )}>
              Threshold: {threshold}{unit}
            </span>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadChartData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadChartData, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  return (
    <div className={cn(
      'p-6 rounded-lg border',
      theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className={cn('text-lg font-semibold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Performance Charts</h3>
        </div>
        
        {/* Time Period Selector */}
        <div className="flex rounded-lg border overflow-hidden">
          {[{id: '1h', label: '1H'}, {id: '24h', label: '24H'}, {id: '7d', label: '7D'}].map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id as any)}
              className={cn(
                'px-3 py-1 text-sm font-medium transition-colors',
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-dark-tertiary text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Charts Grid */}
      {!loading && chartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Core Web Vitals */}
          {renderSimpleChart(
            chartData.lcp, 
            'bg-blue-400', 
            'Largest Contentful Paint (LCP)', 
            'ms', 
            2500
          )}
          
          {renderSimpleChart(
            chartData.fid, 
            'bg-green-400', 
            'First Input Delay (FID)', 
            'ms', 
            100
          )}
          
          {renderSimpleChart(
            chartData.cls, 
            'bg-yellow-400', 
            'Cumulative Layout Shift (CLS)', 
            '', 
            0.1
          )}
          
          {renderSimpleChart(
            chartData.ttfb, 
            'bg-purple-400', 
            'Time to First Byte (TTFB)', 
            'ms', 
            600
          )}
          
          {/* System Metrics */}
          {renderSimpleChart(
            chartData.error_rate, 
            'bg-red-400', 
            'Error Rate', 
            '%', 
            5
          )}
          
          {renderSimpleChart(
            chartData.cache_hit_rate, 
            'bg-indigo-400', 
            'Cache Hit Rate', 
            '%'
          )}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && chartData && (
        <div className={cn(
          'mt-6 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4 text-center',
          theme === 'dark' ? 'border-dark-border' : 'border-gray-200'
        )}>
          <div>
            <div className={cn('text-2xl font-bold text-blue-500')}>
              {chartData.lcp[chartData.lcp.length - 1]?.value.toFixed(0) || 'N/A'}
            </div>
            <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Current LCP (ms)</div>
          </div>
          
          <div>
            <div className={cn('text-2xl font-bold text-green-500')}>
              {chartData.fid[chartData.fid.length - 1]?.value.toFixed(0) || 'N/A'}
            </div>
            <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Current FID (ms)</div>
          </div>
          
          <div>
            <div className={cn('text-2xl font-bold text-purple-500')}>
              {chartData.ttfb[chartData.ttfb.length - 1]?.value.toFixed(0) || 'N/A'}
            </div>
            <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Current TTFB (ms)</div>
          </div>
          
          <div>
            <div className={cn('text-2xl font-bold text-indigo-500')}>
              {chartData.cache_hit_rate[chartData.cache_hit_rate.length - 1]?.value.toFixed(1) || 'N/A'}%
            </div>
            <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Cache Hit Rate</div>
          </div>
        </div>
      )}
      
      {/* Last Updated */}
      <div className={cn(
        'mt-4 text-center text-xs flex items-center justify-center space-x-1',
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      )}>
        <Clock className="w-3 h-3" />
        <span>Auto-refreshes every 30 seconds</span>
      </div>
    </div>
  );
}
