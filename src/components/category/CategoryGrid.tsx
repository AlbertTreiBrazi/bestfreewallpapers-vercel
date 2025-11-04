import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Comprehensive category list (100+ categories)
const POPULAR_CATEGORIES = [
  // Animals
  'Butterfly', 'Wolf', 'Cat', 'Dog', 'Gorilla', 'Cute panda', 'Leopard print', 'Tiger', 'Eagle',
  'Elephant', 'Lion', 'Bear', 'Horse', 'Dolphin', 'Shark', 'Snake', 'Birds', 'Fish', 'Rabbit',
  'Fox', 'Deer', 'Owl', 'Penguin', 'Monkey', 'Wild animals', 'Pet animals', 'Zoo animals',
  
  // Characters & Anime
  'Kuromi', 'Cinnamoroll', 'Itachi', 'My melody', 'Hello Kitty', 'Naruto', 'Dragon Ball',
  'One Piece', 'Attack on Titan', 'Demon Slayer', 'Pokemon', 'Studio Ghibli', 'Disney',
  'Anime girls', 'Anime boys', 'Kawaii', 'Chibi', 'Manga', 'Otaku',
  
  // Brands & Tech
  'Supreme', 'Versace', 'Razer', 'MSI', 'BMW', 'OnePlus', 'Apple', 'Samsung', 'Nike',
  'Adidas', 'Gucci', 'Louis Vuitton', 'Off White', 'PlayStation', 'Xbox', 'Nintendo',
  'Tesla', 'Ferrari', 'Lamborghini', 'Mercedes', 'Audi', 'Porsche',
  
  // Movies & TV
  'Marvel', 'Spiderman', 'Batman', 'Superman', 'Avengers', 'Iron Man', 'Captain America',
  'Thor', 'Hulk', 'Wonder Woman', 'Joker', 'Deadpool', 'X-Men', 'Star Wars', 'Harry Potter',
  'Game of Thrones', 'Breaking Bad', 'Stranger Things', 'The Office', 'Friends',
  
  // Gaming
  'Overwatch', 'League of Legends', 'Valorant', 'Brawl Stars', 'Fortnite', 'PUBG',
  'Call of Duty', 'Minecraft', 'Among Us', 'Fall Guys', 'Apex Legends', 'Counter Strike',
  'Dota 2', 'World of Warcraft', 'FIFA', 'GTA', 'Cyberpunk', 'Assassin Creed',
  
  // Aesthetic & Vibes
  'Pink aesthetic', 'Purple aesthetic', 'Blue aesthetic', 'Dark aesthetic', 'Minimalist',
  'Vintage', 'Retro', 'Vaporwave', 'Synthwave', 'Lo-fi', 'Cottagecore', 'Dark academia',
  'Y2K', 'Grunge', 'Pastel', 'Neon', 'Glitter', 'Marble', 'Gold', 'Rose gold',
  
  // Nature & Landscapes
  'Mountains', 'Ocean', 'Forest', 'Desert', 'Sunset', 'Sunrise', 'Beach', 'Waterfall',
  'Lake', 'River', 'Flowers', 'Trees', 'Sky', 'Clouds', 'Rainbow', 'Snow', 'Rain',
  'Autumn', 'Spring', 'Summer', 'Winter', 'Tropical', 'Garden', 'Jungle',
  
  // Space & Sci-Fi
  'Galaxy', 'Nebula', 'Planets', 'Stars', 'Moon', 'Sun', 'Space', 'Astronaut',
  'Rocket', 'UFO', 'Alien', 'Sci-fi', 'Cyberpunk', 'Futuristic', 'Robot', 'AI',
  
  // Abstract & Art
  'Abstract', 'Geometric', 'Mandala', 'Fractal', 'Digital art', 'Painting', 'Sketch',
  'Watercolor', 'Oil painting', 'Street art', 'Pop art', 'Modern art', 'Classical art',
  
  // Colors
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink',
  'Gray', 'Brown', 'Turquoise', 'Magenta', 'Lime', 'Navy', 'Maroon', 'Teal',
  
  // Patterns & Textures
  'Stripes', 'Polka dots', 'Chevron', 'Damask', 'Paisley', 'Floral', 'Wood',
  'Metal', 'Stone', 'Fabric', 'Leather', 'Paper', 'Glass', 'Water', 'Fire',
  
  // Lifestyle & Hobbies
  'Music', 'Guitar', 'Piano', 'DJ', 'Headphones', 'Vinyl', 'Concert', 'Dance',
  'Fitness', 'Yoga', 'Gym', 'Sports', 'Football', 'Basketball', 'Soccer', 'Baseball',
  'Tennis', 'Golf', 'Skateboard', 'Surfing', 'Snowboard', 'Motorcycle', 'Car',
  
  // Food & Drinks
  'Coffee', 'Tea', 'Wine', 'Beer', 'Cocktail', 'Pizza', 'Burger', 'Ice cream',
  'Cake', 'Fruit', 'Chocolate', 'Sushi', 'Pasta', 'Healthy food',
  
  // Occasions & Holidays
  'Christmas', 'Halloween', 'Valentine', 'New Year', 'Birthday', 'Wedding',
  'Easter', 'Thanksgiving', 'Independence Day', 'Summer vacation', 'Party',
  
  // Inspirational & Quotes
  'Motivational', 'Inspirational', 'Love quotes', 'Life quotes', 'Success',
  'Dreams', 'Goals', 'Positive vibes', 'Mindfulness', 'Peace', 'Hope'
]

