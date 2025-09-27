import { useState, useEffect, useCallback } from 'react'
import Scene3D from './components/Scene3D'
import ImpactMap from './components/ImpactMap'
import ErrorBoundary, { ThreeDErrorBoundary } from './components/ErrorBoundary'
import { enhancedApi, APIError, NetworkError, TimeoutError } from './utils/apiClient'
import './App.css'

function App() {
  // State management for trajectory data and view modes
  const [view, setView] = useState('3D')
  const [trajectory, setTrajectory] = useState(null)
  const [impactData, setImpactData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

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
    
    return {
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      type: 'unknown'
    }
  }, [])

  // Automatic data fetching on component mount with enhanced error handling
  useEffect(() => {
    const fetchTrajectoryData = async () => {
      setLoading(true)
      setError(null)
      setIsRetrying(false)
      
      try {
        // Fetch trajectory data for Apophis asteroid with retry logic
        const data = await enhancedApi.getTrajectory('Apophis')
        setTrajectory(data)
        setRetryCount(0) // Reset retry count on success
      } catch (err) {
        console.error('Error fetching trajectory data:', err)
        const errorInfo = getErrorMessage(err)
        setError(errorInfo)
      } finally {
        setLoading(false)
      }
    }

    fetchTrajectoryData()
  }, [getErrorMessage])

  // Handle impact simulation with enhanced error handling
  const handleSimulateImpact = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use Apophis parameters for impact simulation
      const impactParams = {
        diameter_km: 0.34, // Apophis diameter in km
        velocity_kps: 7.42  // Apophis velocity in km/s
      }

      const data = await enhancedApi.calculateImpact(impactParams)
      setImpactData(data)
      setView('2D')
    } catch (err) {
      console.error('Error calculating impact:', err)
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
    } finally {
      setLoading(false)
    }
  }

  // Handle retry functionality
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      return // Max retries reached
    }

    setRetryCount(prev => prev + 1)
    setIsRetrying(true)
    setError(null)
    setLoading(true)

    try {
      // Retry the trajectory fetch
      const data = await enhancedApi.getTrajectory('Apophis')
      setTrajectory(data)
      setRetryCount(0) // Reset on success
    } catch (err) {
      console.error('Retry failed:', err)
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [retryCount, getErrorMessage])

  // Handle view switching
  const handleViewChange = (newView) => {
    setView(newView)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Project Aegis - Asteroid Impact Simulator</h1>
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
