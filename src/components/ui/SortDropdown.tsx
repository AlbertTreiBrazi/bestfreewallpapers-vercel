import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUpDown, Calendar, TrendingUp, Download, SortAsc, SortDesc } from 'lucide-react'

export type SortOption = 
  | 'newest' 
  | 'oldest' 
  | 'popular' 
  | 'downloaded' 
  | 'title_asc' 
  | 'title_desc'

interface SortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
  className?: string
  disabled?: boolean
}

const SORT_OPTIONS = [
  {
    value: 'newest' as SortOption,
    label: 'Newest First',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Most recently uploaded'
  },
  {
    value: 'oldest' as SortOption,
    label: 'Oldest First',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Earliest uploaded'
  },
  {
    value: 'popular' as SortOption,
    label: 'Most Popular',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Based on engagement'
  },
  {
    value: 'downloaded' as SortOption,
    label: 'Most Downloaded',
    icon: <Download className="w-4 h-4" />,
    description: 'Highest download count'
  },
  {
    value: 'title_asc' as SortOption,
    label: 'A-Z',
    icon: <SortAsc className="w-4 h-4" />,
    description: 'Alphabetical order'
  },
  {
    value: 'title_desc' as SortOption,
    label: 'Z-A',
    icon: <SortDesc className="w-4 h-4" />,
    description: 'Reverse alphabetical'
  }
]

export function SortDropdown({ value, onChange, className = '', disabled = false }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOption = SORT_OPTIONS.find(option => option.value === value) || SORT_OPTIONS[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    }
  }

  const handleOptionSelect = (option: SortOption) => {
    onChange(option)
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  const handleOptionKeyDown = (event: React.KeyboardEvent, option: SortOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOptionSelect(option)
    }
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium
          bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500
          transition-colors duration-200 min-w-[200px]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-gray-500 border-gray-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort options"
      >
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">Sort:</span>
          <div className="flex items-center space-x-1">
            {selectedOption.icon}
            <span className="font-semibold text-gray-900">{selectedOption.label}</span>
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95 duration-200
          /* Desktop-only: Ensure dropdown is never clipped */
          z-[1100]
          @media (min-width: 1440px) {
            z-[1200];
          }
        "
        style={{
          // Desktop positioning to prevent clipping
          ...(window.innerWidth >= 1440 && {
            zIndex: 1200
          })
        }}>
          <div className="py-2" role="listbox">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Sort Options
            </div>
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
                  className={`
                    w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-150
                    flex items-center space-x-3 focus:outline-none focus:bg-gray-50
                    ${isSelected ? 'bg-purple-50 border-r-4 border-gray-500' : ''}
                  `}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isSelected ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      isSelected ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SortDropdown