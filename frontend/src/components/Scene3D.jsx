import React, { Suspense, useMemo, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import PerformanceMonitor from './PerformanceMonitor'
import './Scene3D.css'

// Performance-aware loading component
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color="#333" wireframe />
  </mesh>
)

const Scene3D = React.memo(({ trajectory, onSimulateImpact, onImpactSelect }) => {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(
    process.env.NODE_ENV === 'development'
  )
  const [qualityLevel, setQualityLevel] = useState('high') // high, medium, low

  // Memoized camera configuration
  const cameraConfig = useMemo(() => ({
    position: [10, 10, 10],
    fov: 60,
    near: 0.1,
    far: 1000
  }), [])

  // Adaptive quality settings based on performance
  const qualitySettings = useMemo(() => {
    switch (qualityLevel) {
      case 'low':
        return {
          starsCount: 1000,
          starsFactor: 2,
          shadowsEnabled: false,
          antialias: false,
          pixelRatio: Math.min(window.devicePixelRatio, 1)
        }
      case 'medium':
        return {
          starsCount: 2500,
          starsFactor: 3,
          shadowsEnabled: false,
          antialias: true,
          pixelRatio: Math.min(window.devicePixelRatio, 1.5)
        }
      case 'high':
      default:
        return {
          starsCount: 5000,
          starsFactor: 4,
          shadowsEnabled: true,
          antialias: true,
          pixelRatio: Math.min(window.devicePixelRatio, 2)
        }
    }
  }, [qualityLevel])

  // Performance monitoring callback
  const handlePerformanceChange = useCallback((fps) => {
    if (fps < 20 && qualityLevel !== 'low') {
      setQualityLevel('low')
    } else if (fps < 30 && qualityLevel === 'high') {
      setQualityLevel('medium')
    } else if (fps > 45 && qualityLevel === 'low') {
      setQualityLevel('medium')
    } else if (fps > 55 && qualityLevel === 'medium') {
      setQualityLevel('high')
    }
  }, [qualityLevel])

  // Toggle performance monitor
  const togglePerformanceMonitor = useCallback(() => {
    setShowPerformanceMonitor(prev => !prev)
  }, [])

  return (
    <div className="scene3d-container">
      <Canvas
        camera={cameraConfig}
        style={{ 
          background: 'linear-gradient(135deg, #050B1A, #001024)',
          backgroundAttachment: 'fixed'
        }}
        dpr={qualitySettings.pixelRatio}
        antialias={!!qualitySettings.antialias}
        shadows={qualitySettings.shadowsEnabled}
        performance={{ min: 0.5 }}
        frameloop="demand" // Only render when needed
      >
        {/* Enhanced cosmic lighting setup */}
        <ambientLight intensity={0.2} color="#0E1D3A" />
        <pointLight 
          position={[0, 0, 0]} 
          intensity={3} 
          color="#FFCC33" 
          castShadow={qualitySettings.shadowsEnabled}
          shadow-mapSize-width={qualitySettings.shadowsEnabled ? 2048 : 512}
          shadow-mapSize-height={qualitySettings.shadowsEnabled ? 2048 : 512}
        />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.5}
          color="#00E5FF"
          castShadow={qualitySettings.shadowsEnabled}
        />
        
        {/* Adaptive background stars */}
        <Stars 
          radius={300} 
          depth={50} 
          count={qualitySettings.starsCount} 
          factor={qualitySettings.starsFactor} 
          saturation={0} 
          fade 
        />
        
        {/* Solar system components with performance-aware loading */}
        <Suspense fallback={<LoadingFallback />}>
          <SolarSystem 
            trajectory={trajectory} 
            qualityLevel={qualityLevel}
            onPerformanceChange={handlePerformanceChange}
            onImpactSelect={onImpactSelect}
          />
        </Suspense>
        
        {/* Optimized camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
          autoRotate={false}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.8}
        />
      </Canvas>
      
      {/* Performance Monitor */}
      <PerformanceMonitor 
        enabled={showPerformanceMonitor}
        trajectory={trajectory}
      />
      
      {/* UI Overlay */}
      <div className="scene3d-overlay">
        <div className="scene3d-info">
          <h3>Orbital Visualization</h3>
          {trajectory ? (
            <div className="trajectory-info">
              <p>✓ Trajectory data loaded</p>
              <p>Asteroid points: {trajectory.asteroid_path?.length || 0}</p>
              <p>Earth points: {trajectory.earth_path?.length || 0}</p>
              <div className="quality-indicator">
                <span className={`quality-badge quality-${qualityLevel}`}>
                  {qualityLevel.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <p>Loading trajectory data...</p>
          )}
        </div>
        
        {trajectory && (
          <button 
            className="simulate-impact-btn"
            onClick={onSimulateImpact}
          >
            🌍 Simulate Impact
          </button>
        )}
        
        <div className="scene3d-controls">
          <p>🖱️ Drag to rotate • 🔍 Scroll to zoom • ⌨️ Right-click to pan</p>
          
          {/* Performance controls */}
          <div className="performance-controls">
            <button 
              className="performance-toggle"
              onClick={togglePerformanceMonitor}
              title="Toggle Performance Monitor"
            >
              📊
            </button>
            
            <select 
              value={qualityLevel}
              onChange={(e) => setQualityLevel(e.target.value)}
              className="quality-selector"
              title="Graphics Quality"
            >
              <option value="low">Low Quality</option>
              <option value="medium">Medium Quality</option>
              <option value="high">High Quality</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
})

Scene3D.displayName = 'Scene3D'

export default Scene3D