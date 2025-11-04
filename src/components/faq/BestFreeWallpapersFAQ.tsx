import React, { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { generateFAQSchema } from '@/utils/seo'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    id: 'what-makes-best-free-wallpapers',
    question: 'What makes these the best free wallpapers?',
    answer: 'Our collection features carefully curated, high-quality wallpapers in HD, 4K, and 8K resolutions. We select only the best designs from talented artists and ensure every wallpaper meets our quality standards. All wallpapers are completely free to download with no hidden costs or registration requirements.'
  },
  {
    id: 'are-wallpapers-really-free',
    question: 'Are the wallpapers really free to download?',
    answer: 'Yes, absolutely! All wallpapers on BestFreeWallpapers are completely free to download and use. There are no subscription fees, hidden costs, or premium accounts required. You can download any wallpaper instantly without even creating an account.'
  },
  {
    id: 'best-resolution-wallpapers',
    question: 'What resolutions are available for the best free wallpapers?',
    answer: 'We offer wallpapers in multiple high-quality resolutions including HD (1920x1080), 4K (3840x2160), and 8K (7680x4320) to ensure perfect quality on any device. Mobile wallpapers are optimized for phone screens, while desktop wallpapers come in widescreen formats.'
  },
  {
    id: 'how-often-new-wallpapers',
    question: 'How often do you add new best free wallpapers?',
    answer: 'We update our collection daily with fresh, trending wallpapers. Our team constantly searches for the best new designs in categories like nature, abstract, gaming, AI art, and more. Follow us to stay updated with the latest additions to our free wallpaper collection.'
  },
  {
    id: 'commercial-use-allowed',
    question: 'Can I use these free wallpapers commercially?',
    answer: 'Most wallpapers in our collection are free for personal use. For commercial use, please check the individual license information provided with each wallpaper. Many are available under Creative Commons licenses that allow commercial use with proper attribution.'
  },
  {
    id: 'mobile-vs-desktop-wallpapers',
    question: 'What\'s the difference between mobile and desktop wallpapers?',
    answer: 'Mobile wallpapers are optimized for phone screens with vertical (portrait) orientations and resolutions like 1080x1920 or 1440x2560. Desktop wallpapers are designed for computer monitors with horizontal (landscape) orientations like 1920x1080 or 4K. We offer both types in our best free wallpapers collection.'
  },
  {
    id: 'best-categories-available',
    question: 'What categories of best free wallpapers do you offer?',
    answer: 'Our collection includes dozens of categories: Nature, Abstract, Gaming, Technology, Space, AI Art, Animals, Cars, Anime, Movies, Architecture, and many more. Each category features hundreds of carefully selected high-quality wallpapers, making it easy to find the perfect background for your style.'
  },
  {
    id: 'download-without-account',
    question: 'Do I need to create an account to download wallpapers?',
    answer: 'No account required! You can download any of our best free wallpapers instantly without registration. However, creating a free account allows you to save favorites, track your downloads, and receive notifications about new wallpapers in your preferred categories.'
  }
]

export function BestFreeWallpapersFAQ() {
  const { theme } = useTheme()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems)
    if (openItems.has(id)) {
      newOpenItems.delete(id)
    } else {
      newOpenItems.add(id)
    }
    setOpenItems(newOpenItems)
  }

  // Generate FAQ structured data
  const faqSchema = generateFAQSchema(faqItems.map(item => ({
    question: item.question,
    answer: item.answer
  })))

  React.useEffect(() => {
    // Add FAQ schema to document head
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(faqSchema)
    script.id = 'faq-schema'
    document.head.appendChild(script)

    return () => {
      const existingScript = document.getElementById('faq-schema')
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  return (
    <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} mb-6`}>
            <HelpCircle className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
          </div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
            Best Free Wallpapers FAQ
          </h2>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
            Everything you need to know about downloading the best free wallpapers
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item) => {
            const isOpen = openItems.has(item.id)
            return (
              <div
                key={item.id}
                className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-gray-50 border-gray-200'} border rounded-lg transition-all duration-200 hover:shadow-md`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`w-full text-left p-6 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-dark-tertiary' : 'hover:bg-gray-100'}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-content-${item.id}`}
                >
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} pr-4`}>
                    {item.question}
                  </h3>
                  {isOpen ? (
                    <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                  )}
                </button>
                
                {isOpen && (
                  <div 
                    id={`faq-content-${item.id}`}
                    className="px-6 pb-6 pt-0"
                  >
                    <div className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Additional Help Section */}
        <div className={`mt-12 text-center p-8 rounded-lg ${theme === 'dark' ? 'bg-dark-primary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
            Still have questions about our best free wallpapers?
          </h3>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            Our support team is here to help you find the perfect wallpapers for your devices.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  )
}

export default BestFreeWallpapersFAQ
