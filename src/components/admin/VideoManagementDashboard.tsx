import React, { useState, useEffect } from 'react'
import { Play, Trash2, Search, Filter, HardDrive, Clock, ExternalLink, Upload, X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface VideoData {
  id: number
  title: string
  local_video_path: string | null
  live_video_url: string | null
  video_file_size: number | null
  video_duration: number | null
  live_enabled: boolean
  created_at: string
  updated_at: string
  category?: {
    name: string
  }
}

interface StorageStats {
  totalVideos: number
  totalSize: number
  localVideos: number
  externalVideos: number
  averageSize: number
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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function VideoManagementDashboard() {
  const { theme } = useTheme()
  const [videos, setVideos] = useState<VideoData[]>([])
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'local' | 'external'>('all')
  const [sortBy, setSortBy] = useState<'title' | 'size' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadVideoData()
  }, [searchQuery, filterType, sortBy, sortOrder])

  const loadVideoData = async () => {
    setLoading(true)
    try {
      // Load video data from wallpapers with live_enabled = true
      const { data, error } = await supabase
        .from('wallpapers')
        .select(`
          id,
          title,
          local_video_path,
          live_video_url,
          video_file_size,
          video_duration,
          live_enabled,
          created_at,
          updated_at,
          categories(name)
        `)
        .eq('live_enabled', true)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (error) throw error

      let filteredVideos = data || []

      // Apply search filter
      if (searchQuery) {
        filteredVideos = filteredVideos.filter(video =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply type filter
      if (filterType === 'local') {
        filteredVideos = filteredVideos.filter(video => video.local_video_path)
      } else if (filterType === 'external') {
        filteredVideos = filteredVideos.filter(video => video.live_video_url && !video.local_video_path)
      }

      setVideos(filteredVideos)

      // Calculate stats
      const totalVideos = filteredVideos.length
      const localVideos = filteredVideos.filter(v => v.local_video_path).length
      const externalVideos = filteredVideos.filter(v => v.live_video_url && !v.local_video_path).length
      const totalSize = filteredVideos.reduce((sum, v) => sum + (v.video_file_size || 0), 0)
      const averageSize = totalVideos > 0 ? totalSize / totalVideos : 0

      setStats({
        totalVideos,
        localVideos,
        externalVideos,
        totalSize,
        averageSize
      })

    } catch (error: any) {
      console.error('Error loading video data:', error)
      toast.error('Failed to load video data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLocalVideo = async (videoId: number) => {
    if (!confirm('Are you sure you want to remove the local video? This will switch the wallpaper back to external URL mode.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('wallpapers')
        .update({
          local_video_path: null,
          video_file_size: null,
          video_duration: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)

      if (error) throw error

      toast.success('Local video removed successfully')
      loadVideoData() // Refresh data
    } catch (error: any) {
      console.error('Error removing video:', error)
      toast.error('Failed to remove video')
    }
  }

  const handleDisableLiveWallpaper = async (videoId: number) => {
    if (!confirm('Are you sure you want to disable live wallpaper for this item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('wallpapers')
        .update({
          live_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)

      if (error) throw error

      toast.success('Live wallpaper disabled')
      loadVideoData() // Refresh data
    } catch (error: any) {
      console.error('Error disabling live wallpaper:', error)
      toast.error('Failed to disable live wallpaper')
    }
  }

  const getVideoSource = (video: VideoData) => {
    if (video.local_video_path) {
      return {
        type: 'local' as const,
        url: null, // We can't easily show local video URLs without signed URLs
        path: video.local_video_path
      }
    } else if (video.live_video_url) {
      return {
        type: 'external' as const,
        url: video.live_video_url,
        path: null
      }
    }
    return {
      type: 'none' as const,
      url: null,
      path: null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            Video Management
          </h2>
          <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
            Manage live wallpaper videos and storage usage
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center space-x-3">
              <Play className="w-8 h-8 text-blue-600" />
              <div>
                <p className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                  {stats.totalVideos}
                </p>
                <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                  Total Videos
                </p>
              </div>
            </div>
          </div>

          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center space-x-3">
              <Upload className="w-8 h-8 text-green-600" />
              <div>
                <p className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                  {stats.localVideos}
                </p>
                <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                  Local Storage
                </p>
              </div>
            </div>
          </div>

          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center space-x-3">
              <ExternalLink className="w-8 h-8 text-purple-600" />
              <div>
                <p className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                  {stats.externalVideos}
                </p>
                <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                  External URLs
                </p>
              </div>
            </div>
          </div>

          <div className={cn(
            'p-4 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center space-x-3">
              <HardDrive className="w-8 h-8 text-orange-600" />
              <div>
                <p className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                  {formatFileSize(stats.totalSize)}
                </p>
                <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                  Storage Used
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className={cn(
        'p-4 rounded-lg border',
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      )}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className={cn(
              'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className={cn(
                'w-full pl-10 pr-3 py-2 border rounded-lg transition-colors',
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
              )}
            />
          </div>

          <div className="flex space-x-3">
            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'local' | 'external')}
              className={cn(
                'px-3 py-2 border rounded-lg transition-colors',
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
              )}
            >
              <option value="all">All Videos</option>
              <option value="local">Local Storage</option>
              <option value="external">External URLs</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as 'title' | 'size' | 'created_at')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className={cn(
                'px-3 py-2 border rounded-lg transition-colors',
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
              )}
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Videos List */}
      <div className={cn(
        'rounded-lg border overflow-hidden',
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      )}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className={cn('mt-2 text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
              Loading videos...
            </p>
          </div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center">
            <Play className={cn('w-12 h-12 mx-auto mb-4', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')} />
            <p className={cn('text-lg font-medium', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
              No videos found
            </p>
            <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No live wallpapers have been created yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={cn(
                'border-b',
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              )}>
                <tr>
                  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wider', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')}>
                    Wallpaper
                  </th>
                  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wider', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')}>
                    Video Source
                  </th>
                  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wider', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')}>
                    Size/Duration
                  </th>
                  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wider', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')}>
                    Date
                  </th>
                  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wider', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={cn('divide-y', theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200')}>
                {videos.map((video) => {
                  const source = getVideoSource(video)
                  return (
                    <tr key={video.id} className={cn(
                      'hover:bg-opacity-50 transition-colors',
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    )}>
                      <td className="px-6 py-4">
                        <div>
                          <p className={cn('font-medium', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                            {video.title}
                          </p>
                          {video.category && (
                            <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                              {video.category.name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {source.type === 'local' ? (
                            <>
                              <Upload className="w-4 h-4 text-green-600" />
                              <span className={cn('text-sm', theme === 'dark' ? 'text-green-400' : 'text-green-600')}>
                                Local Storage
                              </span>
                            </>
                          ) : source.type === 'external' ? (
                            <>
                              <ExternalLink className="w-4 h-4 text-purple-600" />
                              <span className={cn('text-sm', theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
                                External URL
                              </span>
                            </>
                          ) : (
                            <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                              No source
                            </span>
                          )}
                        </div>
                        {source.url && (
                          <p className={cn('text-xs mt-1 truncate max-w-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                            {source.url}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                          {video.video_file_size && (
                            <p>{formatFileSize(video.video_file_size)}</p>
                          )}
                          {video.video_duration && (
                            <p className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(video.video_duration)}</span>
                            </p>
                          )}
                          {!video.video_file_size && !video.video_duration && (
                            <span className={cn('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                              No metadata
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={cn('text-sm', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                          {formatDate(video.created_at)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {source.type === 'local' && (
                            <button
                              onClick={() => handleDeleteLocalVideo(video.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Remove local video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDisableLiveWallpaper(video.id)}
                            className={cn(
                              'text-gray-600 hover:text-gray-800 transition-colors',
                              theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : ''
                            )}
                            title="Disable live wallpaper"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
