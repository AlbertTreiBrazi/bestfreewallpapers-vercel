import React, { Suspense } from 'react'
import { PageLoadingSkeleton } from '@/components/ui/LoadingSkeleton'

// Dynamic import for the large admin panel component
const EnhancedAdminPanel = React.lazy(() => 
  import('@/components/admin/EnhancedAdminPanel').then(module => ({
    default: module.EnhancedAdminPanel
  }))
)

export function AdminPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <EnhancedAdminPanel />
    </Suspense>
  )
}

export default AdminPage
