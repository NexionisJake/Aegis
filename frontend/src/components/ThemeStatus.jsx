import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import './ThemeStatus.css'

const ThemeStatus = ({ className = '' }) => {
  const { currentThemeData, isTransitioning } = useTheme()

  return (
    <div className={`theme-status-indicator ${className} ${isTransitioning ? 'transitioning' : ''}`}>
      <div className="status-content">
        <span className="status-icon">{currentThemeData.icon}</span>
        <div className="status-info">
          <span className="status-mode">{currentThemeData.name}</span>
          <span className="status-description">{currentThemeData.description}</span>
        </div>
        <div className="status-pulse"></div>
      </div>
    </div>
  )
}

export default ThemeStatus