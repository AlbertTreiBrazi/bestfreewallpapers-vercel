import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { splitVendorChunkPlugin } from 'vite'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }), 
    splitVendorChunkPlugin(),
    // Gzip compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10KB
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    }),
    // Brotli compression (better than gzip but requires server support)
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps for production (smaller bundle)
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        safari10: true // Safari 10 compatibility
      },
      format: {
        comments: false // Remove all comments
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI library chunks
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          // Icons and utilities
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          // Admin chunk - separated to reduce main bundle size
          'admin': [
            '@/components/admin/EnhancedAdminPanel',
            '@/components/admin/EnhancedAdminPanel_Fixed',
            '@/components/admin/WallpaperManagement',
            '@/components/admin/CategoriesManagement',
            '@/components/admin/CollectionsManagement',
            '@/components/admin/EnhancedCollectionManagement',
            '@/components/admin/EnhancedUserManagement',
            '@/components/admin/AnalyticsDashboard',
            '@/components/admin/EnhancedAnalyticsDashboard',
            '@/components/admin/ComprehensiveAnalyticsDashboard',
            '@/components/admin/CacheManagement',
            '@/components/admin/EnhancedCacheManagement',
            '@/components/admin/SlugManagement',
            '@/components/admin/EnhancedSlugManagement',
            '@/components/admin/AdSettingsManagement',
            '@/components/admin/AdConfigPanel',
            '@/components/admin/SecurityDashboard',
            '@/components/admin/UploadSecurityDashboard',
            '@/components/admin/VideoManagementDashboard',
            '@/components/admin/AdminActionsLog',
            '@/components/admin/PerformanceCharts',
            '@/components/premium/BannerManagement'
          ]
        },
        // Better file naming for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(name)) {
            return 'assets/images/[name]-[hash][extname]'
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          } else if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // Inline small CSS files for better LCP
    cssMinify: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
    // Report compressed size
    reportCompressedSize: true,
    // Additional optimizations for bundle size reduction
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      // Development security headers - matches production configuration
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.supabase.net https://*.minimax.io",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "media-src 'self' https: data: blob:",
        "connect-src 'self' https://*.supabase.co https://*.supabase.net https://*.minimax.io wss://*.supabase.co wss://*.supabase.net",
        "frame-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'"
      ].join('; '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Add caching headers for development
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    // Exclude heavy dependencies that don't need pre-bundling
    exclude: []
  }
})