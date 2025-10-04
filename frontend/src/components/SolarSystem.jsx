import React, { useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

// Performance monitoring utilities
const PerformanceMonitor = {
  frameCount: 0,
  lastTime: 0,
  fps: 0,
  
  update() {
    this.frameCount++
    const now = performance.now()
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime))
      this.frameCount = 0
      this.lastTime = now
    }
  },
  
  getFPS() {
    return this.fps
  }
}

// Optimized coordinate processing with memory pooling
const CoordinateProcessor = {
  vectorPool: [],
  
  getVector3() {
    return this.vectorPool.pop() || new THREE.Vector3()
  },
  
  releaseVector3(vector) {
    vector.set(0, 0, 0)
    this.vectorPool.push(vector)
  },
  
  processCoordinates(coordinates, scale = 5) {
    if (!coordinates || !Array.isArray(coordinates)) return []
    
    const points = []
    for (let i = 0; i < coordinates.length; i++) {
      const point = coordinates[i]
      if (point && point.length >= 3) {
        const vector = this.getVector3()
        vector.set(point[0] * scale, point[1] * scale, point[2] * scale)
        points.push(vector)
      }
    }
    return points
  },
  
  releasePoints(points) {
    for (const point of points) {
      this.releaseVector3(point)
    }
  }
}

