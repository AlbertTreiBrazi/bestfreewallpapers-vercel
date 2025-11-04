// Service Status Component - Phase 3 Priority 4
// Display real-time system status and health information

import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, BarChart3 } from 'lucide-react'
import reliabilityService, { type ServiceStatus } from '../../services/reliabilityService'
import monitoringService, { type HealthStatus } from '../../services/monitoringService'
import deploymentManager, { type HealthCheckResult } from '../../utils/deploymentManager'

interface ServiceStatusProps {
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const ServiceStatusDisplay: React.FC<ServiceStatusProps> = ({
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({})
  const [systemHealth, setSystemHealth] = useState<HealthStatus | null>(null)
  const [deploymentHealth, setDeploymentHealth] = useState<HealthCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showStatusPanel, setShowStatusPanel] = useState(false)

  const fetchStatus = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all status information
      const [servicesStatus, healthStatus, deploymentHealthStatus] = await Promise.all([
        Promise.resolve(reliabilityService.getAllServicesStatus()),
        monitoringService.getHealthStatus(),
        deploymentManager.getDeploymentHealth()
      ])
      
      setServices(servicesStatus)
      setSystemHealth(healthStatus)
      setDeploymentHealth(deploymentHealthStatus)
      setLastUpdate(new Date())
      
    } catch (error) {
      console.error('Failed to fetch service status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'failed') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'failed') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getOverallHealth = () => {
    if (!systemHealth || !deploymentHealth) return 'unknown'
    
    const systemStatus = systemHealth.status
    const deploymentScore = deploymentHealth.score
    
    if (systemStatus === 'critical' || deploymentScore < 40) return 'critical'
    if (systemStatus === 'warning' || deploymentScore < 70) return 'degraded'
    return 'healthy'
  }

  const overallHealth = getOverallHealth()
  const healthyServicesCount = Object.values(services).filter(s => s.status === 'healthy').length
  const totalServicesCount = Object.values(services).length

  // Status indicator in bottom right corner
  const StatusIndicator = () => (
    <button
      onClick={() => setShowStatusPanel(!showStatusPanel)}
      className={`fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 ${
        overallHealth === 'healthy' ? 'bg-green-500 hover:bg-green-600' :
        overallHealth === 'degraded' ? 'bg-yellow-500 hover:bg-yellow-600' :
        'bg-red-500 hover:bg-red-600'
      }`}
      title="View system status"
    >
      <div className="relative">
        {isLoading ? (
          <RefreshCw className="w-5 h-5 text-white animate-spin" />
        ) : (
          <BarChart3 className="w-5 h-5 text-white" />
        )}
        
        {overallHealth !== 'healthy' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${
              overallHealth === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
          </div>
        )}
      </div>
    </button>
  )

  // Main status panel
  const StatusPanel = () => (
    <div className={`fixed bottom-20 right-4 z-40 w-80 bg-white border border-gray-200 rounded-lg shadow-xl transition-all duration-300 ${
      showStatusPanel ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">System Status</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowStatusPanel(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`p-3 rounded-lg border mb-4 ${getStatusColor(overallHealth as any)}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallHealth as any)}
            <div>
              <p className="font-medium capitalize">{overallHealth} System</p>
              <p className="text-sm opacity-75">
                {healthyServicesCount}/{totalServicesCount} services operational
              </p>
            </div>
          </div>
        </div>

        {/* Individual Services */}
        {showDetails && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Service Details</h4>
            {Object.entries(services).map(([serviceName, service]) => (
              <div key={serviceName} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(service.status)}
                  <span className="text-sm font-medium capitalize">
                    {serviceName.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    service.status === 'healthy' ? 'bg-green-100 text-green-700' :
                    service.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {service.status}
                  </span>
                  
                  {service.fallbackActive && (
                    <div className="text-xs text-blue-600 mt-1">Fallback active</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Metrics */}
        {systemHealth && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Error Rate</p>
                <p className={`font-medium ${
                  systemHealth.error_rate > 0.05 ? 'text-red-600' :
                  systemHealth.error_rate > 0.02 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {(systemHealth.error_rate * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500">Response Time</p>
                <p className={`font-medium ${
                  systemHealth.avg_response_time > 2000 ? 'text-red-600' :
                  systemHealth.avg_response_time > 1000 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {systemHealth.avg_response_time}ms
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Health */}
        {deploymentHealth && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Deployment Health</h4>
              <span className={`text-sm font-medium ${
                deploymentHealth.score >= 80 ? 'text-green-600' :
                deploymentHealth.score >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {deploymentHealth.score}/100
              </span>
            </div>
            
            {deploymentHealth.criticalIssues.length > 0 && (
              <div className="mt-2 text-xs text-red-600">
                {deploymentHealth.criticalIssues.slice(0, 2).map((issue, index) => (
                  <div key={index} className="flex items-start space-x-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full mt-1.5 shrink-0"></span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Last Update */}
        {lastUpdate && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <StatusIndicator />
      <StatusPanel />
    </>
  )
}

export default ServiceStatusDisplay
