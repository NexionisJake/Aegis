import { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import GlossaryPopover from './GlossaryPopover'
import './AsteroidSidebar.css'

const AsteroidSidebar = ({ 
  asteroidList = [], 
  selectedAsteroid, 
  onAsteroidSelect, 
  loading = false, 
  error = null,
  trajectoryData = null 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter asteroids based on search term
  const filteredAsteroids = useMemo(() => {
    if (!searchTerm.trim()) {
      return asteroidList
    }
    
    const searchLower = searchTerm.toLowerCase()
    return asteroidList.filter(asteroid => 
      asteroid.name.toLowerCase().includes(searchLower) ||
      asteroid.designation.toLowerCase().includes(searchLower) ||
      (asteroid.description && asteroid.description.toLowerCase().includes(searchLower))
    )
  }, [asteroidList, searchTerm])

  // Handle asteroid selection
  const handleAsteroidClick = (asteroidName) => {
    if (onAsteroidSelect && asteroidName !== selectedAsteroid) {
      onAsteroidSelect(asteroidName)
    }
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  // Clear search
  const clearSearch = () => {
    setSearchTerm('')
  }

  // Toggle sidebar expansion
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <aside className={`asteroid-sidebar hud-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header with toggle button */}
      <div className="sidebar-header">
        <h3>Threat Assessment Terminal</h3>
        <button 
          className="toggle-button"
          onClick={toggleExpansion}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? '◀' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search asteroids..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
                disabled={loading}
              />
              {searchTerm && (
                <button
                  className="clear-search-button"
                  onClick={clearSearch}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            
            {searchTerm && (
              <div className="search-results-info">
                {filteredAsteroids.length} of {asteroidList.length} asteroids
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="sidebar-loading">
              <div className="loading-spinner"></div>
              <p>Loading asteroids...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="sidebar-error">
              <h4>Failed to load asteroids</h4>
              <p>{error}</p>
            </div>
          )}

          {/* Asteroid List */}
          {!loading && !error && (
            <div className="asteroids-list">
              {filteredAsteroids.length === 0 ? (
                <div className="no-results">
                  {searchTerm ? 'No asteroids match your search' : 'No asteroids available'}
                </div>
              ) : (
                filteredAsteroids.map((asteroid) => (
                  <div
                    key={asteroid.name}
                    className={`asteroid-item ${
                      selectedAsteroid === asteroid.name ? 'selected' : ''
                    }`}
                    onClick={() => handleAsteroidClick(asteroid.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleAsteroidClick(asteroid.name)
                      }
                    }}
                  >
                    <div className="asteroid-info">
                      <div className="asteroid-name">{asteroid.name}</div>
                      <div className="asteroid-designation">
                        {asteroid.designation}
                      </div>
                    </div>
                    
                    {selectedAsteroid === asteroid.name && (
                      <div className="selected-indicator">
                        ✓
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Threat Assessment Data - Only shown when asteroid is selected */}
          {selectedAsteroid && trajectoryData && (
            <div className="threat-assessment-data">
              <h4 className="section-title">Threat Assessment</h4>
              
              <div className="data-row">
                <span className="data-label">Target ID</span>
                <span className="data-value">{selectedAsteroid}</span>
              </div>
              
              {trajectoryData.diameter && (
                <div className="data-row">
                  <span className="data-label">
                    Diameter
                    <GlossaryPopover term="diameter" />
                  </span>
                  <span className="data-value">{trajectoryData.diameter.toFixed(3)} km</span>
                </div>
              )}
              
              {trajectoryData.relative_velocity && (
                <div className="data-row">
                  <span className="data-label">Relative Velocity</span>
                  <span className="data-value">{trajectoryData.relative_velocity.toFixed(2)} km/s</span>
                </div>
              )}
              
              {trajectoryData.is_potentially_hazardous !== undefined && (
                <div className="data-row">
                  <span className="data-label">Potentially Hazardous</span>
                  <span className={`data-value ${trajectoryData.is_potentially_hazardous ? 'danger' : 'safe'}`}>
                    {trajectoryData.is_potentially_hazardous ? 'YES' : 'NO'}
                  </span>
                </div>
              )}
              
              {trajectoryData.orbital_elements && (
                <>
                  <h4 className="section-title">Orbital Parameters</h4>
                  
                  <div className="data-row">
                    <span className="data-label">Epoch</span>
                    <span className="data-value">{trajectoryData.orbital_elements.epoch || 'N/A'}</span>
                  </div>
                  
                  <div className="data-row">
                    <span className="data-label">
                      Eccentricity
                      <GlossaryPopover term="eccentricity" />
                    </span>
                    <span className="data-value">{trajectoryData.orbital_elements.e?.toFixed(6) || 'N/A'}</span>
                  </div>
                  
                  <div className="data-row">
                    <span className="data-label">Inclination</span>
                    <span className="data-value">{trajectoryData.orbital_elements.i?.toFixed(3) || 'N/A'}°</span>
                  </div>
                  
                  <div className="data-row">
                    <span className="data-label">
                      Semi-Major Axis
                      <GlossaryPopover term="semi-major axis" />
                    </span>
                    <span className="data-value">{trajectoryData.orbital_elements.a?.toFixed(6) || 'N/A'} AU</span>
                  </div>
                  
                  <div className="data-row">
                    <span className="data-label">Arg. of Periapsis</span>
                    <span className="data-value">{trajectoryData.orbital_elements.w?.toFixed(3) || 'N/A'}°</span>
                  </div>
                </>
              )}
              
              {(trajectoryData.first_obs || trajectoryData.last_obs || trajectoryData.n_obs_used !== undefined) && (
                <>
                  <h4 className="section-title">Observation Data</h4>
                  
                  {trajectoryData.first_obs && (
                    <div className="data-row">
                      <span className="data-label">First Observation</span>
                      <span className="data-value">{trajectoryData.first_obs}</span>
                    </div>
                  )}
                  
                  {trajectoryData.last_obs && (
                    <div className="data-row">
                      <span className="data-label">Last Observation</span>
                      <span className="data-value">{trajectoryData.last_obs}</span>
                    </div>
                  )}
                  
                  {trajectoryData.n_obs_used !== undefined && (
                    <div className="data-row">
                      <span className="data-label">Observations Used</span>
                      <span className="data-value">{trajectoryData.n_obs_used}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer Info */}
          {!loading && !error && asteroidList.length > 0 && (
            <div className="sidebar-footer">
              <div className="asteroid-count">
                {asteroidList.length} targets in database
              </div>
              {selectedAsteroid && (
                <div className="current-selection">
                  Active: <strong>{selectedAsteroid}</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  )
}

AsteroidSidebar.propTypes = {
  asteroidList: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      designation: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ),
  selectedAsteroid: PropTypes.string,
  onAsteroidSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  trajectoryData: PropTypes.object
}

export default AsteroidSidebar