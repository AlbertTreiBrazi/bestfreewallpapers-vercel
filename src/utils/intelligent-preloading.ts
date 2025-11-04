// Intelligent Resource Preloading System
import { debounce } from './debounce'

interface PreloadResource {
  url: string
  type: 'image' | 'script' | 'style' | 'font' | 'document'
  priority: 'critical' | 'high' | 'medium' | 'low'
  strategy: 'viewport' | 'hover' | 'critical' | 'idle' | 'interaction'
  metadata?: {
    width?: number
    height?: number
    component?: string
    route?: string
  }
}

interface NetworkConditions {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
  downlink: number
  rtt: number
  saveData: boolean
}

class IntelligentPreloader {
  private static instance: IntelligentPreloader
  private queue: PreloadResource[] = []
  private preloaded = new Set<string>()
  private observers = new Map<string, IntersectionObserver>()
  private networkConditions: NetworkConditions | null = null
  private maxConcurrentPreloads = 3
  private activePreloads = 0
  private preloadBudget = {
    critical: 5 * 1024 * 1024, // 5MB for critical resources
    high: 2 * 1024 * 1024,     // 2MB for high priority
    medium: 1 * 1024 * 1024,   // 1MB for medium priority
    low: 512 * 1024            // 512KB for low priority
  }
  private usedBudget = { critical: 0, high: 0, medium: 0, low: 0 }
  
  static getInstance(): IntelligentPreloader {
    if (!IntelligentPreloader.instance) {
      IntelligentPreloader.instance = new IntelligentPreloader()
    }
    return IntelligentPreloader.instance
  }
  
  constructor() {
    this.initNetworkMonitoring()
    this.setupIdlePreloading()
  }
  
  private initNetworkMonitoring() {
    if ('connection' in navigator) {
      const updateNetworkInfo = () => {
        const connection = (navigator as any).connection
        this.networkConditions = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
        
        // Adjust preload strategy based on network
        this.adjustPreloadStrategy()
      }
      
      updateNetworkInfo()
      const connection = (navigator as any).connection
      connection.addEventListener('change', updateNetworkInfo)
    }
  }
  
  private adjustPreloadStrategy() {
    if (!this.networkConditions) return
    
    const { effectiveType, saveData, downlink } = this.networkConditions
    
    // Reduce concurrent preloads on slow networks
    if (effectiveType === '2g' || effectiveType === 'slow-2g' || saveData) {
      this.maxConcurrentPreloads = 1
      // Reduce budgets by 75%
      Object.keys(this.preloadBudget).forEach(key => {
        this.preloadBudget[key as keyof typeof this.preloadBudget] *= 0.25
      })
    } else if (effectiveType === '3g' || downlink < 1.5) {
      this.maxConcurrentPreloads = 2
      // Reduce budgets by 50%
      Object.keys(this.preloadBudget).forEach(key => {
        this.preloadBudget[key as keyof typeof this.preloadBudget] *= 0.5
      })
    } else {
      this.maxConcurrentPreloads = 6 // Fast network
    }
  }
  
