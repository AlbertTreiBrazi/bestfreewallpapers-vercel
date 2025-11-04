import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Default to dark mode
  const [theme, setThemeState] = useState<Theme>('dark')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme immediately on mount
  useEffect(() => {
    // Apply dark theme as default immediately
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    document.body.classList.remove('light')
    document.body.classList.add('dark')
    document.body.style.backgroundColor = '#111827'
    document.body.style.color = '#f9fafb'

    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeState(savedTheme)
      } else {
        // Default to dark mode
        setThemeState('dark')
        localStorage.setItem('theme', 'dark')
      }
    } catch (error) {
      console.warn('Error loading theme from localStorage:', error)
      setThemeState('dark')
    }
    setIsInitialized(true)
  }, [])

  // Apply theme to document body
  useEffect(() => {
    // Remove any existing theme classes
    document.documentElement.classList.remove('light', 'dark')
    document.body.classList.remove('light', 'dark')
    
    // Add the current theme class
    document.documentElement.classList.add(theme)
    document.body.classList.add(theme)
    
    // Ensure proper background color
    if (theme === 'light') {
      document.body.style.backgroundColor = '#ffffff'
      document.body.style.color = '#1f2937'
    } else {
      document.body.style.backgroundColor = '#111827'
      document.body.style.color = '#f9fafb'
    }
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    
    // Force immediate theme application to all modals and portals
    const modals = document.querySelectorAll('.modal-content, [role="dialog"]')
    modals.forEach(modal => {
      if (newTheme === 'dark') {
        modal.classList.add('dark')
        modal.classList.remove('light')
      } else {
        modal.classList.add('light')
        modal.classList.remove('dark')
      }
    })
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('theme', newTheme)
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