interface CategoryGridProps {
  selectedCategory?: string
  onCategorySelect: (category: string) => void
  className?: string
}

export function CategoryGrid({ 
  selectedCategory = 'all', 
  onCategorySelect, 
  className = '' 
}: CategoryGridProps) {
  const [showAll, setShowAll] = useState(false)
  const [databaseCategories, setDatabaseCategories] = useState<any[]>([])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Load existing database categories
  useEffect(() => {
    loadDatabaseCategories()
  }, [])

  const loadDatabaseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name, slug')
        .eq('is_active', true)
        .order('sort_order')
      
      if (!error && data) {
        setDatabaseCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Combine database categories with popular categories, removing duplicates
  const allCategories = React.useMemo(() => {
    const dbCategoryNames = new Set(databaseCategories.map(cat => cat.name.toLowerCase()))
    const uniquePopularCategories = POPULAR_CATEGORIES.filter(
      cat => !dbCategoryNames.has(cat.toLowerCase())
    )
    
    return [
      ...databaseCategories.map(cat => cat.name),
      ...uniquePopularCategories
    ]
  }, [databaseCategories])

  const displayCategories = showAll ? allCategories : allCategories.slice(0, 30)

  const handleCategoryClick = (category: string) => {
    if (category === 'All') {
      onCategorySelect('all')
      navigate('/free-wallpapers')
      return
    }

    // Find matching database category
    const dbCategory = databaseCategories.find(
      cat => cat.name.toLowerCase() === category.toLowerCase()
    )
    
    if (dbCategory) {
      // Navigate to existing category page with visual feedback
      onCategorySelect(category.toLowerCase())
      navigate(`/category/${dbCategory.slug}`)
    } else {
      // Use search functionality for popular categories with clear indication
      onCategorySelect('search')
      const currentParams = new URLSearchParams(searchParams)
      currentParams.set('q', category)
      currentParams.set('type', 'category') // Add type indicator
      currentParams.delete('category')
      navigate(`/search?${currentParams.toString()}`)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Categories Container */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Navigation */}
          <div className="flex flex-wrap items-center gap-1 text-sm leading-relaxed">
            {/* All Categories Link */}
            <button
              onClick={() => handleCategoryClick('All')}
              className={`inline-block px-2 py-1 rounded-md hover:bg-gray-100 transition-colors ${
                selectedCategory === 'all' 
                  ? 'text-gray-600 font-semibold bg-purple-50' 
                  : 'text-gray-700 hover:text-gray-600'
              }`}
            >
              All
            </button>
            
            <span className="text-gray-400">·</span>
            
            {/* Category Links */}
            {displayCategories.map((category, index) => {
              const isSelected = selectedCategory === category.toLowerCase() ||
                               searchParams.get('q')?.toLowerCase() === category.toLowerCase()
              
              // Check if this is a database category with dedicated page
              const dbCategory = databaseCategories.find(
                cat => cat.name.toLowerCase() === category.toLowerCase()
              )
              const hasPage = !!dbCategory
              
              return (
                <React.Fragment key={category}>
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className={`inline-flex items-center px-2 py-1 rounded-md hover:bg-gray-100 transition-colors ${
                      isSelected
                        ? 'text-gray-600 font-semibold bg-purple-50'
                        : 'text-gray-700 hover:text-gray-600'
                    }`}
                    title={hasPage ? `Browse ${category} category page` : `Search for ${category} wallpapers`}
                  >
                    <span>{category}</span>
                    {!hasPage && (
                      <span className="ml-1 text-xs opacity-60" aria-label="Search results">
                        🔍
                      </span>
                    )}
                  </button>
                  
                  {index < displayCategories.length - 1 && (
                    <span className="text-gray-400">·</span>
                  )}
                </React.Fragment>
              )
            })}
            
            {/* Show More/Less Button */}
            {allCategories.length > 30 && (
              <>
                <span className="text-gray-400">·</span>
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-700 hover:bg-purple-50 rounded-md transition-colors font-medium"
                >
                  <span>{showAll ? 'Show Less' : `+${allCategories.length - 30} More`}</span>
                  {showAll ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}