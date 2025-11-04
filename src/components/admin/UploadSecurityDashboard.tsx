import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, FileText, Users, Activity, TrendingUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface SecurityStats {
    upload_stats: {
        total_uploads: number
        unique_users: number
        total_size: number
        avg_file_size: number
        upload_type: string
        upload_status: string
    }[]
    security_stats: {
        total_scans: number
        threats_found: number
        scan_type: string
    }[]
    quarantine_stats: {
        quarantined_files: number
        threat_level: string
        admin_reviewed: boolean
    }[]
    period_days: number
    generated_at: string
}

interface QuarantineFile {
    id: string
    user_id: string
    original_file_name: string
    file_hash: string
    quarantine_reason: string
    threat_level: 'low' | 'medium' | 'high' | 'critical'
    scan_results: any
    file_metadata: any
    admin_reviewed: boolean
    admin_review_notes: string | null
    created_at: string
    reviewed_at: string | null
}

interface UploadLog {
    id: string
    user_id: string
    file_name: string
    original_file_name: string
    file_size: number
    upload_type: string
    security_scans_performed: string[]
    upload_status: string
    created_at: string
}

export function UploadSecurityDashboard() {
    const { theme } = useTheme()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<SecurityStats | null>(null)
    const [quarantineFiles, setQuarantineFiles] = useState<QuarantineFile[]>([])
    const [recentUploads, setRecentUploads] = useState<UploadLog[]>([])
    const [timeRange, setTimeRange] = useState(30) // days
    const [selectedTab, setSelectedTab] = useState<'overview' | 'quarantine' | 'logs'>('overview')

    useEffect(() => {
        loadSecurityData()
    }, [timeRange])

    const loadSecurityData = async () => {
        setLoading(true)
        try {
            // Load security statistics
            const { data: statsData, error: statsError } = await supabase.functions.invoke('upload-security-stats', {
                body: { days_back: timeRange }
            })

            if (statsError) throw statsError
            setStats(statsData.data)

            // Load quarantine files
            const { data: quarantineData, error: quarantineError } = await supabase
                .from('upload_quarantine')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (quarantineError) throw quarantineError
            setQuarantineFiles(quarantineData || [])

            // Load recent upload logs
            const { data: logsData, error: logsError } = await supabase
                .from('upload_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (logsError) throw logsError
            setRecentUploads(logsData || [])

        } catch (error: any) {
            console.error('Failed to load security data:', error)
            toast.error('Failed to load security dashboard data')
        } finally {
            setLoading(false)
        }
    }

    const handleQuarantineReview = async (fileId: string, approved: boolean, notes: string) => {
        try {
            const { error } = await supabase
                .from('upload_quarantine')
                .update({
                    admin_reviewed: true,
                    admin_review_notes: notes,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', fileId)

            if (error) throw error

            toast.success(`File ${approved ? 'approved' : 'rejected'} successfully`)
            loadSecurityData() // Refresh data
        } catch (error: any) {
            console.error('Failed to update quarantine status:', error)
            toast.error('Failed to update quarantine status')
        }
    }

    const formatFileSize = (bytes: number): string => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        if (bytes === 0) return '0 Bytes'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    const getThreatLevelColor = (level: string) => {
        switch (level) {
            case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
            case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
            case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
            case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
        }
    }

    const getUploadStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
            case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
            case 'quarantined': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="animate-pulse space-y-6">
                    <div className="bg-white dark:bg-gray-800 h-64 rounded-lg"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 h-32 rounded-lg"></div>
                        <div className="bg-white dark:bg-gray-800 h-32 rounded-lg"></div>
                        <div className="bg-white dark:bg-gray-800 h-32 rounded-lg"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Shield className="w-8 h-8" />
                            Upload Security Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Monitor file upload security, quarantine management, and threat detection
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(parseInt(e.target.value))}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        
                        <button
                            onClick={loadSecurityData}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Activity className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'overview', name: 'Security Overview', icon: Shield },
                                { id: 'quarantine', name: 'Quarantine Management', icon: AlertTriangle },
                                { id: 'logs', name: 'Upload Logs', icon: FileText }
                            ].map(tab => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSelectedTab(tab.id as any)}
                                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                            selectedTab === tab.id
                                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.name}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        {selectedTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Security Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-100 text-sm">Total Uploads</p>
                                                <p className="text-3xl font-bold">
                                                    {stats?.upload_stats.reduce((sum, stat) => sum + stat.total_uploads, 0) || 0}
                                                </p>
                                            </div>
                                            <TrendingUp className="w-8 h-8 text-green-100" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-100 text-sm">Security Scans</p>
                                                <p className="text-3xl font-bold">
                                                    {stats?.security_stats.reduce((sum, stat) => sum + stat.total_scans, 0) || 0}
                                                </p>
                                            </div>
                                            <Shield className="w-8 h-8 text-blue-100" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-yellow-100 text-sm">Threats Detected</p>
                                                <p className="text-3xl font-bold">
                                                    {stats?.security_stats.reduce((sum, stat) => sum + stat.threats_found, 0) || 0}
                                                </p>
                                            </div>
                                            <AlertTriangle className="w-8 h-8 text-yellow-100" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-100 text-sm">Unique Users</p>
                                                <p className="text-3xl font-bold">
                                                    {stats?.upload_stats.reduce((sum, stat) => sum + stat.unique_users, 0) || 0}
                                                </p>
                                            </div>
                                            <Users className="w-8 h-8 text-gray-100" />
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Stats by Type */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Upload Statistics by Type
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Upload Type
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Total Uploads
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Total Size
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Average Size
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {stats?.upload_stats.map((stat, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                            {stat.upload_type}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {stat.total_uploads}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {formatFileSize(stat.total_size)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {formatFileSize(stat.avg_file_size)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                getUploadStatusColor(stat.upload_status)
                                                            }`}>
                                                                {stat.upload_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedTab === 'quarantine' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Quarantined Files Management
                                    </h3>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {quarantineFiles.length} files in quarantine
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    File Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Threat Level
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Reason
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {quarantineFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {file.original_file_name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            getThreatLevelColor(file.threat_level)
                                                        }`}>
                                                            {file.threat_level.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {file.quarantine_reason}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(file.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {file.admin_reviewed ? (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100 dark:bg-green-900/20">
                                                                Reviewed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20">
                                                                Pending Review
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {!file.admin_reviewed && (
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleQuarantineReview(file.id, true, 'Approved by admin')}
                                                                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleQuarantineReview(file.id, false, 'Rejected by admin')}
                                                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {selectedTab === 'logs' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Recent Upload Logs
                                    </h3>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {recentUploads.length} recent uploads
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    File Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Size
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Security Scans
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {recentUploads.map((upload) => (
                                                <tr key={upload.id}>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {upload.original_file_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {upload.upload_type}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {formatFileSize(upload.file_size)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {upload.security_scans_performed?.join(', ') || 'None'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            getUploadStatusColor(upload.upload_status)
                                                        }`}>
                                                            {upload.upload_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(upload.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
