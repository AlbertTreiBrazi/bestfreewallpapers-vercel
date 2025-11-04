/**
 * Unified download utilities for wallpaper downloads
 * Uses the token-based download system: download-wallpaper → download-file → actual file
 */

export interface DownloadParams {
  wallpaperId: number
  resolution: '1080p' | '4k' | '8k'
  title: string
  authToken: string
}

export interface DownloadResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  expiresAt?: string
  error?: string
}

export interface DownloadTokenResponse {
  download_token: string
  wallpaper_id: number
  wallpaper_title: string
  resolution: string
  expires_at: string
  user_type: 'guest' | 'free' | 'premium'
  is_premium_wallpaper: boolean
  instant_download: boolean
  ad_required: boolean
  countdown_duration: number
  download_url: string
  validation_tolerance: number
}

/**
 * Call the download-wallpaper API to get a download token
 * Supports guest users, free users, and premium users
 */
export async function downloadWallpaper(
  authToken: string,
  wallpaperId: number,
  resolution: '1080p' | '4k' | '8k'
): Promise<DownloadTokenResponse> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  
  // Use proper auth token - if no user token provided, use anon key
  const headers = authToken 
    ? { 'Authorization': `Bearer ${authToken}` }
    : { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
  
  const response = await fetch(`${baseUrl}/functions/v1/download-wallpaper`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      wallpaper_id: wallpaperId,
      resolution: resolution
    })
  })
  
  if (!response.ok) {
    let errorData
    try {
      const responseText = await response.text()
      console.log('downloadWallpaper: raw error response:', responseText)
      
      if (responseText.trim().startsWith('{')) {
        errorData = JSON.parse(responseText)
      } else {
        console.error('downloadWallpaper: Non-JSON error response:', responseText.substring(0, 200))
        errorData = { error: { message: 'Server returned HTML instead of JSON. Please try again.' } }
      }
    } catch (parseError) {
      console.error('downloadWallpaper: Failed to parse error response:', parseError)
      errorData = { error: { message: 'Invalid server response. Please try again.' } }
    }
    
    throw new Error(errorData.error?.message || `API request failed: HTTP ${response.status}`)
  }
  
  let result
  try {
    const responseText = await response.text()
    console.log('downloadWallpaper: raw success response:', responseText.substring(0, 200))
    
    if (responseText.trim().startsWith('{')) {
      result = JSON.parse(responseText)
    } else {
      console.error('downloadWallpaper: Non-JSON success response:', responseText.substring(0, 200))
      throw new Error('Server returned HTML instead of JSON. Please try again.')
    }
  } catch (parseError) {
    console.error('downloadWallpaper: Failed to parse success response:', parseError)
    throw new Error('Invalid server response. Please try again.')
  }
  
  return result.data
}

/**
 * Use a download token to get the final download URL and trigger download
 */
