import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react'

export function Footer() {
  const { theme } = useTheme()
  const currentYear = new Date().getFullYear()

  const footerSections = {
    'Main Pages': [
      { name: 'Home', href: '/' },
      { name: 'Search', href: '/search' },
      { name: 'Free Wallpapers', href: '/free-wallpapers' },
      { name: 'Premium Wallpapers', href: '/premium' },
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
    ],
    'Categories': [
      { name: 'Nature', href: '/category/nature' },
      { name: 'Abstract', href: '/category/abstract' },
      { name: 'Gaming', href: '/category/gaming' },
      { name: 'Space', href: '/category/space' },
      { name: 'Technology', href: '/category/technology' },
      { name: 'Movies', href: '/category/movies' },
    ],
    'Resources': [
      { name: 'Help Center', href: '/help' },
      { name: 'Upload Guidelines', href: '/guidelines' },
      { name: 'API Access', href: '/api' },
      { name: 'Mobile App', href: '/mobile' },
      { name: 'Wallpaper Sizes', href: '/sizes' },
    ],
    'Legal': [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms & Conditions', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookie-policy' },
      { name: 'DMCA', href: '/dmca' },
      { name: 'License Info', href: '/license' },
    ],
  }

  return (
    <footer className={`${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-900'} text-white transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold">BestFreeWallpapers</span>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Discover over 10,000+ stunning HD, 4K & 8K wallpapers across all categories. 
              Download premium quality wallpapers for your desktop, mobile, and tablet devices. 
              New wallpapers added daily from our curated collection.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div>
                <div className="text-2xl font-bold text-white">10K+</div>
                <div className="text-xs text-gray-400">Wallpapers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-xs text-gray-400">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1M+</div>
                <div className="text-xs text-gray-400">Downloads</div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerSections).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-lg font-semibold mb-4">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-300 hover:text-white transition duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 mb-4 md:mb-0">
            <div>© {currentYear} BestFreeWallpapers. All rights reserved.</div>
            <div className="text-xs text-gray-600 mt-1">BFW-staging r3</div>
          </div>
          
          {/* Social Media Links */}
          <div className="flex space-x-6">
            <a
              href="https://facebook.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition duration-200"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://instagram.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition duration-200"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition duration-200"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="mailto:contact@bestfreewallpapers.com"
              className="text-gray-400 hover:text-white transition duration-200"
              aria-label="Contact us via email"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}