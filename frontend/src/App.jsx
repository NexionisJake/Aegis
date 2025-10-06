import { useState } from 'react'
import EarthOnlyScene from './components/EarthOnlyScene'
import EnhancedAsteroidSidebar from './components/EnhancedAsteroidSidebar'
import AIAnalysis from './components/AIAnalysis'
import MapOverlay from './components/MapOverlay'
import ErrorBoundary from './components/ErrorBoundary'
import ThemeToggle from './components/ThemeToggle'
import { useTheme } from './contexts/ThemeContext'
import { enhancedApi, APIError } from './utils/apiClient'
import './App.css'

function App() {
  // Theme context
  const { currentTheme } = useTheme()
  
  // Main application state
  const [selectedAsteroid, setSelectedAsteroid] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState([20.5937, 78.9629]) // Default India
  const [impactData, setImpactData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shouldZoom, setShouldZoom] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const handleAsteroidSelect = (asteroid) => {
    console.log('Asteroid selected:', asteroid)
    setSelectedAsteroid(asteroid)
    setImpactData(null) // Clear previous impact data
    setError(null)
  }

  const handleLocationSelect = (coordinates) => {
    console.log('Location selected:', coordinates)
    setSelectedLocation(coordinates)
  }

  const handleSimulateImpact = async () => {
    if (!selectedAsteroid || !selectedLocation) {
      const message = !selectedAsteroid 
        ? 'Please select an asteroid from the list first'
        : 'Please click on Earth to select an impact location'
      
      setError(message)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Simulating impact for:', selectedAsteroid.name)
      
      // Use the API client to calculate impact with real NASA data
      const impactResult = await enhancedApi.calculateAsteroidImpact(selectedAsteroid.name)
      
      console.log('Impact calculation result:', impactResult)
      setImpactData(impactResult)
      
      // Trigger zoom animation to impact location
      setShouldZoom(true)
    } catch (error) {
      console.error('Impact simulation failed:', error)
      
      if (error instanceof APIError) {
        if (error.status === 503) {
          setError('Impact calculation unavailable: Scientific libraries not loaded. Server running in degraded mode.')
        } else {
          setError(`Impact simulation failed: ${error.message}`)
        }
      } else {
        setError(`Impact simulation failed: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleZoomComplete = (isComplete) => {
    if (isComplete) {
      // Show map overlay after zoom animation completes
      setShowMap(true)
      setShouldZoom(false) // Reset zoom trigger
    }
  }

  const handleResetView = () => {
    setShowMap(false)
    setShouldZoom(false)
    setImpactData(null)
    setSelectedLocation([20.5937, 78.9629])
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className={`app ${currentTheme}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="app-title">
              🛡️ <span className="title-main">Aegis</span>
              <span className="title-subtitle">Asteroid Impact Simulator</span>
            </h1>
            <p className="app-description">
              Select a real NASA asteroid and click on Earth to simulate impact with AI-powered analysis
            </p>
          </div>
          
          <div className="header-controls">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-dismiss" onClick={clearError}>✕</button>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Asteroid Selection Sidebar */}
        <div className="sidebar-container">
          <ErrorBoundary
            errorMessage="Error loading asteroid data"
            fallback={() => (
              <div className="component-error">
                <h3>🚀 Asteroid List Error</h3>
                <p>Unable to load NASA asteroid data.</p>
                <button onClick={() => window.location.reload()}>
                  Reload Page
                </button>
              </div>
            )}
          >
            <EnhancedAsteroidSidebar
              selectedAsteroid={selectedAsteroid}
              onAsteroidSelect={handleAsteroidSelect}
              loading={loading}
            />
          </ErrorBoundary>
        </div>

        {/* Earth 3D View */}
        <div className="earth-view-container">
          <ErrorBoundary
            errorMessage="Error loading 3D Earth view"
            fallback={() => (
              <div className="component-error">
                <h3>🌍 3D Earth Error</h3>
                <p>Unable to load the 3D Earth visualization.</p>
                <button onClick={() => window.location.reload()}>
                  Reload Page
                </button>
              </div>
            )}
          >
            <EarthOnlyScene 
              onLocationSelect={handleLocationSelect}
              zoomToLocation={shouldZoom}
              onZoomComplete={handleZoomComplete}
            />
          </ErrorBoundary>
          
          {/* Map Overlay - shown after zoom animation completes */}
          <MapOverlay
            location={selectedLocation}
            impactData={impactData}
            isVisible={showMap}
          />
          
          {/* Reset View Button - shown when map is visible */}
          {showMap && (
            <button className="reset-view-btn" onClick={handleResetView}>
              🌍 Reset View
            </button>
          )}
          
          {/* Selection Info Overlay */}
          {selectedAsteroid && (
            <div className="selection-info">
              <div className="selected-asteroid">
                <h3>Selected Asteroid</h3>
                <div className="asteroid-name">{selectedAsteroid.name}</div>
                <div className="asteroid-details">
                  <div className="detail-item">
                    <span className="label">Diameter:</span>
                    <span className="value">
                      {selectedAsteroid.diameter_km 
                        ? `${selectedAsteroid.diameter_km.toFixed(3)} km` 
                        : 'Unknown'
                      }
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Threat Level:</span>
                    <span className={`value threat-${selectedAsteroid.threat_level?.toLowerCase()}`}>
                      {selectedAsteroid.threat_level || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={handleSimulateImpact}
                  disabled={loading || !selectedLocation}
                  className="simulate-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Calculating...
                    </>
                  ) : (
                    <>💥 Simulate Impact</>
                  )}
                </button>
              </div>

              {selectedLocation && (
                <div className="selected-location">
                  <div className="location-label">Impact Location:</div>
                  <div className="location-coords">
                    {Math.abs(selectedLocation[0]).toFixed(2)}°{selectedLocation[0] >= 0 ? 'N' : 'S'}, {' '}
                    {Math.abs(selectedLocation[1]).toFixed(2)}°{selectedLocation[1] >= 0 ? 'E' : 'W'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Panel */}
        {impactData && (
          <div className="results-container">
            <div className="impact-results">
              <h3 className="results-title">
                <span className="results-icon">💥</span>
                Impact Results
              </h3>
              
              <div className="results-grid">
                <div className="result-card">
                  <div className="result-label">Crater Diameter</div>
                  <div className="result-value">
                    {impactData.craterDiameterMeters 
                      ? `${(impactData.craterDiameterMeters / 1000).toFixed(2)} km`
                      : 'Unknown'
                    }
                  </div>
                  <div className="result-subtext">
                    {impactData.craterDiameterMeters?.toLocaleString()} meters
                  </div>
                </div>

                <div className="result-card">
                  <div className="result-label">Impact Energy</div>
                  <div className="result-value">
                    {impactData.impactEnergyMegatons 
                      ? `${impactData.impactEnergyMegatons.toLocaleString()} Mt`
                      : 'Unknown'
                    }
                  </div>
                  <div className="result-subtext">TNT equivalent</div>
                </div>

                <div className="result-card">
                  <div className="result-label">Asteroid Mass</div>
                  <div className="result-value">
                    {impactData.massKg 
                      ? `${(impactData.massKg / 1e9).toFixed(2)} Gt`
                      : 'Unknown'
                    }
                  </div>
                  <div className="result-subtext">Billion metric tons</div>
                </div>

                <div className="result-card">
                  <div className="result-label">Impact Velocity</div>
                  <div className="result-value">
                    {impactData.velocityKps 
                      ? `${impactData.velocityKps.toFixed(1)} km/s`
                      : 'Unknown'
                    }
                  </div>
                  <div className="result-subtext">
                    {impactData.velocityKps 
                      ? `${(impactData.velocityKps * 3600).toLocaleString()} km/h`
                      : ''
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <ErrorBoundary
              errorMessage="Error loading AI analysis"
              fallback={() => (
                <div className="component-error">
                  <h3>🤖 AI Analysis Error</h3>
                  <p>Unable to generate AI impact analysis.</p>
                </div>
              )}
            >
              <AIAnalysis
                asteroidData={selectedAsteroid}
                impactResults={impactData}
                location={selectedLocation}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="data-sources">
            <span>Data sources: </span>
            <a href="https://ssd-api.jpl.nasa.gov/" target="_blank" rel="noopener noreferrer">
              NASA JPL Small-Body Database
            </a>
            {' • '}
            <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">
              Google Gemini AI
            </a>
          </div>
          <div className="disclaimer">
            Educational simulation only. Actual impact effects may vary significantly.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App