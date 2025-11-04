import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, AlertTriangle, CheckCircle, Shield, File, Eye, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface SecureFileUploadProps {
    uploadType?: 'wallpaper' | 'profile_picture' | 'category_image'
    onUploadSuccess: (result: UploadResult) => void
    onUploadError?: (error: string) => void
    maxFileSize?: number
    allowedTypes?: string[]
    className?: string
    disabled?: boolean
}

interface UploadResult {
    fileName: string
    url: string
    fileSize: number
    securityChecks: SecurityChecks
}

interface SecurityChecks {
    mimeValidation: boolean
    headerValidation: boolean
    metadataStripped: boolean
    malwareScan: boolean
    scansPerformed: string[]
}

interface FileValidation {
    valid: boolean
    error?: string
    code?: string
    details?: any
    detectedType?: string
    mimeType?: string
    extension?: string
}

interface UploadProgress {
    stage: 'selecting' | 'validating' | 'scanning' | 'uploading' | 'complete' | 'error'
    progress: number
    message: string
    details?: string
}

export function SecureFileUpload({
    uploadType = 'wallpaper',
    onUploadSuccess,
    onUploadError,
    maxFileSize,
    allowedTypes,
    className = '',
    disabled = false
}: SecureFileUploadProps) {
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ 
        stage: 'selecting', 
        progress: 0, 
        message: 'Select a file to upload' 
    })
    const [validationResult, setValidationResult] = useState<FileValidation | null>(null)
    const [securityDetails, setSecurityDetails] = useState<SecurityChecks | null>(null)
    const [showDetails, setShowDetails] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const getMaxFileSize = useCallback(() => {
        if (maxFileSize) return maxFileSize
        
        const defaultSizes = {
            wallpaper: 10 * 1024 * 1024, // 10MB
            profile_picture: 2 * 1024 * 1024, // 2MB
            category_image: 5 * 1024 * 1024 // 5MB
        }
        
        return defaultSizes[uploadType]
    }, [maxFileSize, uploadType])

    const getAllowedTypes = useCallback(() => {
        if (allowedTypes) return allowedTypes
        
        const defaultTypes = {
            wallpaper: ['image/jpeg', 'image/png', 'image/webp'],
            profile_picture: ['image/jpeg', 'image/png'],
            category_image: ['image/jpeg', 'image/png', 'image/webp']
        }
        
        return defaultTypes[uploadType]
    }, [allowedTypes, uploadType])

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return
        
        const file = files[0]
        const maxSize = getMaxFileSize()
        const allowedMimeTypes = getAllowedTypes()
        
        // Basic client-side validation
        if (file.size > maxSize) {
            const errorMsg = `File too large. Maximum size: ${formatFileSize(maxSize)}`
            setUploadProgress({ 
                stage: 'error', 
                progress: 0, 
                message: errorMsg 
            })
            onUploadError?.(errorMsg)
            return
        }
        
        if (!allowedMimeTypes.includes(file.type)) {
            const errorMsg = `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
            setUploadProgress({ 
                stage: 'error', 
                progress: 0, 
                message: errorMsg 
            })
            onUploadError?.(errorMsg)
            return
        }
        
        setSelectedFile(file)
        setUploadProgress({ 
            stage: 'validating', 
            progress: 10, 
            message: 'Validating file...', 
            details: 'Performing comprehensive security validation'
        })
        
        try {
            // Convert file to base64 for validation
            const base64Data = await fileToBase64(file)
            
            // Perform server-side validation
            const validation = await validateFile({
                fileData: base64Data,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadType
            })
            
            setValidationResult(validation)
            
            if (validation.valid) {
                setUploadProgress({ 
                    stage: 'scanning', 
                    progress: 30, 
                    message: 'File validated successfully',
                    details: 'Ready for security scanning and upload'
                })
            } else {
                setUploadProgress({ 
                    stage: 'error', 
                    progress: 0, 
                    message: validation.error || 'Validation failed',
                    details: validation.details ? JSON.stringify(validation.details) : undefined
                })
                onUploadError?.(validation.error || 'File validation failed')
            }
        } catch (error: any) {
            setUploadProgress({ 
                stage: 'error', 
                progress: 0, 
                message: 'Validation failed',
                details: error.message
            })
            onUploadError?.(error.message)
        }
    }, [uploadType, getMaxFileSize, getAllowedTypes, onUploadError])

    const handleUpload = useCallback(async () => {
        if (!selectedFile || !validationResult?.valid) return
        
        setUploadProgress({ 
            stage: 'scanning', 
            progress: 40, 
            message: 'Performing security scans...',
            details: 'Scanning for malware and stripping metadata'
        })
        
        try {
            const base64Data = await fileToBase64(selectedFile)
            
            setUploadProgress({ 
                stage: 'uploading', 
                progress: 70, 
                message: 'Uploading to secure storage...',
                details: 'File is being securely processed and stored'
            })
            
            const result = await uploadFileSecurely({
                fileData: base64Data,
                fileName: selectedFile.name,
                fileType: selectedFile.type,
                fileSize: selectedFile.size,
                uploadType
            })
            
            if (result.success) {
                setSecurityDetails(result.data.securityChecks)
                setUploadProgress({ 
                    stage: 'complete', 
                    progress: 100, 
                    message: 'Upload completed successfully!',
                    details: `File uploaded with comprehensive security validation`
                })
                
                onUploadSuccess(result.data)
                toast.success('File uploaded successfully with security validation')
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            setUploadProgress({ 
                stage: 'error', 
                progress: 0, 
                message: 'Upload failed',
                details: error.message
            })
            onUploadError?.(error.message)
            toast.error('Upload failed: ' + error.message)
        }
    }, [selectedFile, validationResult, uploadType, onUploadSuccess, onUploadError])

    const resetUpload = useCallback(() => {
        setSelectedFile(null)
        setValidationResult(null)
        setSecurityDetails(null)
        setUploadProgress({ 
            stage: 'selecting', 
            progress: 0, 
            message: 'Select a file to upload' 
        })
        setShowDetails(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [])

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        
        if (disabled || uploadProgress.stage === 'uploading') return
        
        const files = e.dataTransfer.files
        handleFileSelect(files)
    }, [handleFileSelect, disabled, uploadProgress.stage])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files)
    }, [handleFileSelect])

    const formatFileSize = (bytes: number): string => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        if (bytes === 0) return '0 Bytes'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    const getProgressColor = () => {
        switch (uploadProgress.stage) {
            case 'error': return 'bg-red-500'
            case 'complete': return 'bg-green-500'
            case 'uploading': return 'bg-blue-500'
            case 'scanning': return 'bg-yellow-500'
            case 'validating': return 'bg-orange-500'
            default: return 'bg-gray-300'
        }
    }

    const getStageIcon = () => {
        switch (uploadProgress.stage) {
            case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />
            case 'complete': return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'scanning': return <Shield className="w-5 h-5 text-yellow-500" />
            case 'uploading': return <Upload className="w-5 h-5 text-blue-500" />
            case 'validating': return <AlertCircle className="w-5 h-5 text-orange-500" />
            default: return <File className="w-5 h-5 text-gray-500" />
        }
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Upload Area */}
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
                    ${dragActive 
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600'
                    }
                    ${disabled || uploadProgress.stage === 'uploading'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer'
                    }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                    if (!disabled && uploadProgress.stage !== 'uploading') {
                        fileInputRef.current?.click()
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={getAllowedTypes().join(',')}
                    onChange={handleFileInputChange}
                    disabled={disabled || uploadProgress.stage === 'uploading'}
                />
                
                <div className="space-y-4">
                    {/* Icon and Message */}
                    <div className="flex flex-col items-center space-y-2">
                        {getStageIcon()}
                        <div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                {uploadProgress.message}
                            </p>
                            {uploadProgress.details && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {uploadProgress.details}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* File Info */}
                    {selectedFile && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        resetUpload()
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    disabled={uploadProgress.stage === 'uploading'}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Progress Bar */}
                    {uploadProgress.progress > 0 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                                style={{ width: `${uploadProgress.progress}%` }}
                            />
                        </div>
                    )}
                    
                    {/* Validation Results */}
                    {validationResult && (
                        <div className={`p-3 rounded-lg ${
                            validationResult.valid 
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                            <div className="flex items-center space-x-2">
                                {validationResult.valid ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`text-sm font-medium ${
                                    validationResult.valid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                                }`}>
                                    {validationResult.valid ? 'File validation passed' : 'File validation failed'}
                                </span>
                            </div>
                            {!validationResult.valid && validationResult.error && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {validationResult.error}
                                </p>
                            )}
                        </div>
                    )}
                    
                    {/* Security Details */}
                    {securityDetails && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Security validation complete
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowDetails(!showDetails)
                                    }}
                                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {showDetails && (
                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center space-x-1">
                                            <div className={`w-2 h-2 rounded-full ${
                                                securityDetails.mimeValidation ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                            <span>MIME validation</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className={`w-2 h-2 rounded-full ${
                                                securityDetails.headerValidation ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                            <span>Header validation</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className={`w-2 h-2 rounded-full ${
                                                securityDetails.metadataStripped ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                            <span>Metadata stripped</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className={`w-2 h-2 rounded-full ${
                                                securityDetails.malwareScan ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                            <span>Malware scan</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-green-700 dark:text-green-300">
                                        Scans performed: {securityDetails.scansPerformed.join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Upload Button */}
                    {validationResult?.valid && uploadProgress.stage !== 'complete' && uploadProgress.stage !== 'uploading' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleUpload()
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            disabled={disabled}
                        >
                            Upload File Securely
                        </button>
                    )}
                    
                    {/* Reset Button */}
                    {uploadProgress.stage === 'complete' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                resetUpload()
                            }}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Upload Another File
                        </button>
                    )}
                </div>
            </div>
            
            {/* File Requirements */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <p>
                    <strong>Allowed:</strong> {getAllowedTypes().join(', ')} • 
                    <strong>Max size:</strong> {formatFileSize(getMaxFileSize())} • 
                    <strong>Security:</strong> MIME validation, metadata stripping, malware scanning
                </p>
            </div>
        </div>
    )
}

// Helper functions
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

async function validateFile(params: {
    fileData: string
    fileName: string
    fileType: string
    fileSize: number
    uploadType: string
}): Promise<FileValidation> {
    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-file-upload`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'validate',
                ...params
            })
        }
    )
    
    const result = await response.json()
    return result.validation
}

async function uploadFileSecurely(params: {
    fileData: string
    fileName: string
    fileType: string
    fileSize: number
    uploadType: string
}) {
    const authToken = localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('supabase.auth.token')
    
    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-file-upload`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'upload',
                ...params
            })
        }
    )
    
    return await response.json()
}
