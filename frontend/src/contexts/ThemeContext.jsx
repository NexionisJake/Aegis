import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('aegis') // 'aegis' or 'impact'
  const [isTransitioning, setIsTransitioning] = useState(false)

  const themes = {
    aegis: {
      name: 'Aegis Defense Mode',
      icon: '🛡️',
      description: 'Protection and monitoring systems active',
      colors: {
        // Aegis (Defense) Mode - Cooler protective tones
        primary: '#00E5FF',        // Aegis Cyan
        primaryRgb: '0, 229, 255', // RGB for rgba usage
        secondary: '#1E90FF',      // Terra Blue  
        accent: '#64B5F6',         // Light Blue
        warning: '#FF9800',        // Amber warning
        danger: '#F44336',         // Red alert
        success: '#4CAF50',        // Green success
        
        // Backgrounds
        deepSpace: '#050B1A',      // Deep Space
        nebulaBlue: '#0E1D3A',     // Nebula Blue
        panelDark: 'rgba(10, 15, 35, 0.85)',
        panelBorder: '#22304A',
        
        // Text colors
        cloudWhite: '#F5F7FA',     // Cloud White
        orbitGray: '#AAB2C8',      // Orbit Gray
        duskGray: '#2B354B',       // Dusk Gray
        
        // Special effects
        solarGold: '#90CAF9',      // Cooler solar tone
        emberOrange: '#64B5F6',    // Blue instead of orange
        
        // Gradients
        cosmicDepth: 'linear-gradient(135deg, #0E1D3A, #001024)',
        solarGlow: 'radial-gradient(circle at center, rgba(100, 181, 246, 0.2), transparent)',
        impactWarning: 'linear-gradient(135deg, #64B5F6, #1E90FF)'
      }
    },
    
    impact: {
      name: 'Impact Crisis Mode',
      icon: '💥',
      description: 'High-energy impact simulation active',
      colors: {
        // Impact (Crisis) Mode - Warm aggressive tones
        primary: '#FF6F3C',        // Ember Orange
        primaryRgb: '255, 111, 60', // RGB for rgba usage
        secondary: '#FF3B3B',      // Warning Red
        accent: '#FF5722',         // Deep Orange
        warning: '#FF9800',        // Amber
        danger: '#D32F2F',         // Dark Red
        success: '#FF6F3C',        // Orange success
        
        // Backgrounds
        deepSpace: '#1A0505',      // Dark Red Space
        nebulaBlue: '#3A0E0E',     // Red Nebula
        panelDark: 'rgba(35, 10, 10, 0.85)',
        panelBorder: '#4A2222',
        
        // Text colors
        cloudWhite: '#FAF5F5',     // Warm White
        orbitGray: '#C8AAB2',      // Warm Gray
        duskGray: '#4B2B35',       // Warm Dusk
        
        // Special effects
        solarGold: '#FFCC33',      // Solar Gold
        emberOrange: '#FF6F3C',    // Ember Orange
        
        // Gradients
        cosmicDepth: 'linear-gradient(135deg, #3A0E0E, #240101)',
        solarGlow: 'radial-gradient(circle at center, rgba(255, 111, 60, 0.3), transparent)',
        impactWarning: 'linear-gradient(135deg, #FF6F3C, #FF3B3B)'
      }
    }
  }

  const switchTheme = (themeName) => {
    if (themeName === currentTheme || isTransitioning) return
    
    setIsTransitioning(true)
    
    // Add transition effect
    document.body.classList.add('theme-transitioning')
    
    setTimeout(() => {
      setCurrentTheme(themeName)
      updateCSSVariables(themes[themeName].colors)
      
      setTimeout(() => {
        setIsTransitioning(false)
        document.body.classList.remove('theme-transitioning')
      }, 300)
    }, 150)
  }

  const updateCSSVariables = (colors) => {
    const root = document.documentElement
    
    // Update CSS custom properties
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-rgb', colors.primaryRgb)
    root.style.setProperty('--color-secondary', colors.secondary)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-danger', colors.danger)
    root.style.setProperty('--color-success', colors.success)
    
    root.style.setProperty('--color-deep-space', colors.deepSpace)
    root.style.setProperty('--color-nebula-blue', colors.nebulaBlue)
    root.style.setProperty('--color-panel-dark', colors.panelDark)
    root.style.setProperty('--color-panel-border', colors.panelBorder)
    
    root.style.setProperty('--color-cloud-white', colors.cloudWhite)
    root.style.setProperty('--color-orbit-gray', colors.orbitGray)
    root.style.setProperty('--color-dusk-gray', colors.duskGray)
    
    root.style.setProperty('--color-solar-gold', colors.solarGold)
    root.style.setProperty('--color-ember-orange', colors.emberOrange)
    
    // Update aegis cyan and other specific colors to match the theme
    root.style.setProperty('--color-aegis-cyan', colors.primary)
    root.style.setProperty('--color-terra-blue', colors.secondary)
    root.style.setProperty('--color-warning-red', colors.danger)
    
    root.style.setProperty('--gradient-cosmic-depth', colors.cosmicDepth)
    root.style.setProperty('--gradient-solar-glow', colors.solarGlow)
    root.style.setProperty('--gradient-impact-warning', colors.impactWarning)
    
    // Add body attribute for CSS targeting
    document.body.setAttribute('data-theme', currentTheme)
  }

  // Initialize theme on mount
  useEffect(() => {
    updateCSSVariables(themes[currentTheme].colors)
  }, [])

  const value = {
    currentTheme,
    themes,
    switchTheme,
    isTransitioning,
    currentThemeData: themes[currentTheme]
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider