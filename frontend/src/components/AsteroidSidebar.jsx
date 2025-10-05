import { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import './AsteroidSidebar.css'

const AsteroidSidebar = ({ 
  asteroidList = [], 
  selectedAsteroid, 
  onAsteroidSelect, 
  loading = false, 
  error = null 
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
    <div className={`asteroid-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header with toggle button */}
      <div className="sidebar-header">
        <h3>Asteroid Explorer</h3>
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
                      {asteroid.description && (
                        <div className="asteroid-description">
                          {asteroid.description}
                        </div>
                      )}
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

          {/* Footer Info */}
          {!loading && !error && asteroidList.length > 0 && (
            <div className="sidebar-footer">
              <div className="asteroid-count">
                {asteroidList.length} asteroids available
              </div>
              {selectedAsteroid && (
                <div className="current-selection">
                  Current: <strong>{selectedAsteroid}</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
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
  error: PropTypes.string
}

export default AsteroidSidebar