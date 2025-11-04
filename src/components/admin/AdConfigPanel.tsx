import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Save, Settings, Clock, Image, Link, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AdConfig {
  guest_ad_timer: string
  guest_ad_enabled: string
  guest_ad_image_url: string
  guest_ad_click_url: string
  guest_ad_html_content: string
}

export function AdConfigPanel() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AdConfig>({
    guest_ad_timer: '8',
    guest_ad_enabled: 'true',
    guest_ad_image_url: '',
    guest_ad_click_url: '',
    guest_ad_html_content: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ad_config')
        .select('config_key, config_value')
      
      if (error) throw error
      
      const configMap: Partial<AdConfig> = {}
      data?.forEach(item => {
        configMap[item.config_key as keyof AdConfig] = 
          typeof item.config_value === 'string' 
            ? item.config_value.replace(/"/g, '') // Remove quotes
            : String(item.config_value)
      })
      
      setConfig(prev => ({ ...prev, ...configMap }))
    } catch (error) {
      console.error('Error loading ad config:', error)
      toast.error('Failed to load ad configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      
      // Update each config value
      const updates = Object.entries(config).map(([key, value]) => 
        supabase
          .from('ad_config')
          .update({ 
            config_value: JSON.stringify(value),
            updated_at: new Date().toISOString()
          })
          .eq('config_key', key)
      )
      
      const results = await Promise.all(updates)
      const hasError = results.some(result => result.error)
      
      if (hasError) {
        throw new Error('Failed to update some configurations')
      }
      
      toast.success('Ad configuration saved successfully')
    } catch (error) {
      console.error('Error saving ad config:', error)
      toast.error('Failed to save ad configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof AdConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className={cn(
        'p-6 rounded-lg border',
        theme === 'dark' ? 'bg-dark-secondary border-gray-700' : 'bg-white border-gray-200'
      )}>
        <div className="animate-pulse">
          <div className={cn(
            'h-6 rounded mb-4',
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
          )} />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn(
                'h-10 rounded',
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              )} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-6 rounded-lg border',
      theme === 'dark' ? 'bg-dark-secondary border-gray-700' : 'bg-white border-gray-200'
    )}>
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-5 h-5 text-blue-500" />
        <h2 className={cn(
          'text-xl font-semibold',
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}>
          Ad Configuration
        </h2>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div>
          <label className={cn(
            'block text-sm font-medium mb-2',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          )}>
            Ad Gate System
          </label>
          <select
            value={config.guest_ad_enabled}
            onChange={(e) => handleChange('guest_ad_enabled', e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              theme === 'dark'
                ? 'bg-dark-tertiary border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        {/* Timer Duration */}
        <div>
          <label className={cn(
            'flex items-center space-x-2 text-sm font-medium mb-2',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          )}>
            <Clock className="w-4 h-4" />
            <span>Timer Duration (seconds)</span>
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={config.guest_ad_timer}
            onChange={(e) => handleChange('guest_ad_timer', e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              theme === 'dark'
                ? 'bg-dark-tertiary border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          />
        </div>

        {/* Ad Image URL */}
        <div>
          <label className={cn(
            'flex items-center space-x-2 text-sm font-medium mb-2',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          )}>
            <Image className="w-4 h-4" />
            <span>Ad Image URL (optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://example.com/ad-image.jpg"
            value={config.guest_ad_image_url}
            onChange={(e) => handleChange('guest_ad_image_url', e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              theme === 'dark'
                ? 'bg-dark-tertiary border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          />
        </div>

        {/* Click-through URL */}
        <div>
          <label className={cn(
            'flex items-center space-x-2 text-sm font-medium mb-2',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          )}>
            <Link className="w-4 h-4" />
            <span>Click-through URL (optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://example.com/advertiser-page"
            value={config.guest_ad_click_url}
            onChange={(e) => handleChange('guest_ad_click_url', e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              theme === 'dark'
                ? 'bg-dark-tertiary border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          />
        </div>

        {/* HTML Content */}
        <div>
          <label className={cn(
            'flex items-center space-x-2 text-sm font-medium mb-2',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          )}>
            <Code className="w-4 h-4" />
            <span>HTML/AdSense Content (optional)</span>
          </label>
          <textarea
            rows={4}
            placeholder="<script>...AdSense code...</script>"
            value={config.guest_ad_html_content}
            onChange={(e) => handleChange('guest_ad_html_content', e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              theme === 'dark'
                ? 'bg-dark-tertiary border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          />
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={saveConfig}
            disabled={saving}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              saving && 'animate-pulse'
            )}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