  private setupIdlePreloading() {
    // Use requestIdleCallback for low priority preloading
    const processIdleQueue = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback((deadline: any) => {
          while (deadline.timeRemaining() > 0 && this.queue.length > 0) {
            const resource = this.queue.find(r => r.strategy === 'idle')
            if (resource) {
              this.processResource(resource)
              this.queue = this.queue.filter(r => r !== resource)
            } else {
              break
            }
          }
          
          if (this.queue.length > 0) {
            setTimeout(processIdleQueue, 1000)
          }
        })
      }
    }
    
    processIdleQueue()
  }
  
  // Add resource to preload queue
  addResource(resource: PreloadResource) {
    // Check if already preloaded or in queue
    if (this.preloaded.has(resource.url) || 
        this.queue.some(r => r.url === resource.url)) {
      return
    }
    
    // Check budget constraints
    if (!this.checkBudget(resource)) {
      console.warn('Preload budget exceeded for', resource.priority, 'priority')
      return
    }
    
    this.queue.push(resource)
    this.processQueue()
  }
  
  // Add multiple resources with intelligent batching
  addResources(resources: PreloadResource[]) {
    // Sort by priority and strategy
    const sortedResources = resources.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    sortedResources.forEach(resource => this.addResource(resource))
  }
  
  private checkBudget(resource: PreloadResource): boolean {
    const estimatedSize = this.estimateResourceSize(resource)
    const budget = this.preloadBudget[resource.priority]
    const used = this.usedBudget[resource.priority]
    
    return used + estimatedSize <= budget
  }
  
  private estimateResourceSize(resource: PreloadResource): number {
    const { type, metadata } = resource
    
    switch (type) {
      case 'image':
        if (metadata?.width && metadata?.height) {
          // Rough estimation: width * height * 0.3 (for WebP compression)
          return metadata.width * metadata.height * 0.3
        }
        return 200 * 1024 // 200KB default
        
      case 'script':
        return 100 * 1024 // 100KB default
        
      case 'style':
        return 50 * 1024 // 50KB default
        
      case 'font':
        return 150 * 1024 // 150KB default
        
      case 'document':
        return 30 * 1024 // 30KB default
        
      default:
        return 50 * 1024
    }
  }
  
  private async processQueue() {
    if (this.activePreloads >= this.maxConcurrentPreloads) return
    
    // Sort queue by priority and strategy
    this.queue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const strategyOrder = { critical: 4, viewport: 3, hover: 2, interaction: 1, idle: 0 }
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      return strategyOrder[b.strategy] - strategyOrder[a.strategy]
    })
    
    // Process next resource
    const resource = this.queue.find(r => this.shouldProcessNow(r))
    if (resource) {
      this.queue = this.queue.filter(r => r !== resource)
      await this.processResource(resource)
    }
  }
  
  private shouldProcessNow(resource: PreloadResource): boolean {
    const { strategy } = resource
    
    switch (strategy) {
      case 'critical':
        return true
        
      case 'viewport':
        // Process immediately for viewport-based resources
        return true
        
      case 'hover':
      case 'interaction':
        // These are triggered by user actions
        return true
        
      case 'idle':
        // Wait for idle time
        return false
        
      default:
        return true
    }
  }
  
  private async processResource(resource: PreloadResource) {
    this.activePreloads++
    
    try {
      await this.preloadResource(resource)
      this.preloaded.add(resource.url)
      
      // Update budget usage
      const estimatedSize = this.estimateResourceSize(resource)
      this.usedBudget[resource.priority] += estimatedSize
      
    } catch (error) {
      console.warn(`Failed to preload ${resource.url}:`, error)
    } finally {
      this.activePreloads--
      // Process next item in queue
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100)
      }
    }
  }
  
  private async preloadResource(resource: PreloadResource): Promise<void> {
    const { url, type } = resource
    
    if (type === 'image') {
      return this.preloadImage(url)
    } else {
      return this.preloadWithLink(url, type)
    }
  }
  
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`))
      img.src = url
    })
  }
  
  private preloadWithLink(url: string, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = type === 'script' ? 'script' : type === 'style' ? 'style' : type
      
      if (type === 'font') {
        link.type = 'font/woff2'
        link.crossOrigin = 'anonymous'
      }
      
      link.onload = () => {
        resolve()
        // Remove link after successful preload
        setTimeout(() => {
          if (link.parentNode) {
            link.parentNode.removeChild(link)
          }
        }, 1000)
      }
      
      link.onerror = () => {
        reject(new Error(`Failed to preload ${type}: ${url}`))
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }
      
      document.head.appendChild(link)
    })
  }
  
  // Viewport-based preloading with Intersection Observer
  preloadOnViewport(element: Element, resources: PreloadResource[]) {
    const observerId = `viewport-${Date.now()}`
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            resources.forEach(resource => {
              this.addResource({ ...resource, strategy: 'viewport' })
            })
            observer.disconnect()
            this.observers.delete(observerId)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )
    
    observer.observe(element)
    this.observers.set(observerId, observer)
  }
  
  // Hover-based preloading
  preloadOnHover = debounce((resources: PreloadResource[]) => {
    resources.forEach(resource => {
      this.addResource({ ...resource, strategy: 'hover' })
    })
  }, 150)
  
  // Route-based preloading for SPA navigation
  preloadRoute(routePath: string, resources: PreloadResource[]) {
    const routeResources = resources.map(resource => ({
      ...resource,
      metadata: { ...resource.metadata, route: routePath }
    }))
    
    this.addResources(routeResources)
  }
  
  // Clean up resources for a specific route
  cleanupRoute(routePath: string) {
    this.queue = this.queue.filter(resource => 
      resource.metadata?.route !== routePath
    )
  }
  
  // Get preload statistics
  getStats() {
    return {
      queueLength: this.queue.length,
      preloadedCount: this.preloaded.size,
      activePreloads: this.activePreloads,
      budgetUsage: this.usedBudget,
      networkConditions: this.networkConditions
    }
  }
  
  // Clear all preloads and reset
  reset() {
    this.queue = []
    this.preloaded.clear()
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.usedBudget = { critical: 0, high: 0, medium: 0, low: 0 }
  }
}

// Export singleton instance
export const intelligentPreloader = IntelligentPreloader.getInstance()

// Convenience functions
export const preloadImages = (urls: string[], priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') => {
  const resources: PreloadResource[] = urls.map(url => ({
    url,
    type: 'image',
    priority,
    strategy: 'critical'
  }))
  
  intelligentPreloader.addResources(resources)
}

export const preloadRouteResources = (routePath: string, resources: Partial<PreloadResource>[]) => {
  const completeResources: PreloadResource[] = resources.map(resource => ({
    type: 'document',
    priority: 'medium',
    strategy: 'idle',
    ...resource,
    url: resource.url!
  }))
  
  intelligentPreloader.preloadRoute(routePath, completeResources)
}

export const preloadOnScroll = (element: Element, resources: Partial<PreloadResource>[]) => {
  const completeResources: PreloadResource[] = resources.map(resource => ({
    type: 'image',
    priority: 'low',
    strategy: 'viewport',
    ...resource,
    url: resource.url!
  }))
  
  intelligentPreloader.preloadOnViewport(element, completeResources)
}