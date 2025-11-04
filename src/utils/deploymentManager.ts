// Deployment Manager - Phase 3 Priority 4
// Rollback capability and deployment health monitoring

import monitoringService from '../services/monitoringService'
import reliabilityService from '../services/reliabilityService'

interface DeploymentInfo {
  version: string
  timestamp: string
  commitHash?: string
  buildNumber?: string
  environment: 'development' | 'staging' | 'production'
  healthScore?: number
  rollbackAvailable?: boolean
}

interface HealthCheckResult {
  score: number
  issues: string[]
  criticalIssues: string[]
  recommendations: string[]
}

class DeploymentManager {
  private currentDeployment: DeploymentInfo
  private healthCheckInterval?: number
  private rollbackUrl?: string
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly MIN_HEALTH_SCORE = 70
  private readonly CRITICAL_HEALTH_SCORE = 40

  constructor() {
    this.currentDeployment = this.getCurrentDeploymentInfo()
    this.initializeHealthMonitoring()
  }

  private getCurrentDeploymentInfo(): DeploymentInfo {
    // Get deployment info from environment or build metadata
    return {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      timestamp: import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),
      commitHash: import.meta.env.VITE_COMMIT_HASH,
      buildNumber: import.meta.env.VITE_BUILD_NUMBER,
      environment: (import.meta.env.VITE_ENVIRONMENT as any) || 'production',
      rollbackAvailable: true
    }
  }

  private initializeHealthMonitoring(): void {
    // Initial health check
    this.performHealthCheck()

    // Set up periodic health monitoring
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck()
    }, this.HEALTH_CHECK_INTERVAL)

    // Monitor for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, perform immediate health check
        this.performHealthCheck()
      }
    })
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = []
    const criticalIssues: string[] = []
    const recommendations: string[] = []
    let score = 100

    try {
      // Check system health
      const systemHealth = reliabilityService.getSystemHealth()
      if (systemHealth === 'critical') {
        score -= 40
        criticalIssues.push('Multiple core services are failing')
      } else if (systemHealth === 'degraded') {
        score -= 20
        issues.push('Some services are experiencing issues')
      }

      // Check service statuses
      const servicesStatus = reliabilityService.getAllServicesStatus()
      Object.entries(servicesStatus).forEach(([serviceName, status]) => {
        if (status.status === 'failed') {
          score -= 15
          if (['supabase_database', 'supabase_auth'].includes(serviceName)) {
            criticalIssues.push(`Critical service ${serviceName} is down`)
          } else {
            issues.push(`Service ${serviceName} is not responding`)
          }
        } else if (status.status === 'degraded') {
          score -= 5
          issues.push(`Service ${serviceName} is performing slowly`)
        }
      })

      // Check error rates
      const healthStatus = await monitoringService.getHealthStatus()
      if (healthStatus.error_rate > 0.1) { // 10% error rate
        score -= 30
        criticalIssues.push(`High error rate: ${(healthStatus.error_rate * 100).toFixed(1)}%`)
      } else if (healthStatus.error_rate > 0.05) { // 5% error rate
        score -= 15
        issues.push(`Elevated error rate: ${(healthStatus.error_rate * 100).toFixed(1)}%`)
      }

      // Check response times
      if (healthStatus.avg_response_time > 5000) { // 5 seconds
        score -= 25
        criticalIssues.push(`Very slow response times: ${healthStatus.avg_response_time}ms`)
      } else if (healthStatus.avg_response_time > 2000) { // 2 seconds
        score -= 10
        issues.push(`Slow response times: ${healthStatus.avg_response_time}ms`)
      }

      // Check for JavaScript errors
      const jsErrorCount = this.getJavaScriptErrorCount()
      if (jsErrorCount > 10) {
        score -= 20
        issues.push(`High number of JavaScript errors: ${jsErrorCount}`)
      }

      // Performance checks
      if (typeof performance !== 'undefined') {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart
          if (loadTime > 10000) { // 10 seconds
            score -= 15
            issues.push(`Slow page load time: ${Math.round(loadTime)}ms`)
          }
        }
      }

      // Generate recommendations
      if (score < this.MIN_HEALTH_SCORE) {
        recommendations.push('Consider rolling back to previous version')
      }
      if (criticalIssues.length > 0) {
        recommendations.push('Immediate action required for critical issues')
      }
      if (issues.length > 2) {
        recommendations.push('Multiple issues detected - investigate system health')
      }

      const result: HealthCheckResult = {
        score: Math.max(0, score),
        issues,
        criticalIssues,
        recommendations
      }

      // Update deployment health score
      this.currentDeployment.healthScore = result.score

      // Handle critical health issues
      if (result.score < this.CRITICAL_HEALTH_SCORE) {
        this.handleCriticalHealth(result)
      }

      // Track health check
      monitoringService.trackBusinessEvent({
        event_type: 'deployment_health_check',
        url: window.location.href,
        metadata: {
          health_score: result.score,
          issues_count: issues.length,
          critical_issues_count: criticalIssues.length,
          deployment_version: this.currentDeployment.version
        }
      })

      return result

    } catch (error) {
      console.error('Health check failed:', error)
      
      const errorResult: HealthCheckResult = {
        score: 0,
        issues: ['Health check system failure'],
        criticalIssues: ['Unable to assess system health'],
        recommendations: ['Manual investigation required']
      }

      // Track health check failure
      monitoringService.trackError({
        message: `Deployment health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        metadata: {
          deployment_version: this.currentDeployment.version
        }
      })

      return errorResult
    }
  }

  private getJavaScriptErrorCount(): number {
    // This would typically be tracked by the monitoring service
    // For now, return a simulated count
    return 0
  }

  private handleCriticalHealth(healthResult: HealthCheckResult): void {
    console.error('Critical deployment health detected:', healthResult)

    // Show user notification
    this.showHealthWarning(healthResult)

    // Track critical health event
    monitoringService.trackBusinessEvent({
      event_type: 'deployment_critical_health',
      url: window.location.href,
      metadata: {
        health_score: healthResult.score,
        critical_issues: healthResult.criticalIssues,
        deployment_version: this.currentDeployment.version,
        auto_rollback_available: this.currentDeployment.rollbackAvailable
      }
    })

    // In a real implementation, this might trigger automatic rollback
    // For now, we'll just alert the monitoring team
    if (this.currentDeployment.rollbackAvailable && healthResult.score < 20) {
      console.warn('Deployment health is critically low. Consider rollback.')
    }
  }

  private showHealthWarning(healthResult: HealthCheckResult): void {
    // Create a non-intrusive notification
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm'
    notification.innerHTML = `
      <div class="flex items-start space-x-2">
        <svg class="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <h4 class="font-medium">System Alert</h4>
          <p class="text-sm mt-1">We're experiencing technical issues. Working to resolve quickly.</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-red-200 hover:text-white">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `

    document.body.appendChild(notification)

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove()
      }
    }, 10000)
  }

  // Public methods
  public async initiateRollback(reason: string): Promise<boolean> {
    try {
      // Track rollback attempt
      monitoringService.trackBusinessEvent({
        event_type: 'deployment_rollback_initiated',
        url: window.location.href,
        metadata: {
          reason,
          current_version: this.currentDeployment.version,
          health_score: this.currentDeployment.healthScore
        }
      })

      // In a real implementation, this would trigger the rollback process
      // For now, we'll simulate it
      console.log(`Rollback initiated: ${reason}`)
      
      // Show user notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50'
      notification.innerHTML = `
        <div class="text-center">
          <h4 class="font-medium">Rollback in Progress</h4>
          <p class="text-sm mt-1">Reverting to previous stable version...</p>
        </div>
      `
      document.body.appendChild(notification)

      // Simulate rollback delay
      await new Promise(resolve => setTimeout(resolve, 3000))

      // In a real implementation, this would redirect to the previous version
      // or reload with the rolled-back code
      
      notification.remove()
      return true

    } catch (error) {
      console.error('Rollback failed:', error)
      
      monitoringService.trackError({
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        metadata: {
          reason,
          current_version: this.currentDeployment.version
        }
      })

      return false
    }
  }

  public getCurrentDeployment(): DeploymentInfo {
    return { ...this.currentDeployment }
  }

  public async getDeploymentHealth(): Promise<HealthCheckResult> {
    return await this.performHealthCheck()
  }

  public isRollbackAvailable(): boolean {
    return this.currentDeployment.rollbackAvailable || false
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
  }
}

// Create singleton instance
const deploymentManager = new DeploymentManager()

export default deploymentManager
export { DeploymentManager, type DeploymentInfo, type HealthCheckResult }
