# BestFreeWallpapers - Clean Vercel Deployment

A high-performance wallpaper website with advanced LCP (Largest Contentful Paint) optimizations, built with React, TypeScript, and Supabase.

## ✨ Features

- **Performance Optimized**: LCP optimizations for faster loading
- **Responsive Design**: Mobile-first responsive layout
- **Dark/Light Theme**: Automatic theme switching
- **Advanced Search**: Powerful search and filtering capabilities
- **SEO Optimized**: Meta tags, sitemaps, and structured data
- **High Performance**: Optimized images, lazy loading, and caching

## 🚀 Vercel Deployment

This version is fully optimized for Vercel deployment with npm compatibility.

### Prerequisites

1. **Supabase Project**: Create a new Supabase project at [supabase.com](https://supabase.com)
2. **Cloudflare Turnstile**: Set up a Turnstile site for bot protection

### Environment Variables

Before deploying, configure these environment variables in Vercel:

```
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
```

**Required Environment Variables:**

1. **VITE_SUPABASE_URL**
   - Format: `https://your-project-id.supabase.co`
   - Found in: Supabase Dashboard → Settings → API → Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Found in: Supabase Dashboard → Settings → API → anon public

3. **VITE_TURNSTILE_SITE_KEY**
   - Format: `0x4AAAAA...`
   - Found in: Cloudflare Turnstile Dashboard

### Deployment Steps

1. **Upload to GitHub**: Push this repository to GitHub

2. **Import to Vercel**: 
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. **Configure Build Settings**:
   - **Framework Preset**: `Vite`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**: Add all three required variables in Vercel settings

5. **Deploy**: Click "Deploy" and wait for the build to complete

## 🛠️ Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Fill in your environment variables in `.env.local`

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and configurations
│   ├── contexts/       # React contexts
│   └── styles/         # CSS styles
├── supabase/           # Supabase functions and migrations
├── index.html          # Main HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## 🔧 Performance Optimizations

This version includes comprehensive LCP (Largest Contentful Paint) optimizations:

- **Critical Resource Priority**: Proper preload and priority hints
- **Image Optimization**: WebP format with fallback support
- **Code Splitting**: Lazy-loaded routes and components
- **Caching Strategy**: Optimized caching headers
- **Bundle Optimization**: Tree-shaking and minification

## 🔐 Supabase Setup

The application requires the following Supabase resources:

### Database Tables
- `categories` - Wallpaper categories
- `wallpapers` - Wallpaper metadata
- `collections` - Curated wallpaper collections
- `favorites` - User favorites (if using auth)

### Storage Buckets
- `wallpapers` - High-resolution wallpaper images
- `thumbnails` - Optimized thumbnail versions

### Edge Functions
- `api-img` - Image optimization and serving
- `categories-api` - Categories data API
- `search-api` - Advanced search functionality

## 🐛 Troubleshooting

### Environment Variables Not Loading
- Ensure all variables start with `VITE_`
- Check that Vercel environment variables are properly set
- Restart deployment after adding variables

### Build Errors
- Clear Vercel cache and rebuild
- Check Node.js version compatibility (18+)
- Ensure all dependencies are installed

### Supabase Connection Issues
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Ensure RLS policies allow anonymous access

### Deployment Issues
- Check deployment logs in Vercel dashboard
- Ensure Build Command and Output Directory are correct
- Verify Install Command is `npm install` (not pnpm)

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run build:production` - Complete production build with SEO optimizations

## 🎯 Why This Version Works on Vercel

✅ **npm Compatible**: All pnpm references removed
✅ **Clean Scripts**: No pnpm store links or workspace dependencies  
✅ **Environment Variables**: Properly configured for Vercel
✅ **Build Optimized**: Standard Vite build process
✅ **No Hardcoded Secrets**: Safe for public deployment

## 📄 License

This project is provided as-is for deployment and customization.