import React from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  children: React.ReactNode
  value: string
  className?: string
  onClick?: () => void
}

interface TabsContentProps {
  children: React.ReactNode
  value: string
  className?: string
}

const TabsContext = React.createContext<{
  activeTab: string
  setActiveTab: (value: string) => void
}>({ activeTab: '', setActiveTab: () => {} })

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  defaultValue = '', 
  value, 
  onValueChange, 
  className 
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)
  
  const currentTab = value !== undefined ? value : activeTab
  
  const handleTabChange = (newTab: string) => {
    if (value === undefined) {
      setActiveTab(newTab)
    }
    onValueChange?.(newTab)
  }
  
  return (
    <TabsContext.Provider value={{ activeTab: currentTab, setActiveTab: handleTabChange }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      className
    )}>
      {children}
    </div>
  )
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  children, 
  value, 
  className, 
  onClick 
}) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)
  const isActive = activeTab === value
  
  const handleClick = () => {
    setActiveTab(value)
    onClick?.()
  }
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300",
        isActive
          ? "bg-white text-gray-950 shadow-sm dark:bg-gray-950 dark:text-gray-50"
          : "hover:bg-white/50 dark:hover:bg-gray-950/50",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  children, 
  value, 
  className 
}) => {
  const { activeTab } = React.useContext(TabsContext)
  
  if (activeTab !== value) {
    return null
  }
  
  return (
    <div className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300",
      className
    )}>
      {children}
    </div>
  )
}