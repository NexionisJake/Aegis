import { useState, useEffect, useCallback } from 'react'
import Scene3D from './components/Scene3D'
import ImpactMap from './components/ImpactMap'
import ErrorBoundary, { ThreeDErrorBoundary } from './components/ErrorBoundary'
import ThemeToggle from './components/ThemeToggle'
import { useTheme } from './contexts/ThemeContext'
import { enhancedApi, APIError, NetworkError, TimeoutError } from './utils/apiClient'
import './App.css'
import DefenderHUD from './components/DefenderHUD'
import DefenderTechCards from './components/DefenderTechCards'
import DefenderSuccessMeter from './components/DefenderSuccessMeter'
import DefenderLeaderboard from './components/DefenderLeaderboard'
import AsteroidSidebar from './components/AsteroidSidebar'

function App() {
  // Theme context
  const { currentTheme, switchTheme } = useTheme()
  
  // State management for trajectory data and view modes
  const [view, setView] = useState('3D')
  const [impactData, setImpactData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Multi-asteroid state management
  const [selectedAsteroid, setSelectedAsteroid] = useState('Apophis')
  const [asteroidList, setAsteroidList] = useState([])
  const [top10Trajectories, setTop10Trajectories] = useState({})
  const [currentTrajectory, setCurrentTrajectory] = useState(null)
  
  // Caching for trajectories to avoid re-fetching
  const [trajectoryCache, setTrajectoryCache] = useState({})
  
  // Asteroid-specific error handling
  const [asteroidDataError, setAsteroidDataError] = useState(null)
  const [sidebarLoading, setSidebarLoading] = useState(false)
  
  // Impact location state management with default India coordinates
  const [impactCoords, setImpactCoords] = useState([20.5937, 78.9629])

  // Asteroid-specific impact locations based on orbital characteristics and threat scenarios
  const getAsteroidImpactLocation = useCallback((asteroidName) => {
    const locations = {
      'Apophis': [36.2048, 138.2529],   // Japan - Pacific Ring of Fire (high seismic activity scenario)
      'Bennu': [40.7128, -74.0060],     // New York City - major population center scenario  
      'Didymos': [51.5074, -0.1278],    // London - European impact scenario
      'Toutatis': [-33.8688, 151.2093], // Sydney - Southern Hemisphere scenario
      'Eros': [55.7558, 37.6173],       // Moscow - Continental impact scenario
      'Ryugu': [35.6762, 139.6503],     // Tokyo - Japanese mission target
      'Itokawa': [1.3521, 103.8198],    // Singapore - Asian impact scenario
      'Phaethon': [34.0522, -118.2437], // Los Angeles - West Coast USA scenario
      'Vesta': [48.8566, 2.3522],       // Paris - Western Europe scenario
      'Psyche': [19.4326, -99.1332],    // Mexico City - North American scenario
      '99942': [36.2048, 138.2529],     // Apophis designation
      '101955': [40.7128, -74.0060],    // Bennu designation
      '65803': [51.5074, -0.1278],      // Didymos designation
      '4179': [-33.8688, 151.2093],     // Toutatis designation  
      '433': [55.7558, 37.6173],        // Eros designation
      '162173': [35.6762, 139.6503],    // Ryugu designation
      '25143': [1.3521, 103.8198],      // Itokawa designation
      '3200': [34.0522, -118.2437],     // Phaethon designation
      '4': [48.8566, 2.3522],           // Vesta designation
      '16': [19.4326, -99.1332]         // Psyche designation
    }
    
    return locations[asteroidName] || [20.5937, 78.9629] // Default to India if not found
  }, [])

  // Defender Mode state
  const [defenderMode, setDefenderMode] = useState(false)
  const [fuel] = useState(100)
  const [timeToImpact] = useState('2d 4h')
  const [successProb] = useState(70)
  const [selectedTech, setSelectedTech] = useState('Kinetic Impactor')
  const [showSuccess, setShowSuccess] = useState(false)
  const [missionScore, setMissionScore] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // Defender Mode theme switch
  useEffect(() => {
    if (defenderMode) {
      document.body.style.setProperty('--primary-color', '#00e6ff')
      document.body.style.setProperty('--secondary-color', '#e6e6e6')
      document.body.style.setProperty('--hud-bg', '#0a1a22')
    } else {
      document.body.style.removeProperty('--primary-color')
      document.body.style.removeProperty('--secondary-color')
      document.body.style.removeProperty('--hud-bg')
    }
  }, [defenderMode])

  // Simulate mission result

  // Enhanced error handling with user-friendly messages
  const getErrorMessage = useCallback((error) => {
    if (error instanceof NetworkError) {
      return {
        title: 'API Error',
        message: error.message || 'An error occurred while communicating with the server.',
        type: 'api_error'
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



  // Asteroid selection handler
  const handleAsteroidSelect = useCallback(async (asteroidName) => {
    if (!asteroidName) return;

    setLoading(true)
    setError(null)
    setAsteroidDataError(null)
    
    try {
      console.log(`Selecting asteroid: ${asteroidName}`)
      if (selectedAsteroid !== asteroidName) {
        setSelectedAsteroid(asteroidName);
      }

      // Check trajectory cache first
      let trajectoryData = trajectoryCache[asteroidName]

      // Fetch trajectory data if not cached
      if (!trajectoryData) {
        console.log(`Fetching trajectory data for ${asteroidName}...`)
        trajectoryData = await enhancedApi.getTrajectory(asteroidName)
        setTrajectoryCache(prev => ({ ...prev, [asteroidName]: trajectoryData }))
      }

      // Update current trajectory state and impact location
      setCurrentTrajectory(trajectoryData)
      
      // Set asteroid-specific impact coordinates for future impact simulations
      const asteroidLocation = getAsteroidImpactLocation(asteroidName)
      setImpactCoords(asteroidLocation)
      
      console.log(`Successfully loaded trajectory data for ${asteroidName}`, {
        location: asteroidLocation
      })
      
    } catch (err) {
      console.error(`Error loading asteroid ${asteroidName}:`, err)
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
    } finally {
      setLoading(false)
    }
  }, [trajectoryCache, getErrorMessage, selectedAsteroid, getAsteroidImpactLocation])

  // Initial data fetching for static lists (asteroid list, top 10)
  useEffect(() => {
    const fetchInitialData = async () => {
      setSidebarLoading(true)
      setError(null)
      
      // Clear any existing asteroid list first
      setAsteroidList([])
      
      try {
        console.log('===== STARTING API FETCH =====')
        console.log('Fetching initial list data...')
        const top10Response = await enhancedApi.getTop10Nearest();
        
        console.log('===== API RESPONSE RECEIVED =====')
        console.log('API Response received:', top10Response);
        console.log('Response type:', typeof top10Response);
        console.log('Response keys:', Object.keys(top10Response));
        console.log('Number of asteroids:', Object.keys(top10Response).length);
        
        // Extract asteroid names from top10 response to create asteroid list
        const asteroidNames = Object.keys(top10Response);
        
        if (asteroidNames.length === 0) {
          console.error('WARNING: API returned empty object!');
          throw new Error('API returned no asteroids');
        }
        
        const asteroidListFromTop10 = asteroidNames.map(name => ({
          name: name,
          designation: name, // Use name as designation since we have real NASA data
          description: `Real NASA asteroid data from JPL database`
        }));
        
        console.log('===== CREATED ASTEROID LIST =====');
        console.log('Created asteroid list:', asteroidListFromTop10);
        console.log('About to call setAsteroidList...');
        
        setAsteroidList(asteroidListFromTop10)
        setTop10Trajectories(top10Response)
        
        console.log('===== SUCCESS =====');
        console.log(`Initial list data loaded successfully with ${asteroidNames.length} real NASA asteroids: ${asteroidNames.join(', ')}`);
      } catch (err) {
        console.error('Error fetching initial list data:', err)
        console.error('Error type:', err.name)
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)
        const errorInfo = getErrorMessage(err)
        setError(errorInfo)
        
        // Fallback to static list if top10 also fails
        console.log('===== API CALL FAILED =====');
        console.log('API for top 10 failed. Using expanded hardcoded fallback list with 10 asteroids.');
        const fallbackList = [
          { name: "Apophis", designation: "99942", description: "Famous for its 2029 close approach to Earth." },
          { name: "Bennu", designation: "101955", description: "Target of NASA's OSIRIS-REx sample return mission." },
          { name: "Didymos", designation: "65803", description: "Binary asteroid system, target of NASA's DART mission." },
          { name: "Toutatis", designation: "4179", description: "Large irregularly shaped near-Earth asteroid." },
          { name: "Eros", designation: "433", description: "First asteroid orbited and landed on by spacecraft." },
          { name: "Ryugu", designation: "162173", description: "Target of Japan's Hayabusa2 sample return mission." },
          { name: "Itokawa", designation: "25143", description: "First asteroid visited by Japan's Hayabusa mission." },
          { name: "Phaethon", designation: "3200", description: "Parent body of the Geminid meteor shower." },
          { name: "Vesta", designation: "4", description: "Second-largest asteroid, visited by NASA's Dawn mission." },
          { name: "Psyche", designation: "16", description: "Metal-rich asteroid, target of NASA's Psyche mission." }
        ];
        setAsteroidList(fallbackList)
        console.log('Using fallback asteroid list with 10 real NASA asteroids due to API error');
      } finally {
        setSidebarLoading(false)
      }
    }
    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Fetch data for the selected asteroid whenever it changes
  useEffect(() => {
    const loadSelectedAsteroidData = async () => {
      if (selectedAsteroid) {
        await handleAsteroidSelect(selectedAsteroid);
      }
    };

    loadSelectedAsteroidData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsteroid]); // This hook now ONLY depends on the selected asteroid name

  // Handle impact simulation using real NASA asteroid parameters
  const handleSimulateImpact = async () => {
    setLoading(true)
    setError(null)

    // Switch to Impact (Crisis) mode when simulating impact
    if (currentTheme !== 'impact') {
      switchTheme('impact')
    }

    try {
      if (!selectedAsteroid) {
        throw new Error('No asteroid selected for impact simulation')
      }

      console.log(`Calculating impact for ${selectedAsteroid} using real NASA parameters...`)

      // Use new asteroid-specific impact calculation with real NASA data
      const data = await enhancedApi.calculateAsteroidImpact(selectedAsteroid)
      
      // Set asteroid-specific impact location
      const asteroidLocation = getAsteroidImpactLocation(selectedAsteroid)
      setImpactCoords(asteroidLocation)
      
      console.log(`Impact calculation successful for ${selectedAsteroid}:`, {
        diameter: data.diameter_used_km,
        velocity: data.velocity_used_kps,
        source: data.parameters_source,
        crater: data.craterDiameterMeters,
        energy: data.impactEnergyMegatons,
        location: asteroidLocation
      })
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

  // Handle retry functionality
  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    
    try {
      // Retry loading the selected asteroid
      await handleAsteroidSelect(selectedAsteroid)
    } finally {
      setIsRetrying(false)
    }
  }, [handleAsteroidSelect, selectedAsteroid])

  // Handle impact location selection callback
  const handleImpactSelect = useCallback((coordinates) => {
    setImpactCoords(coordinates)
    console.log('Impact location updated:', coordinates)
  }, [])

  // Handle view switching
  const handleViewChange = (newView) => {
    setView(newView)
  }

  // Simulate mission result
  const handleDefenderSimulate = () => {
    setShowSuccess(true)
    setMissionScore(successProb)
    setTimeout(() => setShowLeaderboard(true), 2000)
  }

  // Defender Mode theme switch
  useEffect(() => {
    if (defenderMode) {
      document.body.style.setProperty('--primary-color', '#00e6ff')
      document.body.style.setProperty('--secondary-color', '#e6e6e6')
      document.body.style.setProperty('--hud-bg', '#0a1a22')
    } else {
      document.body.style.removeProperty('--primary-color')
      document.body.style.removeProperty('--secondary-color')
      document.body.style.removeProperty('--hud-bg')
    }
  }, [defenderMode])

  return (
    <div className={`app${defenderMode ? ' defender-mode' : ''}`}> 
      <header className="app-header">
        <h1>Project Aegis - Asteroid Impact Simulator</h1>
        <div className="header-controls">
          <ThemeToggle className="theme-control" />
          <div className="view-controls">
            <button onClick={() => setDefenderMode((v) => !v)} style={{marginRight:8}}>
              {defenderMode ? 'Exit Defender Mode' : 'Earth Defender Mode'}
            </button>
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
        {defenderMode && (
          <>
            <DefenderHUD fuel={fuel} time={timeToImpact} probability={successProb} />
            <DefenderTechCards onSelect={setSelectedTech} selected={selectedTech} />
            <button className="defender-sim-btn" onClick={handleDefenderSimulate} style={{margin:'18px 0'}}>Simulate Mission</button>
            {showSuccess && <DefenderSuccessMeter score={missionScore} />}
            {showLeaderboard && <DefenderLeaderboard />}
          </>
        )}

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
                  fallback={({ onRetry, onReload }) => (
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
                    trajectory={currentTrajectory}
                    top10Trajectories={top10Trajectories}
                    selectedAsteroid={selectedAsteroid}
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
                  fallback={({ onRetry, onReload }) => (
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

        {/* Asteroid Selection Sidebar */}
        {!defenderMode && (
          <AsteroidSidebar
            asteroidList={asteroidList}
            selectedAsteroid={selectedAsteroid}
            onAsteroidSelect={handleAsteroidSelect}
            loading={sidebarLoading}
            error={error?.message}
          />
        )}
      </main>
    </div>
  )
}

export default App
