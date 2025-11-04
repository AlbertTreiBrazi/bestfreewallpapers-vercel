import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Filter, SlidersHorizontal } from 'lucide-react';

interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'toggle' | 'range';
  options?: { value: string; label: string }[];
  value?: any;
  defaultValue?: any;
}

interface SearchFiltersProps {
  filters: SearchFilter[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
  onClear: () => void;
  className?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  isChanging?: boolean;
}

export function SearchFilters({
  filters,
  values,
  onChange,
  onClear,
  className = '',
  isMobile = false,
  isOpen = true,
  onToggle,
  isChanging = false
}: SearchFiltersProps) {
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(
    new Set(['category', 'deviceType', 'resolution', 'sortBy'])
  );

  const toggleFilter = (filterId: string) => {
    const newExpanded = new Set(expandedFilters);
    if (newExpanded.has(filterId)) {
      newExpanded.delete(filterId);
    } else {
      newExpanded.add(filterId);
    }
    setExpandedFilters(newExpanded);
  };

  const hasActiveFilters = Object.values(values).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value !== '' && value !== 'all';
    if (typeof value === 'boolean') return value;
    return false;
  });

  const getActiveFilterCount = () => {
    return Object.entries(values).reduce((count, [key, value]) => {
      if (Array.isArray(value)) return count + value.length;
      if (typeof value === 'string' && value !== '' && value !== 'all') return count + 1;
      if (typeof value === 'boolean' && value) return count + 1;
      return count;
    }, 0);
  };

  const renderFilter = (filter: SearchFilter) => {
    const currentValue = values[filter.id] || filter.defaultValue;

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => onChange(filter.id, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {filter.options?.map((option) => {
              const isSelected = Array.isArray(currentValue) && currentValue.includes(option.value);
              return (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = Array.isArray(currentValue) ? currentValue : [];
                      if (e.target.checked) {
                        onChange(filter.id, [...current, option.value]);
                      } else {
                        onChange(filter.id, current.filter(v => v !== option.value));
                      }
                    }}
                    className="text-gray-600 focus:ring-gray-500 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'toggle':
        return (
          <label className="flex items-center space-x-3 cursor-pointer group p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={currentValue || false}
              onChange={(e) => onChange(filter.id, e.target.checked)}
              disabled={isChanging}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">
              {currentValue ? 'Yes' : 'No'}
            </span>
          </label>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={filter.options?.[0]?.value || 0}
              max={filter.options?.[1]?.value || 100}
              value={currentValue || filter.defaultValue || 0}
              onChange={(e) => onChange(filter.id, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{filter.options?.[0]?.label}</span>
              <span>{currentValue || filter.defaultValue}</span>
              <span>{filter.options?.[1]?.label}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Filter Toggle */}
        <button
          onClick={onToggle}
          className="md:hidden w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filters</span>
            {hasActiveFilters && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Mobile Filter Panel */}
        {isOpen && (
          <div className="md:hidden mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Search Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={onClear}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <label className="block font-medium text-gray-700 text-sm">
                    {filter.label}
                  </label>
                  {renderFilter(filter)}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop View
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter List */}
      <div className="space-y-6">
        {/* Selection Filters Group */}
        <div className="space-y-4">
          {filters.filter(f => f.type !== 'toggle').map((filter) => (
            <div key={filter.id} className="space-y-3">
              <button
                onClick={() => toggleFilter(filter.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <label className="font-medium text-gray-900 cursor-pointer">
                  {filter.label}
                </label>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    expandedFilters.has(filter.id) ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              
              {expandedFilters.has(filter.id) && (
                <div className="pl-2">
                  {renderFilter(filter)}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200"></div>
        
        {/* Toggle Filters Group */}
        <div className="space-y-4">
          {filters.filter(f => f.type === 'toggle').map((filter) => (
            <div key={filter.id} className="space-y-2">
              <label className="font-medium text-gray-900 text-sm block">
                {filter.label}
              </label>
              <div className="pl-2">
                {renderFilter(filter)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
