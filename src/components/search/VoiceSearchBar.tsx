import React, { useState, useEffect } from 'react'
import { Mic, MicOff, Search, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import type { SpeechRecognition as ISpeechRecognition } from '@/types/seo'

interface VoiceSearchBarProps {
  onSearch: (query: string, voiceData?: any) => void
  placeholder?: string
  showVoiceButton?: boolean
  autoFocus?: boolean
}

export function VoiceSearchBar({ 
  onSearch, 
  placeholder = "Search wallpapers or try voice search...",
  showVoiceButton = true,
  autoFocus = false 
}: VoiceSearchBarProps) {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<ISpeechRecognition | null>(null)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [voiceSearchData, setVoiceSearchData] = useState<any>(null)
  const navigate = useNavigate()

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition() as ISpeechRecognition
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsListening(true)
      }
      
      recognitionInstance.onend = () => {
        setIsListening(false)
      }
      
      recognitionInstance.onresult = async (event) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        
        // Process voice search with AI optimization
        await processVoiceSearch(transcript)
      }
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      setRecognition(recognitionInstance)
      setIsVoiceSupported(true)
    }
  }, [])

  const processVoiceSearch = async (transcript: string) => {
    try {
      // Call voice search optimization edge function
      const { data, error } = await supabase.functions.invoke('voice-search-optimization', {
        body: {
          query: transcript,
          action: 'search'
        }
      })

      if (!error && data?.data) {
        setVoiceSearchData(data.data)
        
        // Execute search with voice optimization
        onSearch(transcript, data.data)
        
        // Navigate based on detected intent
        if (data.data.detected_category) {
          navigate(`/category/${data.data.detected_category}`)
        } else {
          navigate(`/search?q=${encodeURIComponent(transcript)}&voice=true`)
        }
      } else {
        // Fallback to regular search
        onSearch(transcript)
        navigate(`/search?q=${encodeURIComponent(transcript)}`)
      }
    } catch (error) {
      console.error('Voice search processing error:', error)
      // Fallback to regular search
      onSearch(transcript)
      navigate(`/search?q=${encodeURIComponent(transcript)}`)
    }
  }

  const startVoiceSearch = () => {
    if (recognition && !isListening) {
      recognition.start()
    }
  }

  const stopVoiceSearch = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query)
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setVoiceSearchData(null) // Clear voice data when typing manually
  }

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full pl-12 pr-${showVoiceButton && isVoiceSupported ? '24' : '4'} py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200`}
          />
          
          {showVoiceButton && isVoiceSupported && (
            <button
              type="button"
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        
        {/* Voice Search Status */}
        {isListening && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Listening... Speak your search query</span>
            </div>
          </div>
        )}
        
        {/* Voice Search Results Preview */}
        {voiceSearchData && voiceSearchData.optimized_response && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  Voice Search Result:
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {voiceSearchData.optimized_response}
                </p>
                
                {voiceSearchData.suggested_actions && voiceSearchData.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {voiceSearchData.suggested_actions.map((action: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => navigate(action.url)}
                        className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
      
      {/* Voice Search Tips */}
      {showVoiceButton && isVoiceSupported && !isListening && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Try saying: "Show me nature wallpapers" or "Find 4K desktop backgrounds"
          </p>
        </div>
      )}
    </div>
  )
}