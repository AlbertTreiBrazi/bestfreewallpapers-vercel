import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, MessageCircle, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  voice_search_optimized: boolean
  search_intent: 'informational' | 'navigational' | 'transactional'
}

interface VoiceSearchFAQProps {
  category?: string
  showSearch?: boolean
  maxItems?: number
}

export function VoiceSearchFAQ({ 
  category = 'general', 
  showSearch = true,
  maxItems = 8 
}: VoiceSearchFAQProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Predefined FAQ data optimized for voice search
  const defaultFAQs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I download wallpapers for free?',
      answer: 'To download free wallpapers, simply browse our collection, click on any wallpaper you like, and press the Download button. No registration is required for free HD downloads.',
      category: 'download',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '2',
      question: 'What wallpaper resolutions are available?',
      answer: 'We offer wallpapers in multiple resolutions: HD (1920x1080), 4K (3840x2160), and Ultra HD (7680x4320). Premium users get access to all high-resolution formats.',
      category: 'quality',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '3',
      question: 'Are these wallpapers free to use?',
      answer: 'Yes, all our wallpapers are completely free for personal use. No hidden fees or subscriptions required for basic downloads.',
      category: 'license',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '4',
      question: 'How do I find nature wallpapers?',
      answer: 'You can find nature wallpapers by visiting our Nature category, using the search bar to type "nature wallpapers", or browsing our featured nature collections.',
      category: 'navigation',
      voice_search_optimized: true,
      search_intent: 'navigational'
    },
    {
      id: '5',
      question: 'Can I use these wallpapers on my phone?',
      answer: 'Absolutely! Our wallpapers work perfectly on mobile devices, tablets, and desktops. We provide mobile-optimized versions for the best fit.',
      category: 'compatibility',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '6',
      question: 'How do I set a wallpaper on my desktop?',
      answer: 'After downloading, right-click on your desktop, select "Personalize" or "Change Desktop Background", then browse to your downloaded wallpaper file and select it.',
      category: 'tutorial',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '7',
      question: 'What are the benefits of premium wallpapers?',
      answer: 'Premium wallpapers offer exclusive content, higher resolutions up to 8K, early access to new collections, and ad-free browsing experience.',
      category: 'premium',
      voice_search_optimized: true,
      search_intent: 'informational'
    },
    {
      id: '8',
      question: 'How often do you add new wallpapers?',
      answer: 'We add new wallpapers daily! Our team curates fresh content every day, including trending topics, seasonal themes, and user requests.',
      category: 'updates',
      voice_search_optimized: true,
      search_intent: 'informational'
    }
  ]

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        // In a real implementation, you might load FAQs from the database
        // For now, we'll use the predefined ones
        let filteredFAQs = defaultFAQs

        if (category !== 'general') {
          filteredFAQs = defaultFAQs.filter(faq => 
            faq.category === category || faq.category === 'general'
          )
        }

        setFaqs(filteredFAQs.slice(0, maxItems))
      } catch (error) {
        console.error('Failed to load FAQs:', error)
        setFaqs(defaultFAQs.slice(0, maxItems))
      } finally {
        setLoading(false)
      }
    }

    loadFAQs()
  }, [category, maxItems])

  const filteredFAQs = faqs.filter(faq => 
    !searchQuery || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // Generate structured data for FAQ
  const generateStructuredData = () => {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': filteredFAQs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6" itemScope itemType="https://schema.org/FAQPage">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData())
        }}
      />

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Frequently Asked Questions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Voice search optimized answers to help you find what you need
        </p>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFAQs.map((faq) => (
          <div
            key={faq.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            itemScope
            itemType="https://schema.org/Question"
            itemProp="mainEntity"
          >
            <button
              onClick={() => toggleExpanded(faq.id)}
              className="w-full px-6 py-4 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between"
              aria-expanded={expandedItems.has(faq.id)}
            >
              <span 
                className="font-medium text-gray-900 dark:text-white pr-4"
                itemProp="name"
              >
                {faq.question}
              </span>
              
              <div className="flex items-center space-x-2">
                {faq.voice_search_optimized && (
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                    Voice
                  </span>
                )}
                {expandedItems.has(faq.id) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </button>
            
            {expandedItems.has(faq.id) && (
              <div 
                className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
                itemScope
                itemType="https://schema.org/Answer"
                itemProp="acceptedAnswer"
              >
                <p 
                  className="text-gray-700 dark:text-gray-300 leading-relaxed"
                  itemProp="text"
                >
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredFAQs.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No FAQs found matching your search. Try a different term.
          </p>
        </div>
      )}

      {/* Voice Search Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          Voice Search Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Try asking: "How do I download wallpapers?"</li>
          <li>• Or say: "Show me nature wallpapers"</li>
          <li>• Ask: "What wallpaper resolutions do you have?"</li>
        </ul>
      </div>
    </section>
  )
}