export async function startCdnDownload(downloadToken: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  
  const response = await fetch(`${baseUrl}/functions/v1/download-file?token=${downloadToken}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    }
  })
  
  if (!response.ok) {
    let errorData
    try {
      const responseText = await response.text()
      console.log('startCdnDownload: raw error response:', responseText)
      
      if (responseText.trim().startsWith('{')) {
        errorData = JSON.parse(responseText)
      } else {
        console.error('startCdnDownload: Non-JSON error response:', responseText.substring(0, 200))
        errorData = { error: { message: 'Server returned HTML instead of JSON. Please try again.' } }
      }
    } catch (parseError) {
      console.error('startCdnDownload: Failed to parse error response:', parseError)
      errorData = { error: { message: 'Invalid server response. Please try again.' } }
    }
    
    throw new Error(errorData.error?.message || `Download failed: HTTP ${response.status}`)
  }
  
  let result
  try {
    const responseText = await response.text()
    console.log('startCdnDownload: raw success response:', responseText.substring(0, 200))
    
    if (responseText.trim().startsWith('{')) {
      result = JSON.parse(responseText)
    } else {
      console.error('startCdnDownload: Non-JSON success response:', responseText.substring(0, 200))
      throw new Error('Server returned HTML instead of JSON. Please try again.')
    }
  } catch (parseError) {
    console.error('startCdnDownload: Failed to parse success response:', parseError)
    throw new Error('Invalid server response. Please try again.')
  }
  const { download_url, filename } = result.data
  
  // Trigger the actual file download
  triggerFileDownload(download_url, filename)
}

/**
 * Start a download using the token-based system
 * Step 1: Get download token from download-wallpaper
 * Step 2: Use token to get signed URL from download-file
 * Step 3: Trigger browser download
 */
export async function startUnifiedDownload({
  wallpaperId,
  resolution,
  title,
  authToken
}: DownloadParams): Promise<DownloadResponse> {
  try {
    console.log('Starting unified download:', { wallpaperId, resolution, title })
    
    // Step 1: Get download token
    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const tokenResponse = await fetch(`${baseUrl}/functions/v1/download-wallpaper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallpaper_id: wallpaperId,
        resolution: resolution
      })
    })
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      throw new Error(errorData.error?.message || `Token request failed: HTTP ${tokenResponse.status}`)
    }
    
    const tokenData = await tokenResponse.json()
    const downloadToken = tokenData.data.download_token
    
    if (!downloadToken) {
      throw new Error('No download token received')
    }
    
    console.log('Got download token:', downloadToken.substring(0, 8) + '...')
    
    // Step 2: Use token to get signed URL
    const fileResponse = await fetch(`${baseUrl}/functions/v1/download-file?token=${downloadToken}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    })
    
    if (!fileResponse.ok) {
      const errorData = await fileResponse.json()
      throw new Error(errorData.error?.message || `Download URL request failed: HTTP ${fileResponse.status}`)
    }
    
    const fileData = await fileResponse.json()
    
    if (fileData.error) {
      throw new Error(fileData.error.message)
    }
    
    return {
      success: true,
      downloadUrl: fileData.data.download_url,
      filename: fileData.data.filename,
      expiresAt: fileData.data.expires_in ? new Date(Date.now() + fileData.data.expires_in * 1000).toISOString() : undefined
    }
    
  } catch (error) {
    console.error('Unified download error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use startUnifiedDownload instead
 */
export async function startCDNDownload(params: DownloadParams): Promise<DownloadResponse> {
  console.warn('startCDNDownload is deprecated. Use startUnifiedDownload instead.')
  return startUnifiedDownload(params)
}

/**
 * Legacy function for backward compatibility  
 * @deprecated Use startUnifiedDownload instead
 */
export function generateCDNDownloadUrl({ 
  wallpaperId, 
  resolution, 
  title, 
  authToken 
}: DownloadParams): string {
  console.warn('generateCDNDownloadUrl is deprecated. Use startUnifiedDownload instead.')
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  return `${baseUrl}/functions/v1/enhanced-download?id=${wallpaperId}&resolution=${resolution}`
}

/**
 * Trigger a file download in the browser with enhanced mobile support
 * Optimized for iOS Safari and Android Chrome
 */
export function triggerFileDownload(downloadUrl: string, filename: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  console.log('Download triggered:', { downloadUrl, filename, isMobile, isSafari, isIOS })
  
  try {
    if (isIOS && isSafari) {
      // iOS Safari special handling - open in new tab for "View/Download" flow
      const newWindow = window.open(downloadUrl, '_blank')
      if (!newWindow) {
        // Fallback if popup was blocked
        window.location.href = downloadUrl
      }
      console.log('iOS Safari: Opened download URL in new tab/window')
    } else if (isMobile) {
      // Android Chrome and other mobile browsers
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.style.display = 'none'
      
      // Mobile-specific attributes
      link.setAttribute('rel', 'noopener noreferrer')
      link.setAttribute('target', '_blank')
      
      document.body.appendChild(link)
      
      // Use both click events for better mobile compatibility
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
      
      link.dispatchEvent(clickEvent)
      
      // Cleanup after a delay
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
      }, 100)
      
      console.log('Mobile: Download triggered with enhanced mobile support')
    } else {
      // Desktop browsers - standard approach
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.rel = 'noopener noreferrer'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Desktop: Download triggered successfully')
    }
  } catch (error) {
    console.error('Primary download method failed:', error)
    
    // Universal fallback: Open in new tab/window
    try {
      const fallbackWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      if (!fallbackWindow) {
        // Last resort: Navigate to the URL
        window.location.href = downloadUrl
      }
      console.log('Fallback: Opened download URL in new tab')
    } catch (fallbackError) {
      console.error('All download methods failed:', fallbackError)
      throw new Error(`Unable to initiate download. Please try opening this URL directly: ${downloadUrl}`)
    }
  }
}