const SolarSystem = React.memo(({ trajectory, onImpactSelect }) => {
  const earthRef = useRef()
  const asteroidRef = useRef()
  const earthLineRef = useRef()
  const asteroidLineRef = useRef()
  const animationStateRef = useRef({
    earthIndex: 0,
    asteroidIndex: 0,
    lastUpdate: 0
  })

  // Three.js context for raycasting
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])

  // Convert 3D intersection point to geographic latitude/longitude coordinates
  const convertToLatLng = useCallback((point, radius = 0.12) => {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
      throw new Error('Invalid 3D point provided for coordinate conversion')
    }

    if (radius <= 0) {
      throw new Error('Invalid radius provided for coordinate conversion')
    }

    // Normalize the point to unit sphere for accurate coordinate calculation
    const normalizedPoint = point.clone().normalize()
    
    // Calculate latitude using Math.asin(point.y / radius) * (180 / Math.PI)
    // Since we normalized the point, radius is effectively 1
    const latitude = Math.asin(normalizedPoint.y) * (180 / Math.PI)
    
    // Calculate longitude using Math.atan2(point.z, point.x) * (180 / Math.PI)
    const longitude = Math.atan2(normalizedPoint.z, normalizedPoint.x) * (180 / Math.PI)
    
    // Validate and ensure coordinates are within valid Earth surface bounds
    const clampedLatitude = Math.max(-90, Math.min(90, latitude))
    const clampedLongitude = Math.max(-180, Math.min(180, longitude))
    
    // Additional validation to ensure we have valid numeric coordinates
    if (isNaN(clampedLatitude) || isNaN(clampedLongitude)) {
      throw new Error('Coordinate conversion resulted in invalid values')
    }
    
    return [clampedLatitude, clampedLongitude]
  }, [])

  // Handle Earth click for impact location selection
  const handleEarthClick = useCallback((event) => {
    if (!onImpactSelect || !earthRef.current) return

    event.stopPropagation()

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = gl.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Update raycaster
    raycaster.setFromCamera(mouse, camera)

    // Check for intersection with Earth mesh
    const intersects = raycaster.intersectObject(earthRef.current, true)
    
    if (intersects.length > 0) {
      const intersection = intersects[0]
      const point = intersection.point
      
      try {
        // Convert 3D intersection point to latitude/longitude using dedicated function
        const coordinates = convertToLatLng(point, 0.12)
        
        // Add visual feedback and console logging to confirm impact location selection
        console.log('🌍 Impact location selected:', {
          coordinates: coordinates,
          latitude: coordinates[0].toFixed(4),
          longitude: coordinates[1].toFixed(4),
          intersectionPoint: {
            x: point.x.toFixed(4),
            y: point.y.toFixed(4),
            z: point.z.toFixed(4)
          }
        })
        
        // Call the callback with the new coordinates
        onImpactSelect(coordinates)
        
        // Visual feedback: briefly highlight the Earth to show selection was registered
        if (earthRef.current && earthRef.current.material) {
          const originalEmissive = earthRef.current.material.emissive.clone()
          const originalEmissiveIntensity = earthRef.current.material.emissiveIntensity
          
          // Flash the Earth with a brief highlight
          earthRef.current.material.emissive.setHex(0x00ff00)
          earthRef.current.material.emissiveIntensity = 0.3
          
          // Reset after a short delay
          setTimeout(() => {
            if (earthRef.current && earthRef.current.material) {
              earthRef.current.material.emissive.copy(originalEmissive)
              earthRef.current.material.emissiveIntensity = originalEmissiveIntensity
            }
          }, 200)
        }
        
      } catch (error) {
        console.error('Failed to convert 3D coordinates to lat/lng:', error)
        // Optionally provide fallback coordinates or user feedback
      }
    } else {
      // Log when click doesn't hit Earth for debugging
      console.log('🌍 Click detected but no Earth intersection found')
    }
  }, [onImpactSelect, camera, gl, raycaster, mouse, convertToLatLng])

  // Optimized geometry creation with efficient memory usage
  const geometryData = useMemo(() => {
    if (!trajectory) {
      return { 
        earthPathGeometry: null, 
        asteroidPathGeometry: null,
        earthPositions: null,
        asteroidPositions: null,
        pointCount: 0
      }
    }

    const scale = 5
    
    // Process coordinates with optimized memory usage
    const earthPoints = CoordinateProcessor.processCoordinates(trajectory.earth_path, scale)
    const asteroidPoints = CoordinateProcessor.processCoordinates(trajectory.asteroid_path, scale)

    // Create optimized BufferGeometry with proper attributes
    let earthPathGeometry = null
    let asteroidPathGeometry = null

    if (earthPoints.length > 0) {
      earthPathGeometry = new THREE.BufferGeometry()
      const earthPositions = new Float32Array(earthPoints.length * 3)
      
      for (let i = 0; i < earthPoints.length; i++) {
        const point = earthPoints[i]
        earthPositions[i * 3] = point.x
        earthPositions[i * 3 + 1] = point.y
        earthPositions[i * 3 + 2] = point.z
      }
      
      earthPathGeometry.setAttribute('position', new THREE.BufferAttribute(earthPositions, 3))
      earthPathGeometry.computeBoundingSphere()
    }

    if (asteroidPoints.length > 0) {
      asteroidPathGeometry = new THREE.BufferGeometry()
      const asteroidPositions = new Float32Array(asteroidPoints.length * 3)
      
      for (let i = 0; i < asteroidPoints.length; i++) {
        const point = asteroidPoints[i]
        asteroidPositions[i * 3] = point.x
        asteroidPositions[i * 3 + 1] = point.y
        asteroidPositions[i * 3 + 2] = point.z
      }
      
      asteroidPathGeometry.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3))
      asteroidPathGeometry.computeBoundingSphere()
    }

    return { 
      earthPathGeometry, 
      asteroidPathGeometry,
      earthPositions: earthPoints,
      asteroidPositions: asteroidPoints,
      pointCount: earthPoints.length + asteroidPoints.length
    }
  }, [trajectory])

  // Cleanup function for geometry disposal
  const cleanupGeometry = useCallback(() => {
    if (geometryData.earthPathGeometry) {
      geometryData.earthPathGeometry.dispose()
    }
    if (geometryData.asteroidPathGeometry) {
      geometryData.asteroidPathGeometry.dispose()
    }
    if (geometryData.earthPositions) {
      CoordinateProcessor.releasePoints(geometryData.earthPositions)
    }
    if (geometryData.asteroidPositions) {
      CoordinateProcessor.releasePoints(geometryData.asteroidPositions)
    }
  }, [geometryData])

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanupGeometry
  }, [cleanupGeometry])

  // Optimized position calculations with memoization
  const { earthPosition, asteroidPosition } = useMemo(() => {
    const scale = 5
    
    const earthPos = trajectory?.earth_path?.length 
      ? [trajectory.earth_path[0][0] * scale, trajectory.earth_path[0][1] * scale, trajectory.earth_path[0][2] * scale]
      : [scale, 0, 0]
    
    const asteroidPos = trajectory?.asteroid_path?.length 
      ? [trajectory.asteroid_path[0][0] * scale, trajectory.asteroid_path[0][1] * scale, trajectory.asteroid_path[0][2] * scale]
      : [0, 0, 0]
    
    return { earthPosition: earthPos, asteroidPosition: asteroidPos }
  }, [trajectory])

  // Optimized animation frame with performance monitoring and throttling
  useFrame((state) => {
    PerformanceMonitor.update()
    
    const now = state.clock.getElapsedTime()
    const animationState = animationStateRef.current
    
    // Throttle updates based on performance (adaptive frame rate)
    const fps = PerformanceMonitor.getFPS()
    const updateInterval = fps > 30 ? 0.016 : fps > 15 ? 0.033 : 0.066 // 60fps, 30fps, or 15fps
    
    if (now - animationState.lastUpdate < updateInterval) {
      return
    }
    
    animationState.lastUpdate = now

    // Optimized Earth animation with bounds checking
    if (earthRef.current && geometryData.earthPositions?.length > 1) {
      const earthSpeed = 0.1
      animationState.earthIndex = Math.floor((now * earthSpeed) % geometryData.earthPositions.length)
      const pos = geometryData.earthPositions[animationState.earthIndex]
      if (pos) {
        earthRef.current.position.set(pos.x, pos.y, pos.z)
      }
    }

    // Optimized asteroid animation with bounds checking
    if (asteroidRef.current && geometryData.asteroidPositions?.length > 1) {
      const asteroidSpeed = 0.05
      animationState.asteroidIndex = Math.floor((now * asteroidSpeed) % geometryData.asteroidPositions.length)
      const pos = geometryData.asteroidPositions[animationState.asteroidIndex]
      if (pos) {
        asteroidRef.current.position.set(pos.x, pos.y, pos.z)
      }
    }
  })

  return (
    <group>
      {/* Sun at the center - optimized geometry */}
      <Sphere args={[0.3, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#FDB813" 
          emissive="#FDB813"
          emissiveIntensity={0.8}
        />
      </Sphere>

      {/* Sun glow effect - reduced geometry for performance */}
      <Sphere args={[0.5, 8, 8]} position={[0, 0, 0]}>
        <meshBasicMaterial 
          color="#FDB813" 
          transparent
          opacity={0.1}
        />
      </Sphere>

      {/* Earth orbital path - optimized line rendering */}
      {geometryData.earthPathGeometry && (
        <line ref={earthLineRef} geometry={geometryData.earthPathGeometry}>
          <lineBasicMaterial 
            color="#4A90E2" 
            opacity={0.7} 
            transparent 
            linewidth={2}
          />
        </line>
      )}

      {/* Asteroid orbital path - optimized line rendering */}
      {geometryData.asteroidPathGeometry && (
        <line ref={asteroidLineRef} geometry={geometryData.asteroidPathGeometry}>
          <lineBasicMaterial 
            color="#FF6B6B" 
            opacity={0.9} 
            transparent 
            linewidth={3}
          />
        </line>
      )}

      {/* Earth - optimized geometry */}
      <Sphere 
        ref={earthRef}
        args={[0.12, 16, 16]} 
        position={earthPosition}
        onClick={handleEarthClick}
      >
        <meshStandardMaterial 
          color="#4A90E2"
          roughness={0.7}
          metalness={0.1}
        />
      </Sphere>

      {/* Asteroid - optimized geometry */}
      {trajectory?.asteroid_path?.length > 0 && (
        <Sphere 
          ref={asteroidRef}
          args={[0.04, 8, 8]} 
          position={asteroidPosition}
        >
          <meshStandardMaterial 
            color="#FF6B6B"
            emissive="#FF6B6B"
            emissiveIntensity={0.4}
            roughness={0.9}
          />
        </Sphere>
      )}

      {/* Asteroid trail effect - conditional rendering based on performance */}
      {trajectory?.asteroid_path?.length > 0 && PerformanceMonitor.getFPS() > 30 && (
        <Sphere 
          args={[0.08, 6, 6]} 
          position={asteroidPosition}
        >
          <meshBasicMaterial 
            color="#FF6B6B" 
            transparent
            opacity={0.2}
          />
        </Sphere>
      )}

      {/* Reference grid - conditional rendering for performance */}
      {PerformanceMonitor.getFPS() > 20 && (
        <gridHelper 
          args={[20, 10, '#333333', '#333333']} 
          position={[0, -0.1, 0]}
        />
      )}
      
      {/* Performance indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[-8, 8, 0]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
})

SolarSystem.displayName = 'SolarSystem'

export default SolarSystem