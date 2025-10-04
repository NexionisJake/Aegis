import React, { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import './ThemeToggle.css'

const ThemeToggle = ({ className = '' }) => {
  const { currentTheme, themes, switchTheme, isTransitioning, currentThemeData } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleThemeSwitch = (themeName) => {
    switchTheme(themeName)
    setIsExpanded(false)
  }

  const toggleExpanded = () => {
    if (!isTransitioning) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div className={`theme-toggle ${className} ${isExpanded ? 'expanded' : ''} ${isTransitioning ? 'transitioning' : ''}`}>
      <button 
        className="theme-toggle-button"
        onClick={toggleExpanded}
        disabled={isTransitioning}
        title={`Current: ${currentThemeData.name}`}
      >
        <span className="theme-icon">{currentThemeData.icon}</span>
        <span className="theme-label">{currentTheme.toUpperCase()}</span>
        <span className="expand-arrow">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="theme-options">
          <div className="theme-options-header">
            <h4>Mission Mode</h4>
            <p>Select operational theme</p>
          </div>
          
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-option ${currentTheme === key ? 'active' : ''}`}
              onClick={() => handleThemeSwitch(key)}
              disabled={isTransitioning || currentTheme === key}
            >
              <div className="theme-option-header">
                <span className="theme-option-icon">{theme.icon}</span>
                <span className="theme-option-name">{theme.name}</span>
              </div>
              <p className="theme-option-description">{theme.description}</p>
              
              <div className="theme-preview">
                <div 
                  className="color-preview primary" 
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary Color"
                ></div>
                <div 
                  className="color-preview secondary" 
                  style={{ backgroundColor: theme.colors.secondary }}
                  title="Secondary Color"
                ></div>
                <div 
                  className="color-preview accent" 
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Accent Color"
                ></div>
              </div>
            </button>
          ))}
          
          <div className="theme-status">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">
                {isTransitioning ? 'Switching modes...' : `${currentThemeData.name} Active`}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-spinner"></div>
        </div>
      )}
    </div>
  )
}

export default ThemeToggle