import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sphere, Line, Ring, useTexture } from '@react-three/drei'
// import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import * as THREE from 'three'


// Performance monitoring utilities
const PerformanceMonitor = {
  frameCount: 0,
  lastTime: 0,
  fps: 0,
  getFPS() {
    return this.fps || 60;
  },
  update() {
    // Optionally implement FPS calculation here if needed
  }
}

// Coordinate processing utilities
const CoordinateProcessor = {
  processCoordinates(coordinates, scale = 1) {
    const points = [];
    for (let i = 0; i < coordinates.length; i++) {
      const point = coordinates[i];
      if (point && point.length >= 3) {
        const vector = new THREE.Vector3();
        vector.set(point[0] * scale, point[1] * scale, point[2] * scale);
        points.push(vector);
      }
    }
    return points;
  },
  releasePoints(points) {
    // Optionally implement pooling/cleanup if needed
  }
}

const SolarSystem = React.memo(({ trajectory, onImpactSelect }) => {
  const earthRef = useRef()
  const asteroidRef = useRef()
  const earthLineRef = useRef()
  const asteroidLineRef = useRef()
  const orbitLineRef = useRef()
  const animationStateRef = useRef({
    earthRotation: 0,
    asteroidAngle: 0,
    lastUpdate: 0
  })
  
  // Orbital parameters for asteroid around Earth
  const orbitRadius = 3.5 // Distance from Earth center
  const orbitSpeed = 0.02 // Rotation speed around Earth
  const earthRotationSpeed = 0.01 // Earth's rotation speed

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
  if (!onImpactSelect || !earthRef.current) return;

  event.stopPropagation();

  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = gl.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Update raycaster
  raycaster.setFromCamera(mouse, camera);

  // Check for intersection with Earth mesh
  const intersects = raycaster.intersectObject(earthRef.current, true);

  if (intersects.length > 0) {
    const intersection = intersects[0];
    const point = intersection.point;
    try {
      const coordinates = convertToLatLng(point, 0.12);
      console.log('🌍 Impact location selected:', {
        coordinates: coordinates,
        latitude: coordinates[0].toFixed(4),
        longitude: coordinates[1].toFixed(4),
        intersectionPoint: {
          x: point.x.toFixed(4),
          y: point.y.toFixed(4),
          z: point.z.toFixed(4)
        }
      });
      onImpactSelect(coordinates);
      if (earthRef.current && earthRef.current.material) {
        const originalEmissive = earthRef.current.material.emissive.clone();
        const originalEmissiveIntensity = earthRef.current.material.emissiveIntensity;
        earthRef.current.material.emissive.setHex(0x00ff00);
        earthRef.current.material.emissiveIntensity = 0.3;
        setTimeout(() => {
          if (earthRef.current && earthRef.current.material) {
            earthRef.current.material.emissive.copy(originalEmissive);
            earthRef.current.material.emissiveIntensity = originalEmissiveIntensity;
          }
        }, 200);
      }
    } catch (error) {
      console.error('Failed to convert 3D coordinates to lat/lng:', error);
    }
  }
}, [onImpactSelect, camera, gl, raycaster, mouse, convertToLatLng]);
        


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
    PerformanceMonitor.update();
    const now = state.clock.getElapsedTime();
    // Slow, smooth Earth travel along its orbit
    if (earthRef.current && geometryData.earthPositions?.length > 1) {
      // Slower speed for Earth
      const t = (now * 0.015) % 1; // 0.015 is slower than before
      const idx = t * (geometryData.earthPositions.length - 1);
      const idx0 = Math.floor(idx);
      const idx1 = (idx0 + 1) % geometryData.earthPositions.length;
      const frac = idx - idx0;
      const p0 = geometryData.earthPositions[idx0];
      const p1 = geometryData.earthPositions[idx1];
      if (p0 && p1) {
        // Linear interpolation for smooth movement
        earthRef.current.position.set(
          p0.x + (p1.x - p0.x) * frac,
          p0.y + (p1.y - p0.y) * frac,
          p0.z + (p1.z - p0.z) * frac
        );
        earthRef.current.rotation.y = now * 0.15; // slower rotation
      }
    }
    // Asteroid orbits around Earth's current position in a true orbit
    if (asteroidRef.current && earthRef.current) {
      // Place asteroid in a circular orbit around the moving Earth
      const asteroidOrbitRadius = 0.25; // smaller, closer to Earth
      const asteroidOrbitSpeed = 0.25; // much slower
      const angle = now * asteroidOrbitSpeed;
      const earthPos = earthRef.current.position;
      // Orbit in the XZ plane around Earth
      const asteroidX = earthPos.x + Math.cos(angle) * asteroidOrbitRadius;
      const asteroidY = earthPos.y;
      const asteroidZ = earthPos.z + Math.sin(angle) * asteroidOrbitRadius;
      asteroidRef.current.position.set(asteroidX, asteroidY, asteroidZ);
    }
  });


  // Helper to safely load a texture, fallback to undefined if not found
  function safeTexture(path) {
    try {
      return useTexture(path)
    } catch (e) {
      return undefined
    }
  }

  // Try to load textures, fallback to undefined
  let earthDayMap, earthNightMap, earthSpecMap, earthCityMap, asteroidBumpMap, asteroidAlbedo
  try {
    earthDayMap = safeTexture('/textures/earth_day.jpg')
    earthNightMap = safeTexture('/textures/earth_night.jpg')
    earthSpecMap = safeTexture('/textures/earth_spec.jpg')
    earthCityMap = safeTexture('/textures/earth_city_lights.jpg')
    asteroidBumpMap = safeTexture('/textures/asteroid_bump.jpg')
    asteroidAlbedo = safeTexture('/textures/asteroid_albedo.jpg')
  } catch (e) {
    earthDayMap = earthNightMap = earthSpecMap = earthCityMap = asteroidBumpMap = asteroidAlbedo = undefined
  }

  return (
    <>
      {/* Cinematic postprocessing */}
      {/* <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.2} />
        <SSAO samples={8} radius={10} intensity={15} />
      </EffectComposer> */}
      <group>
      {/* Sun at the center - animated shader placeholder */}
      <Sphere args={[0.3, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#FDB813" 
          emissive="#FDB813"
          emissiveIntensity={1.2}
        />
      </Sphere>
      {/* Sun rim light (Amber) */}
      <pointLight position={[0,0,0]} intensity={2.5} color="#FFB300" distance={2.5} decay={2} />



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

      {/* Earth - cinematic material with fallback */}
      <Sphere 
        ref={earthRef}
        args={[0.12, 32, 32]} 
        position={earthPosition}
        onClick={handleEarthClick}
      >
        <meshStandardMaterial 
          map={earthDayMap || null}
          emissiveMap={earthCityMap || null}
          color={earthDayMap ? undefined : "#4A90E2"}
          emissive="#1a237e"
          emissiveIntensity={0.7}
          specularMap={earthSpecMap || null}
          roughness={0.5}
          metalness={0.2}
        />
      </Sphere>
      {/* Rim light for Earth */}
      <directionalLight position={[1,2,1]} intensity={0.7} color="#B3E5FC" />

      {/* Asteroid - cinematic material with fallback */}
      {earthRef.current && (
        <Sphere 
          ref={asteroidRef}
          args={[0.04, 16, 16]} 
          position={asteroidPosition}
        >
          <meshStandardMaterial 
            map={asteroidAlbedo || null}
            bumpMap={asteroidBumpMap || null}
            bumpScale={asteroidBumpMap ? 0.03 : 0}
            color={asteroidAlbedo ? undefined : "#888"}
            roughness={0.95}
            metalness={0.05}
          />
        </Sphere>
      )}
      {/* Rim light for Asteroid */}
      <directionalLight position={[-1,1,2]} intensity={0.5} color="#FFFDE7" />

      {/* Asteroid trail effect - conditional rendering based on performance */}
        {earthRef.current && PerformanceMonitor.getFPS() > 30 && (
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
    </>
  )
})

SolarSystem.displayName = 'SolarSystem'

export default SolarSystem