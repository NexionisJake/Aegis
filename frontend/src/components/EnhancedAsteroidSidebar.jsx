import React, { useState, useEffect } from 'react'
import './EnhancedAsteroidSidebar.css'
import { enhancedApi, APIError, NetworkError, TimeoutError } from '../utils/apiClient'

const AsteroidCard = ({ asteroid, isSelected, onSelect }) => {
  const getThreatIcon = (threatLevel) => {
    switch (threatLevel) {
      case 'HIGH': return '🔴'
      case 'MEDIUM': return '🟡'
      default: return '🟢'
    }
  }

  const getThreatColor = (threatLevel) => {
    switch (threatLevel) {
      case 'HIGH': return '#ff4444'
      case 'MEDIUM': return '#ffaa00'
      default: return '#00ff88'
    }
  }

  return (
    <div 
      className={`asteroid-card ${isSelected ? 'selected' : ''} ${asteroid.threat_level?.toLowerCase()}`}
      onClick={() => onSelect(asteroid)}
    >
      <div className="asteroid-header">
        <h3 className="asteroid-name">{asteroid.name}</h3>
        <span className="threat-indicator" style={{ borderColor: getThreatColor(asteroid.threat_level) }}>
          {getThreatIcon(asteroid.threat_level)} {asteroid.threat_level}
        </span>
      </div>
      
      <div className="asteroid-details">
        <div className="detail-row">
          <span className="label">Diameter:</span>
          <span className="value">
            {asteroid.diameter_km ? `${asteroid.diameter_km.toFixed(3)} km` : 'Unknown'}
          </span>
        </div>
        
        <div className="detail-row">
          <span className="label">Status:</span>
          <span className="value">
            {asteroid.is_potentially_hazardous ? '⚠️ Potentially Hazardous' : '✅ Safe'}
          </span>
        </div>
        
        {asteroid.absolute_magnitude && (
          <div className="detail-row">
            <span className="label">Brightness:</span>
            <span className="value">H = {asteroid.absolute_magnitude}</span>
          </div>
        )}

        {asteroid.orbital_period && (
          <div className="detail-row">
            <span className="label">Orbital Period:</span>
            <span className="value">{parseFloat(asteroid.orbital_period).toFixed(1)} days</span>
          </div>
        )}
        
        <div className="description">
          {asteroid.description}
        </div>

        {asteroid.nasa_jpl_url && (
          <div className="nasa-link">
            <a 
              href={asteroid.nasa_jpl_url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              🚀 View on NASA JPL
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

const EnhancedAsteroidSidebar = ({ selectedAsteroid, onAsteroidSelect }) => {
  const [asteroids, setAsteroids] = useState([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL') // ALL, HIGH, MEDIUM, LOW
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchAsteroids = async () => {
      try {
        setFetchLoading(true)
        setError(null)
        const data = await enhancedApi.getEnhancedAsteroidsList()
        setAsteroids(data.asteroids || [])
      } catch (err) {
        console.error('Failed to fetch asteroids:', err)
        if (err instanceof TimeoutError) {
          setError('Request timed out contacting backend API.')
        } else if (err instanceof NetworkError) {
          setError('Cannot reach backend server. Is it running on port 8000?')
        } else if (err instanceof APIError) {
          if (err.status === 503) {
            setError('Backend in degraded mode (scientific libs unavailable). Showing fallback data.')
          } else {
            setError(`API error ${err.status}: ${err.message}`)
          }
        } else {
          setError('Failed to load asteroid data. Please check your connection.')
        }
        
        // Fallback data for development/testing
        setAsteroids([
          {
            name: "Apophis",
            diameter_km: 0.340,
            is_potentially_hazardous: true,
            threat_level: "HIGH",
            description: "⚠️ Potentially Hazardous - Close approach in 2029",
            absolute_magnitude: 19.7,
            orbital_period: 323.6
          },
          {
            name: "Bennu",
            diameter_km: 0.492,
            is_potentially_hazardous: true,
            threat_level: "HIGH", 
            description: "⚠️ Potentially Hazardous - OSIRIS-REx sample return target",
            absolute_magnitude: 20.9,
            orbital_period: 436.6
          },
          {
            name: "Ryugu",
            diameter_km: 0.900,
            is_potentially_hazardous: false,
            threat_level: "LOW",
            description: "✅ Non-hazardous - Hayabusa2 sample return target",
            absolute_magnitude: 19.2,
            orbital_period: 473.9
          }
        ])
      } finally {
        setFetchLoading(false)
      }
    }

    fetchAsteroids()
  }, [])

  const filteredAsteroids = asteroids.filter(asteroid => {
    const matchesFilter = filter === 'ALL' || asteroid.threat_level === filter
    const matchesSearch = searchTerm === '' || 
      asteroid.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asteroid.designation && asteroid.designation.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  if (fetchLoading) {
    return (
      <div className="enhanced-sidebar loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            🌍 Loading NASA asteroid data...
            <div className="loading-subtext">Fetching real-time data from NASA JPL</div>
          </div>
        </div>
      </div>
    )
  }

  if (error && asteroids.length === 0) {
    return (
      <div className="enhanced-sidebar error">
        <div className="error-content">
          <div className="error-icon">❌</div>
          <div className="error-message">{error}</div>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <span className="title-icon">🚀</span>
          NASA Asteroids
        </h2>
        <div className="asteroid-count">
          {filteredAsteroids.length} asteroid{filteredAsteroids.length !== 1 ? 's' : ''} loaded
        </div>
        {error && (
          <div className="warning-badge">⚠️ {error}</div>
        )}
      </div>

      <div className="controls-section">
        <div className="search-controls">
          <input
            type="text"
            placeholder="🔍 Search asteroids..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <label className="filter-label">Filter by threat level:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Asteroids ({asteroids.length})</option>
            <option value="HIGH">🔴 High Threat ({asteroids.filter(a => a.threat_level === 'HIGH').length})</option>
            <option value="MEDIUM">🟡 Medium Threat ({asteroids.filter(a => a.threat_level === 'MEDIUM').length})</option>
            <option value="LOW">🟢 Low Threat ({asteroids.filter(a => a.threat_level === 'LOW').length})</option>
          </select>
        </div>
      </div>

      <div className="asteroids-list">
        {filteredAsteroids.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div className="no-results-text">No asteroids match your search criteria</div>
            <button 
              className="clear-filters-button"
              onClick={() => {
                setSearchTerm('')
                setFilter('ALL')
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredAsteroids.map((asteroid, index) => (
            <AsteroidCard
              key={asteroid.name || asteroid.designation || index}
              asteroid={asteroid}
              isSelected={selectedAsteroid?.name === asteroid.name}
              onSelect={onAsteroidSelect}
            />
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="data-source">
          Data from <strong>NASA JPL Small-Body Database</strong>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAsteroidSidebar