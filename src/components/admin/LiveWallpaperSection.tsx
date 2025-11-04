import React, { useState, useEffect } from 'react'
import { Play, Upload, Link, Trash2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
// VideoUploadDropzone removed in Phase-2 rollback
import toast from 'react-hot-toast'

interface LiveWallpaperSectionProps {
  formData: {
    live_enabled: boolean
    live_video_url: string
    live_poster_url: string
    local_video_path?: string | null
    video_file_size?: number | null
    video_duration?: number | null
  }
  onFormDataChange: (updates: Partial<LiveWallpaperSectionProps['formData']>) => void
  wallpaperId?: number | null
  disabled?: boolean
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function LiveWallpaperSection({
  formData,
  onFormDataChange,
  wallpaperId = null,
  disabled = false
}: LiveWallpaperSectionProps) {
  const { theme } = useTheme()
  const [videoSource, setVideoSource] = useState<'none' | 'external'>('none')

  // Determine current video source based on form data
  useEffect(() => {
    if (formData.live_video_url) {
      setVideoSource('external')
    } else {
      setVideoSource('none')
    }
  }, [formData.live_video_url])

  const handleEnableLiveWallpaper = (enabled: boolean) => {
    onFormDataChange({ live_enabled: enabled })
    if (!enabled) {
      // Reset all live wallpaper fields when disabled
      onFormDataChange({
        live_enabled: false,
        live_video_url: '',
        live_poster_url: '',
        local_video_path: null,
        video_file_size: null,
        video_duration: null
      })
      setVideoSource('none')
    }
  }

  const handleVideoSourceChange = (source: 'external') => {
    setVideoSource(source)
    // Only external URLs supported in Phase-2
  }

  // Upload functionality removed in Phase-2 rollback

  // Local video deletion removed in Phase-2 rollback

  const getCurrentVideoUrl = () => {
    return formData.live_video_url || null
  }

  return (
    <div className="space-y-6">
      {/* Enable Live Wallpaper Toggle */}
      <div className={cn(
        'p-4 rounded-lg border',
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Play className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className={cn('font-medium', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                Enable Live Wallpaper
              </h3>
              <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                Add an animated video background to this wallpaper
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.live_enabled}
              onChange={(e) => handleEnableLiveWallpaper(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className={cn(
              'w-11 h-6 rounded-full peer transition-colors duration-200',
              'peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300',
              'peer-checked:bg-blue-600 bg-gray-300',
              theme === 'dark' ? 'peer-focus:ring-blue-800 bg-gray-600' : ''
            )}>
              <div className={cn(
                'absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200',
                'peer-checked:translate-x-full peer-checked:border-white'
              )}></div>
            </div>
          </label>
        </div>
      </div>

      {/* Live Wallpaper Configuration */}
      {formData.live_enabled && (
        <div className="space-y-6">
          {/* Video Source Selection */}
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          )}>
            <h4 className={cn('font-medium mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
              Video Source
            </h4>
            
            <div className="grid grid-cols-1 gap-4">
              {/* External URL Option - Phase 2 Stable Version */}
              <div
                className={cn(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                  videoSource === 'external'
                    ? 'border-blue-500 bg-blue-50'
                    : theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400',
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                )}
                onClick={() => !disabled && handleVideoSourceChange('external')}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  <span className={cn('font-medium', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                    External Video URL
                  </span>
                  {videoSource === 'external' && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                  Use video hosted on external platforms (CDN, YouTube, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* Upload interface removed in Phase-2 rollback */}

          {/* External URL Input */}
          {videoSource === 'external' && (
            <div className={cn(
              'p-4 rounded-lg border',
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            )}>
              <h4 className={cn('font-medium mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                External Video URL
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className={cn('block text-sm font-medium mb-2', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.live_video_url}
                    onChange={(e) => onFormDataChange({ live_video_url: e.target.value })}
                    placeholder="https://example.com/video.mp4"
                    disabled={disabled}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg transition-colors',
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                    )}
                  />
                </div>
                
                <div>
                  <label className={cn('block text-sm font-medium mb-2', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Poster Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.live_poster_url}
                    onChange={(e) => onFormDataChange({ live_poster_url: e.target.value })}
                    placeholder="https://example.com/poster.jpg"
                    disabled={disabled}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg transition-colors',
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                    )}
                  />
                  <p className={cn('text-xs mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                    Image shown before video loads or on unsupported devices
                  </p>
                </div>

                {/* Video Preview */}
                {formData.live_video_url && (
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                      Video Preview
                    </label>
                    <video
                      src={formData.live_video_url}
                      poster={formData.live_poster_url}
                      controls
                      className="w-full max-w-md rounded-lg"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage Guidelines */}
          <div className={cn(
            'p-4 rounded-lg',
            theme === 'dark' ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'
          )}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-amber-200' : 'text-amber-800')}>
                  Live Wallpaper Best Practices
                </p>
                <ul className={cn('text-xs space-y-1', theme === 'dark' ? 'text-amber-300' : 'text-amber-700')}>
                  <li>• Use high-quality video (1080p or higher recommended)</li>
                  <li>• Keep file size reasonable for faster loading (under 50MB recommended)</li>
                  <li>• Test video on different devices and connection speeds</li>
                  <li>• Provide poster image for better user experience</li>
                  <li>• Consider video length - shorter loops work better for wallpapers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
