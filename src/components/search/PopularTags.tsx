import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';

interface PopularTag {
  name: string;
  count?: number;
  color?: string;
}

interface PopularTagsProps {
  onTagSelect: (tag: string) => void;
  selectedTags?: string[];
  className?: string;
  showHeader?: boolean;
  maxTags?: number;
}

export function PopularTags({
  onTagSelect,
  selectedTags = [],
  className = '',
  showHeader = true,
  maxTags = 20
}: PopularTagsProps) {
  const [popularTags] = useState<PopularTag[]>([
    // Aesthetic styles
    { name: 'Pink aesthetic', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { name: 'Dark aesthetic', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { name: 'Minimalist', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { name: 'Vintage', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    
    // Popular categories
    { name: 'Nature', color: 'bg-green-100 text-green-700 border-green-200' },
    { name: 'Space', color: 'bg-gray-100 text-gray-700 border-purple-200' },
    { name: 'Gaming', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { name: 'Anime', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    
    // Animals
    { name: 'Cat', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { name: 'Wolf', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { name: 'Lion', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    
    // Tech & Brands
    { name: 'iPhone wallpaper', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { name: '4K wallpaper', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { name: 'Supreme', color: 'bg-red-100 text-red-700 border-red-200' },
    
    // Nature specific
    { name: 'Mountains', color: 'bg-green-100 text-green-700 border-green-200' },
    { name: 'Ocean', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { name: 'Sunset', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    
    // Colors
    { name: 'Black', color: 'bg-gray-900 text-white border-gray-800' },
    { name: 'Purple', color: 'bg-gray-100 text-gray-700 border-purple-200' },
    { name: 'Blue', color: 'bg-blue-100 text-blue-700 border-blue-200' }
  ]);

  const handleTagClick = (tagName: string) => {
    onTagSelect(tagName);
  };

  const isTagSelected = (tagName: string) => {
    return selectedTags.includes(tagName);
  };

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center space-x-2 mb-4">
          <Tag className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900">Popular Tags</h3>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {popularTags.slice(0, maxTags).map((tag) => {
          const selected = isTagSelected(tag.name);
          return (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium 
                       border transition duration-200 hover:shadow-sm ${
                         selected 
                           ? 'bg-gray-100 text-gray-700 border-purple-300 shadow-sm'
                           : tag.color || 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                       }`}
            >
              {tag.name}
              {selected && (
                <X className="w-3 h-3 ml-1" />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Click tags to add them to your search
      </div>
    </div>
  );
}
