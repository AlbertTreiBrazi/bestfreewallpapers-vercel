// Network Status Component - Phase 3 Priority 4
// Monitor network connectivity and show appropriate UI

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import monitoringService from '../../services/monitoringService'
import reliabilityService from '../../services/reliabilityService'

interface NetworkStatusProps {
  onNetworkChange?: (isOnline: boolean) => void
  showOfflineMessage?: boolean
  position?: 'top' | 'bottom'
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  onNetworkChange,
  showOfflineMessage = true,
  position = 'top'
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showStatus, setShowStatus] = useState(false)
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown')
  const [lastOfflineTime, setLastOfflineTime] = useState<number | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowStatus(true)
      
      // Calculate offline duration
      const offlineDuration = lastOfflineTime ? Date.now() - lastOfflineTime : 0
      
      // Track network restoration
      monitoringService.trackBusinessEvent({
        event_type: 'network_restored',
        url: window.location.href,
        metadata: {
          offline_duration_ms: offlineDuration,
          timestamp: Date.now()
        }
      })
      
      if (onNetworkChange) {
        onNetworkChange(true)
      }
      
      // Auto-hide status after 3 seconds
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
      setLastOfflineTime(Date.now())
      
      // Track network loss
      monitoringService.trackBusinessEvent({
        event_type: 'network_lost',
        url: window.location.href,
        metadata: {
          timestamp: Date.now(),
          page_url: window.location.href
        }
      })
      
      if (onNetworkChange) {
        onNetworkChange(false)
      }
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection speed
    checkConnectionSpeed()

    // Set up periodic connection monitoring
    const connectionMonitor = setInterval(() => {
      if (navigator.onLine) {
        checkConnectionSpeed()
      }
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(connectionMonitor)
    }
  }, [onNetworkChange, lastOfflineTime])

  const checkConnectionSpeed = async () => {
    try {
      const startTime = Date.now()
      
      // Fetch a small image to test connection speed
      await fetch('/favicon.ico', {
        cache: 'no-store',
        mode: 'no-cors'
      })
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      const speed = responseTime < 1000 ? 'fast' : 'slow'
      setConnectionSpeed(speed)
      
      // Track connection speed
      monitoringService.trackPerformance({
        name: 'connection_speed_test',
        value: responseTime,
        rating: speed === 'fast' ? 'good' : 'poor',
        timestamp: Date.now(),
        metadata: {
          connection_speed: speed,
          response_time: responseTime
        }
      })
      
    } catch (error) {
      setConnectionSpeed('slow')
      console.warn('Connection speed check failed:', error)
    }
  }

  const handleRefresh = () => {
    // Track refresh attempt
    monitoringService.trackBusinessEvent({
      event_type: 'network_status_refresh',
      url: window.location.href,
      metadata: {
        is_online: isOnline,
        connection_speed: connectionSpeed
      }
    })
    
    window.location.reload()
  }

  const getOfflineFallback = () => {
    return reliabilityService.getOfflineFallback()
  }

  if (!showOfflineMessage && !showStatus) {
    return null
  }

  // Don't show if online and not explicitly showing status
  if (isOnline && !showStatus) {
    return null
  }

  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0' 
    : 'bottom-0 left-0 right-0'

  return (
    <div className={`fixed ${positionClasses} z-50 transition-transform duration-300`}>
      {!isOnline && (
        <div className="bg-red-600 text-white p-3 shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <WifiOff className="w-5 h-5" />
                <div>
                  <p className="font-medium">You're offline</p>
                  <p className="text-sm text-red-100">
                    Some features may not work properly. Check your internet connection.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                
                <button
                  onClick={() => setShowStatus(false)}
                  className="text-red-200 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Offline guidance */}
            <div className="mt-3 text-sm text-red-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {getOfflineFallback().actions.map((action, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <span className="w-1 h-1 bg-red-200 rounded-full"></span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isOnline && showStatus && (
        <div className="bg-green-600 text-white p-2 shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Back online
                  {connectionSpeed !== 'unknown' && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      connectionSpeed === 'fast' 
                        ? 'bg-green-700 text-green-100' 
                        : 'bg-yellow-700 text-yellow-100'
                    }`}>
                      {connectionSpeed === 'fast' ? 'Fast connection' : 'Slow connection'}
                    </span>
                  )}
                </span>
              </div>
              
              <button
                onClick={() => setShowStatus(false)}
                className="text-green-200 hover:text-white"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NetworkStatus
