import React from 'react'
import { User } from 'lucide-react'

export function UserLoadingSkeleton() {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 rounded-lg animate-pulse">
      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
        <User className="w-5 h-5 text-gray-500" />
      </div>
      <div className="hidden md:block">
        <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
        <div className="w-12 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}
