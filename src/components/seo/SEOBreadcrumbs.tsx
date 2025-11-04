import React, { useEffect, useState } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface BreadcrumbItem {
  name: string
  url: string
  position: number
}

interface SEOBreadcrumbsProps {
  pageType: 'category' | 'wallpaper' | 'collection' | 'search'
  pageId?: string
  categoryId?: number
  customItems?: BreadcrumbItem[]
}

export function SEOBreadcrumbs({ 
  pageType, 
  pageId, 
  categoryId, 
  customItems 
}: SEOBreadcrumbsProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      try {
        if (customItems) {
          setBreadcrumbs(customItems)
          setLoading(false)
          return
        }

        // Use database function to generate breadcrumbs
        const { data, error } = await supabase
          .rpc('generate_breadcrumbs', {
            page_type: pageType,
            page_id: pageId || null,
            category_id: categoryId || null
          })

        if (!error && data) {
          setBreadcrumbs(data)
        } else {
          // Fallback breadcrumbs
          setBreadcrumbs([
            { name: 'Home', url: '/', position: 1 }
          ])
        }
      } catch (error) {
        console.error('Failed to generate breadcrumbs:', error)
        setBreadcrumbs([
          { name: 'Home', url: '/', position: 1 }
        ])
      } finally {
        setLoading(false)
      }
    }

    generateBreadcrumbs()
  }, [pageType, pageId, categoryId, customItems])

  // Generate structured data for breadcrumbs
  const generateStructuredData = () => {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': `https://bestfreewallpapers.com${item.url}`
      }))
    }
  }

  if (loading) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <ChevronRight className="w-4 h-4" />
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData())
        }}
      />

      {/* Visual Breadcrumbs */}
      <nav 
        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4 overflow-x-auto" 
        aria-label="Breadcrumb"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.position}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
            )}
            
            <div
              itemScope
              itemType="https://schema.org/ListItem"
              itemProp="itemListElement"
              className="flex-shrink-0"
            >
              <meta itemProp="position" content={item.position.toString()} />
              
              {index === breadcrumbs.length - 1 ? (
                // Current page - not a link
                <span 
                  className="font-medium text-gray-900 dark:text-white"
                  itemProp="name"
                  aria-current="page"
                >
                  {index === 0 && <Home className="w-4 h-4 inline mr-1" />}
                  {item.name}
                </span>
              ) : (
                // Link to previous pages
                <Link
                  to={item.url}
                  className="hover:text-gray-900 dark:hover:text-white transition-colors duration-200 flex items-center"
                  itemProp="item"
                >
                  {index === 0 && <Home className="w-4 h-4 mr-1" />}
                  <span itemProp="name">{item.name}</span>
                </Link>
              )}
            </div>
          </React.Fragment>
        ))}
      </nav>
    </>
  )
}