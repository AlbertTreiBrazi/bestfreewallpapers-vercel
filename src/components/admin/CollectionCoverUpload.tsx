import React, { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface CollectionCoverUploadProps {
  collectionId: string
  currentCoverUrl?: string
  onUploadSuccess: (url: string) => void
  className?: string
}

export function CollectionCoverUpload({
  collectionId,
  currentCoverUrl,
  onUploadSuccess,
  className = ''
}: CollectionCoverUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File too large. Maximum size: 5MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      // Convert file to base64
      const base64Data = await fileToBase64(selectedFile)
      
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Authentication required')
      }

      // Upload via our new collections-cover-upload endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-cover-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'upload_cover',
            collectionId: collectionId,
            fileData: base64Data,
            fileName: selectedFile.name,
            fileType: selectedFile.type
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Collection cover uploaded successfully!')
        onUploadSuccess(result.data.url)
        setSelectedFile(null)
        setPreviewUrl(null)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleAutoThumbnail = async () => {
    setUploading(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-auto-thumbnail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'set_auto_thumbnail',
            collectionId: collectionId
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Auto-thumbnail failed' }))
        throw new Error(errorData.error || 'Auto-thumbnail failed')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Auto-thumbnail set successfully!')
        onUploadSuccess(result.data.thumbnailUrl)
      } else {
        throw new Error(result.error || 'Auto-thumbnail failed')
      }
    } catch (error: any) {
      console.error('Auto-thumbnail error:', error)
      toast.error(`Auto-thumbnail failed: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const resetSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Cover Image */}
      {currentCoverUrl && !previewUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Cover Image
          </label>
          <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img 
              src={currentCoverUrl} 
              alt="Current cover" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Collection Cover Image
        </label>
        
        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive
                ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <button
                  type="button"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload a cover image
                </button>
                <p className="text-gray-500 text-sm mt-1">
                  or drag and drop
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={resetSelection}
                className="absolute top-1 right-1 p-1 bg-red-500 dark:bg-red-600 text-white rounded-full hover:bg-red-600 dark:hover:bg-red-700 transition-colors shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Cover</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Auto-Thumbnail Button */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleAutoThumbnail}
          disabled={uploading}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Setting...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Auto-Set from Latest Wallpaper</span>
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Automatically use the most recent wallpaper as collection cover
        </p>
      </div>
    </div>
  )
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}