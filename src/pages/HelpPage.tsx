import React, { useState } from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { HelpCircle, ChevronDown, ChevronUp, Download, Search, User, CreditCard, Upload, Mail, Phone, MessageCircle } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

export function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const faqs: FAQItem[] = [
    {
      question: "How do I download wallpapers?",
      answer: "Click on any wallpaper to open the preview, then click the download button. You can choose from multiple resolutions including Full HD, 4K, and mobile formats.",
      category: "downloads"
    },
    {
      question: "Are all wallpapers free to download?",
      answer: "Yes! All wallpapers on our platform are completely free to download and use. Some premium features require a subscription, but the wallpapers themselves are always free.",
      category: "general"
    },
    {
      question: "Do I need to create an account?",
      answer: "No, you can browse and download wallpapers without creating an account. However, creating a free account allows you to save favorites and access additional features.",
      category: "account"
    },
    {
      question: "What resolutions are available?",
      answer: "We offer multiple resolutions for each wallpaper: 1920x1080 (Full HD), 2560x1440 (QHD), 3840x2160 (4K), and mobile formats optimized for phones and tablets.",
      category: "downloads"
    },
    {
      question: "How do I search for specific wallpapers?",
      answer: "Use the search bar at the top of the page to search by keywords, colors, or themes. You can also browse by categories or use our advanced filters.",
      category: "search"
    },
    {
      question: "Can I upload my own wallpapers?",
      answer: "Yes! We welcome high-quality wallpaper submissions. Please review our upload guidelines to ensure your images meet our quality and content standards.",
      category: "upload"
    },
    {
      question: "What are the benefits of premium membership?",
      answer: "Premium members get access to exclusive wallpapers, early access to new collections, ad-free browsing, and bulk download features.",
      category: "premium"
    },
    {
      question: "How do I cancel my premium subscription?",
      answer: "You can cancel your subscription anytime from your account settings. Your premium benefits will continue until the end of your billing period.",
      category: "premium"
    },
    {
      question: "Are these wallpapers safe to use?",
      answer: "Absolutely! All wallpapers are scanned for malware and reviewed for content safety. We only host high-quality, safe images.",
      category: "general"
    },
    {
      question: "Can I use these wallpapers commercially?",
      answer: "Most wallpapers are for personal use only. Check the license information on each wallpaper's page for commercial usage rights.",
      category: "general"
    }
  ]

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'general', label: 'General' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'account', label: 'Account' },
    { id: 'search', label: 'Search & Browse' },
    { id: 'upload', label: 'Uploads' },
    { id: 'premium', label: 'Premium' }
  ]

  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory)

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <>
      <SEOHead 
        config={{
          title: "Help Center | BestFreeWallpapers",
          description: "Get help with downloading wallpapers, account management, and using our platform. Find answers to frequently asked questions.",
          keywords: ['help', 'support', 'FAQ', 'wallpapers', 'downloads'],
          type: 'article'
        }}
      />
      
      <div className="min-h-screen bg-theme-primary py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-theme-primary mb-4">Help Center</h1>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              Find answers to common questions and get the help you need to make the most of BestFreeWallpapers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1">
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-theme-primary mb-4">Categories</h2>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-gray-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Quick Help Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-theme-surface border border-theme-light rounded-lg p-6 text-center">
                  <Download className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-theme-primary mb-2">Download Guide</h3>
                  <p className="text-sm text-theme-secondary mb-3">Learn how to download wallpapers in different resolutions</p>
                  <a href="#downloads" className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                    View Guide →
                  </a>
                </div>
                <div className="bg-theme-surface border border-theme-light rounded-lg p-6 text-center">
                  <User className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-theme-primary mb-2">Account Help</h3>
                  <p className="text-sm text-theme-secondary mb-3">Manage your account, favorites, and preferences</p>
                  <a href="#account" className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                    Account Help →
                  </a>
                </div>
                <div className="bg-theme-surface border border-theme-light rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-theme-primary mb-2">Upload Guidelines</h3>
                  <p className="text-sm text-theme-secondary mb-3">Submit your own wallpapers following our guidelines</p>
                  <a href="/guidelines" className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                    Read Guidelines →
                  </a>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-theme-primary mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {filteredFAQs.map((faq, index) => (
                    <div key={index} className="border border-theme-light rounded-lg">
                      <button
                        onClick={() => toggleFAQ(index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-theme-secondary transition-colors"
                      >
                        <span className="font-medium text-theme-primary">{faq.question}</span>
                        {openFAQ === index ? (
                          <ChevronUp className="w-5 h-5 text-theme-secondary" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-theme-secondary" />
                        )}
                      </button>
                      {openFAQ === index && (
                        <div className="px-6 pb-4">
                          <p className="text-theme-secondary leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Section */}
              <div className="mt-8 bg-theme-surface border border-theme-light rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-theme-primary mb-4">Still Need Help?</h2>
                <p className="text-theme-secondary mb-6">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a 
                    href="/contact" 
                    className="flex items-center p-4 border border-theme-light rounded-lg hover:bg-theme-secondary transition-colors"
                  >
                    <Mail className="w-6 h-6 text-gray-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-theme-primary">Email Support</h3>
                      <p className="text-sm text-theme-secondary">Get help via email</p>
                    </div>
                  </a>
                  <a 
                    href="tel:+1-555-WALLPAPER" 
                    className="flex items-center p-4 border border-theme-light rounded-lg hover:bg-theme-secondary transition-colors"
                  >
                    <Phone className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-theme-primary">Phone Support</h3>
                      <p className="text-sm text-theme-secondary">Call us directly</p>
                    </div>
                  </a>
                  <a 
                    href="#chat" 
                    className="flex items-center p-4 border border-theme-light rounded-lg hover:bg-theme-secondary transition-colors"
                  >
                    <MessageCircle className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-theme-primary">Live Chat</h3>
                      <p className="text-sm text-theme-secondary">Chat with support</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HelpPage