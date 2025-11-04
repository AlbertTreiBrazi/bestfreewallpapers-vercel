// API Configuration
// Centralized API endpoints to ensure consistency

const getSupabaseUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://eocgtrggcalfptqhgxer.supabase.co'
  return url
}

export const API_ENDPOINTS = {
  supabaseUrl: getSupabaseUrl(),
  apiImg: (id: number, params?: string) => 
    `${getSupabaseUrl()}/functions/v1/api-img/${id}${params ? `?${params}` : ''}`,
  apiImgOptimized: (id: number, params?: string) => 
    `${getSupabaseUrl()}/functions/v1/api-img-optimized/${id}${params ? `?${params}` : ''}`,
  downloadWallpaper: () => `${getSupabaseUrl()}/functions/v1/download-wallpaper`,
  enhancedDownload: () => `${getSupabaseUrl()}/functions/v1/enhanced-download`,
  unifiedDownload: () => `${getSupabaseUrl()}/functions/v1/unified-download`,
  categoriesApi: () => `${getSupabaseUrl()}/functions/v1/categories-api`,
  collectionsApi: () => `${getSupabaseUrl()}/functions/v1/collections-api`,
  premiumBanners: (id?: string) => 
    `${getSupabaseUrl()}/functions/v1/premium-banners${id ? `?id=${id}` : ''}`
}

export const getApiImageUrl = (id: number, options?: {
  format?: 'webp' | 'jpg'
  quality?: number
  width?: number
  height?: number
}) => {
  const params = new URLSearchParams()
  if (options?.format) params.set('format', options.format)
  if (options?.quality) params.set('quality', options.quality.toString())
  if (options?.width) params.set('width', options.width.toString())
  if (options?.height) params.set('height', options.height.toString())
  
  return API_ENDPOINTS.apiImg(id, params.toString())
}
