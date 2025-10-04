import { useState, useEffect, useCallback } from 'react'
import Scene3D from './components/Scene3D'
import ImpactMap from './components/ImpactMap'
import ErrorBoundary, { ThreeDErrorBoundary } from './components/ErrorBoundary'
import ThemeToggle from './components/ThemeToggle'
import { useTheme } from './contexts/ThemeContext'
import { enhancedApi, APIError, NetworkError, TimeoutError } from './utils/apiClient'
import './App.css'

function App() {
  // Theme context
  const { currentTheme, switchTheme, currentThemeData } = useTheme()
  
  // State management for trajectory data and view modes
  const [view, setView] = useState('3D')
  const [trajectory, setTrajectory] = useState(null)
  const [impactData, setImpactData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Dynamic asteroid data state management
  const [asteroidData, setAsteroidData] = useState(null)
  const [asteroidDataError, setAsteroidDataError] = useState(null)
  
  // Impact location state management with default India coordinates
  const [impactCoords, setImpactCoords] = useState([20.5937, 78.9629])

  // Enhanced error handling with user-friendly messages
  const getErrorMessage = useCallback((error) => {
    if (error instanceof NetworkError) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        type: 'network'
      }
    }
    
    if (error instanceof TimeoutError) {
      return {
        title: 'Request Timeout',
        message: 'The request is taking longer than expected. Please try again.',
        type: 'timeout'
      }
    }
    
    if (error instanceof APIError) {
      switch (error.status) {
        case 404:
          return {
            title: 'Asteroid Not Found',
            message: 'The requested asteroid could not be found in the NASA database.',
            type: 'not_found'
          }
        case 429:
          return {
            title: 'Too Many Requests',
            message: 'The NASA API is currently rate-limited. Please wait a moment and try again.',
            type: 'rate_limit'
          }
        case 503:
          return {
            title: 'Service Unavailable',
            message: 'The NASA API is temporarily unavailable. Please try again later.',
            type: 'service_unavailable'
          }
        default:
          return {
            title: 'API Error',
            message: error.message || 'An error occurred while communicating with the server.',
            type: 'api_error'
          }
      }
    }
    
    // Handle asteroid data extraction errors with user-friendly messages
    if (error.message && error.message.includes('parameters not available')) {
      return {
        title: 'Asteroid Data Unavailable',
        message: 'The selected asteroid does not have the required physical parameters for impact simulation.',
        type: 'missing_data'
      }
    }
    
    if (error.message && error.message.includes('NASA JPL API does not provide')) {
      return {
        title: 'Limited Asteroid Data',
        message: 'The NASA JPL API does not provide complete physical parameters for this asteroid. Impact simulation is only available for asteroids with known parameters like Apophis.',
        type: 'api_limitation'
      }
    }
    
    if (error.message && (error.message.includes('Diameter data not available') || error.message.includes('Velocity data not available'))) {
      return {
        title: 'Missing Asteroid Parameters',
        message: 'The required physical parameters (diameter or velocity) are not available for this asteroid in the NASA database.',
        type: 'incomplete_data'
      }
    }
    
    if (error.message && error.message.includes('Invalid asteroid data structure')) {
      return {
        title: 'Invalid Asteroid Data',
        message: 'The asteroid data received from NASA API has an unexpected structure and cannot be processed.',
        type: 'invalid_data'
      }
    }
    
    if (error.message && error.message.includes('Invalid') && error.message.includes('asteroid data')) {
      return {
        title: 'Invalid Asteroid Data',
        message: 'The asteroid data contains invalid values that cannot be used for simulation.',
        type: 'invalid_data'
      }
    }
    
    return {
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      type: 'unknown'
    }
  }, [])

  // Helper functions for extracting asteroid parameters from NASA API response
  const extractDiameter = useCallback((asteroidData) => {
    // Check if we have the expected asteroid data structure with physical parameters
    if (!asteroidData?.phys_par) {
      throw new Error('Physical parameters not available for this asteroid')
    }
    
    // Find diameter parameter in the physical parameters array
    const diameterParam = asteroidData.phys_par.find(param => 
      param.name && param.name.toLowerCase().includes('diameter')
    )
    
    if (!diameterParam?.value) {
      throw new Error('Diameter data not found in asteroid parameters')
    }
    
    // Parse and validate diameter value
    const diameter = parseFloat(diameterParam.value)
    if (isNaN(diameter) || diameter <= 0) {
      throw new Error('Invalid diameter value in asteroid data')
    }
    
    console.log(`Extracted diameter: ${diameter} km`)
    return diameter
  }, [])

  const extractVelocity = useCallback((asteroidData) => {
    // Check if we have the expected asteroid data structure with orbital data
    if (!asteroidData?.orbit?.close_approach_data) {
      throw new Error('Close approach data not available for this asteroid')
    }
    
    // Get the first (most recent/relevant) close approach data
    const approachData = asteroidData.orbit.close_approach_data[0]
    if (!approachData?.v_rel) {
      throw new Error('Velocity data not found in close approach data')
    }
    
    // Parse and validate velocity value
    const velocity = parseFloat(approachData.v_rel)
    if (isNaN(velocity) || velocity <= 0) {
      throw new Error('Invalid velocity value in asteroid data')
    }
    
    console.log(`Extracted velocity: ${velocity} km/s`)
    return velocity
  }, [])

  // Enhanced data fetching workflow - fetch complete asteroid data before trajectory data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setError(null)
      setAsteroidDataError(null)
      setIsRetrying(false)
      
      try {
        // Step 1: Fetch complete asteroid data first to ensure we have the full dataset
        console.log('Fetching complete asteroid data for Apophis...')
        const asteroidDataResponse = await enhancedApi.getAsteroid('Apophis')
        
        // Validate that we received asteroid data
        if (!asteroidDataResponse) {
          throw new Error('Invalid asteroid data received from NASA API')
        }
        
        // Store the full asteroid dataset in state
        setAsteroidData(asteroidDataResponse)
        console.log('Asteroid data successfully stored')
        
        // Step 2: Then fetch trajectory data using the same asteroid
        console.log('Fetching trajectory data for Apophis...')
        const trajectoryData = await enhancedApi.getTrajectory('Apophis')
        setTrajectory(trajectoryData)
        
        setRetryCount(0) // Reset retry count on success
        console.log('Initial data fetching completed successfully')
        
      } catch (err) {
        console.error('Error in enhanced data fetching workflow:', err)
        const errorInfo = getErrorMessage(err)
        
        // Determine if this is an asteroid data specific error
        if (err.message && err.message.includes('asteroid data')) {
          setAsteroidDataError(errorInfo)
        } else {
          setError(errorInfo)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [getErrorMessage])

  // Handle impact simulation with enhanced error handling and dynamic parameter extraction
  const handleSimulateImpact = async () => {
    setLoading(true)
    setError(null)
    setAsteroidDataError(null)

    // Switch to Impact (Crisis) mode when simulating impact
    if (currentTheme !== 'impact') {
      switchTheme('impact')
    }

    try {
      // Check if asteroid data is available
      if (!asteroidData) {
        throw new Error('Asteroid data not available for impact simulation')
      }

      // Extract real parameters from asteroid data with validation and fallback handling
      let diameter, velocity
      
      try {
        diameter = extractDiameter(asteroidData)
      } catch (diameterError) {
        console.warn('Failed to extract diameter:', diameterError.message)
        // Fallback to known Apophis diameter if extraction fails
        diameter = 0.34
        console.log('Using fallback diameter for Apophis: 0.34 km')
      }
      
      try {
        velocity = extractVelocity(asteroidData)
      } catch (velocityError) {
        console.warn('Failed to extract velocity:', velocityError.message)
        // Fallback to known Apophis velocity if extraction fails
        velocity = 7.42
        console.log('Using fallback velocity for Apophis: 7.42 km/s')
      }

      // Validate extracted parameters
      if (!diameter || diameter <= 0) {
        throw new Error('Invalid diameter parameter extracted from asteroid data')
      }
      
      if (!velocity || velocity <= 0) {
        throw new Error('Invalid velocity parameter extracted from asteroid data')
      }

      console.log(`Using impact parameters: diameter=${diameter}km, velocity=${velocity}km/s`)

      const impactParams = {
        diameter_km: diameter,
        velocity_kps: velocity
      }

      const data = await enhancedApi.calculateImpact(impactParams)
      setImpactData(data)
      setView('2D')
    } catch (err) {
      console.error('Error calculating impact:', err)
      const errorInfo = getErrorMessage(err)
      
      // Set asteroid-specific error if it's related to asteroid data
      if (err.message && (err.message.includes('parameters') || err.message.includes('data'))) {
        setAsteroidDataError(errorInfo)
      } else {
        setError(errorInfo)
      }
    } finally {
      setLoading(false)
    }
  }

  // Enhanced retry functionality with improved data fetching workflow
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      return // Max retries reached
    }

    setRetryCount(prev => prev + 1)
    setIsRetrying(true)
    setError(null)
    setAsteroidDataError(null)
    setLoading(true)

    try {
      // Step 1: Retry fetching complete asteroid data first
      console.log(`Retry attempt ${retryCount + 1}: Fetching asteroid data...`)
      const asteroidDataResponse = await enhancedApi.getAsteroid('Apophis')
      
      // Validate asteroid data before storing
      if (!asteroidDataResponse) {
        throw new Error('Invalid asteroid data received during retry')
      }
      
      setAsteroidData(asteroidDataResponse)
      console.log('Asteroid data retry successful')
      
      // Step 2: Then retry trajectory data
      console.log('Retrying trajectory data fetch...')
      const trajectoryData = await enhancedApi.getTrajectory('Apophis')
      setTrajectory(trajectoryData)
      
      setRetryCount(0) // Reset on success
      console.log('Retry completed successfully')
      
    } catch (err) {
      console.error(`Retry attempt ${retryCount + 1} failed:`, err)
      const errorInfo = getErrorMessage(err)
      
      // Determine if this is an asteroid data specific error
      if (err.message && err.message.includes('asteroid data')) {
        setAsteroidDataError(errorInfo)
      } else {
        setError(errorInfo)
      }
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [retryCount, getErrorMessage])

  // Handle impact location selection callback
  const handleImpactSelect = useCallback((coordinates) => {
    setImpactCoords(coordinates)
    console.log('Impact location updated:', coordinates)
  }, [])

  // Handle view switching
  const handleViewChange = (newView) => {
    setView(newView)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Project Aegis - Asteroid Impact Simulator</h1>
        <div className="header-controls">
          <ThemeToggle className="theme-control" />
          <div className="view-controls">
            <button 
              className={view === '3D' ? 'active' : ''}
              onClick={() => handleViewChange('3D')}
              disabled={loading}
            >
              3D Orbital View
            </button>
            <button 
              className={view === '2D' ? 'active' : ''}
              onClick={() => handleViewChange('2D')}
              disabled={loading || !impactData}
            >
              Impact Map
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <div className="error-content">
              <h3>{error.title}</h3>
              <p>{error.message}</p>
              
              {error.type === 'network' && (
                <div className="error-suggestions">
                  <h4>Try these solutions:</h4>
                  <ul>
                    <li>Check your internet connection</li>
                    <li>Disable any VPN or proxy</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              )}
              
              {error.type === 'rate_limit' && (
                <div className="error-suggestions">
                  <p>Please wait a few moments before trying again.</p>
                </div>
              )}
              
              <div className="error-actions">
                <button 
                  onClick={handleRetry}
                  disabled={loading || isRetrying || retryCount >= 3}
                  className="retry-button"
                >
                  {isRetrying ? 'Retrying...' : 
                   retryCount >= 3 ? 'Max Retries Reached' : 
                   `Retry ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="reload-button"
                >
                  Reload Page
                </button>
              </div>
              
              {retryCount >= 3 && (
                <p className="error-help">
                  If the problem persists, please try again later or contact support.
                </p>
              )}
            </div>
          </div>
        )}

        {asteroidDataError && (
          <div className="error-message asteroid-data-error">
            <div className="error-content">
              <h3>{asteroidDataError.title}</h3>
              <p>{asteroidDataError.message}</p>
              
              {asteroidDataError.type === 'missing_data' && (
                <div className="error-suggestions">
                  <p>This asteroid may not have complete physical parameter data in the NASA database.</p>
                </div>
              )}
              
              {asteroidDataError.type === 'api_limitation' && (
                <div className="error-suggestions">
                  <h4>Available Options:</h4>
                  <ul>
                    <li>Use Apophis (99942) which has known parameters</li>
                    <li>Check NASA's Close Approach Database for additional data</li>
                    <li>Try a different asteroid with documented physical properties</li>
                  </ul>
                </div>
              )}
              
              {asteroidDataError.type === 'incomplete_data' && (
                <div className="error-suggestions">
                  <p>The NASA JPL API response is missing required fields. Try refreshing or selecting a different asteroid.</p>
                </div>
              )}
              
              {asteroidDataError.type === 'invalid_data' && (
                <div className="error-suggestions">
                  <p>The asteroid data structure is unexpected. This may be a temporary API issue - try again later.</p>
                </div>
              )}
              
              <div className="error-actions">
                <button 
                  onClick={() => setAsteroidDataError(null)}
                  className="dismiss-button"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {view === '3D' && (
              <div className="view-container">
                <ErrorBoundary
                  errorMessage="There was an error loading the 3D visualization."
                  fallback={({ error, onRetry, onReload }) => (
                    <ThreeDErrorBoundary>
                      <div className="component-error">
                        <h3>3D Visualization Error</h3>
                        <p>Unable to load the 3D orbital view.</p>
                        <div className="error-actions">
                          <button onClick={onRetry}>Try Again</button>
                          <button onClick={onReload}>Reload Page</button>
                        </div>
                      </div>
                    </ThreeDErrorBoundary>
                  )}
                >
                  <Scene3D 
                    trajectory={trajectory}
                    onSimulateImpact={handleSimulateImpact}
                    onImpactSelect={handleImpactSelect}
                  />
                </ErrorBoundary>
              </div>
            )}

            {view === '2D' && impactData && (
              <div className="view-container">
                <ErrorBoundary
                  errorMessage="There was an error loading the impact map."
                  fallback={({ error, onRetry, onReload }) => (
                    <div className="component-error">
                      <h3>Map Visualization Error</h3>
                      <p>Unable to load the impact map view.</p>
                      <div className="error-actions">
                        <button onClick={onRetry}>Try Again</button>
                        <button onClick={onReload}>Reload Page</button>
                      </div>
                    </div>
                  )}
                >
                  <ImpactMap 
                    impactData={impactData}
                    impactCoordinates={impactCoords}
                    onBackTo3D={() => handleViewChange('3D')}
                  />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
