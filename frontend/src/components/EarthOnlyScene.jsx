import React, { useRef, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sphere, Html, Stars, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

const Earth = ({ onLocationSelect, autoRotate, zoomToLocation, onZoomComplete }) => {
  const earthRef = useRef()
  const { camera, gl } = useThree()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [impactPoint, setImpactPoint] = useState(null)
  const [isZooming, setIsZooming] = useState(false)
  
  // Handle zoom animation to impact location
  useEffect(() => {
    if (zoomToLocation && impactPoint && !isZooming) {
      setIsZooming(true)
      
      // Calculate target position for camera (close-up view of impact location)
      const impactWorldPosition = impactPoint.localPosition.clone()
      earthRef.current.localToWorld(impactWorldPosition)
      
      // Camera target: position slightly above and in front of impact point
      const cameraDistance = 0.5 // Very close zoom for map overlay
      const cameraOffset = impactPoint.localPosition.clone().normalize().multiplyScalar(2 + cameraDistance)
      const targetCameraPosition = cameraOffset.clone()
      earthRef.current.localToWorld(targetCameraPosition)
      
      // Animate camera with GSAP
      gsap.to(camera.position, {
        x: targetCameraPosition.x,
        y: targetCameraPosition.y,
        z: targetCameraPosition.z,
        duration: 2.5,
        ease: "power2.inOut",
        onUpdate: () => {
          // Update camera target to always look at impact point
          camera.lookAt(impactWorldPosition)
        },
        onComplete: () => {
          setIsZooming(false)
          if (onZoomComplete) {
            onZoomComplete(true)
          }
        }
      })
    }
  }, [zoomToLocation, impactPoint, camera, isZooming, onZoomComplete])
  
  
  // Load high-resolution Earth textures from NASA Blue Marble
  const earthTextures = React.useMemo(() => {
    const textureLoader = new THREE.TextureLoader()
    
    // NASA Blue Marble Earth texture (high resolution)
    const earthMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      undefined,
      undefined,
      () => {
        // Fallback to a simple procedural texture if loading fails
        console.warn('Failed to load Earth texture, using fallback')
      }
    )
    
    // Normal map for surface details
    const normalMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg'
    )
    
    // Specular map for water reflection
    const specularMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg'
    )
    
    // Night lights texture for city illumination
    const nightLightsMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png'
    )
    
    return { earthMap, normalMap, specularMap, nightLightsMap }
  }, [])
  
  // Create photorealistic Earth material (back to standard material)
  const earthMaterial = React.useMemo(() => {
    const material = new THREE.MeshPhongMaterial({
      map: earthTextures.earthMap,
      normalMap: earthTextures.normalMap,
      specularMap: earthTextures.specularMap,
      shininess: 100,
      transparent: false,
    })
    
    // Set texture properties for better quality
    if (earthTextures.earthMap) {
      earthTextures.earthMap.wrapS = THREE.RepeatWrapping
      earthTextures.earthMap.wrapT = THREE.ClampToEdgeWrapping
      earthTextures.earthMap.anisotropy = 16
    }
    
    if (earthTextures.normalMap) {
      earthTextures.normalMap.wrapS = THREE.RepeatWrapping
      earthTextures.normalMap.wrapT = THREE.ClampToEdgeWrapping
    }
    
    if (earthTextures.specularMap) {
      earthTextures.specularMap.wrapS = THREE.RepeatWrapping
      earthTextures.specularMap.wrapT = THREE.ClampToEdgeWrapping
    }
    
    return material
  }, [earthTextures])



  const raycaster = React.useMemo(() => new THREE.Raycaster(), [])
  const mouse = React.useMemo(() => new THREE.Vector2(), [])

  const handleClick = useCallback((event) => {
    if (!earthRef.current) return

    // Calculate mouse position
    const rect = gl.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Raycast to find intersection with the Earth sphere directly
    raycaster.setFromCamera(mouse, camera)
    
    // Find all child meshes of the Earth group to raycast against
    const earthChildren = []
    earthRef.current.traverse((child) => {
      if (child.isMesh && child.geometry.type === 'SphereGeometry') {
        earthChildren.push(child)
      }
    })
    
    const intersects = raycaster.intersectObjects(earthChildren)

    if (intersects.length > 0) {
      const worldPoint = intersects[0].point
      
      // Convert world position to local position relative to Earth group
      const localPoint = earthRef.current.worldToLocal(worldPoint.clone())
      
      // Normalize the point to unit sphere for accurate calculations
      const normalizedPoint = localPoint.clone().normalize()
      
      // Convert 3D point to lat/lng using standard spherical coordinates
      // Three.js SphereGeometry with standard UV mapping:
      // - Y axis points to North Pole (latitude)
      // - UV mapping starts at -Z axis for longitude 0°
      // - Longitude increases counter-clockwise when viewed from above (North Pole)
      
      // Calculate latitude (range: -90° to +90°)
      const latitude = Math.asin(normalizedPoint.y) * (180 / Math.PI)
      
      // Calculate longitude (range: -180° to +180°)
      // Standard spherical coordinates: atan2(x, z) with proper signs
      // This aligns with equirectangular texture mapping
      const longitude = Math.atan2(normalizedPoint.x, normalizedPoint.z) * (180 / Math.PI)
      
      // Debug logging for coordinate verification (remove in production)
      console.log(`Click coordinates: ${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`)
      console.log(`3D point: x=${normalizedPoint.x.toFixed(3)}, y=${normalizedPoint.y.toFixed(3)}, z=${normalizedPoint.z.toFixed(3)}`)
      
      setSelectedLocation([latitude, longitude])
      onLocationSelect([latitude, longitude])
      
      // Position marker slightly above surface in local coordinates
      const localPosition = localPoint.clone().normalize().multiplyScalar(2.02)
      setImpactPoint({
        localPosition,
        latitude,
        longitude
      })
    }
  }, [camera, gl, onLocationSelect, mouse, raycaster])

  const cloudsRef = useRef()
  const impactMarkerRef = useRef()
  const [markerScale, setMarkerScale] = useState(1)
  
  useFrame((state) => {
    // Only auto-rotate if enabled
    if (autoRotate && earthRef.current) {
      // Rotate entire Earth group (Earth + clouds + impact marker together)
      earthRef.current.rotation.y += 0.001 // Slow Earth rotation
    }
    
    // Always animate floating and clouds
    if (earthRef.current) {
      // Add subtle floating animation to entire Earth group
      earthRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
    }
    
    // Rotate clouds slightly faster than Earth for realism
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0005 // Differential rotation relative to Earth
    }
    
    // Calculate adaptive marker scale for precise point-like targeting
    if (earthRef.current && impactPoint) {
      const cameraDistance = camera.position.distanceTo(earthRef.current.position)
      const baseDistance = 6
      
      // Scaling optimized for small, precise markers
      let scaleFactor
      if (cameraDistance < 3) {
        // Very close zoom - moderate scaling to maintain precision
        scaleFactor = Math.min(8, (baseDistance / cameraDistance) * 2)
      } else if (cameraDistance < 5) {
        // Medium zoom - proportional scaling
        scaleFactor = (baseDistance / cameraDistance) * 1.2
      } else {
        // Far zoom - ensure marker remains visible
        scaleFactor = Math.max(1, baseDistance / (cameraDistance * 0.6))
      }
      
      setMarkerScale(scaleFactor)
    }
    
    // Fixed lighting - no real-time updates needed
    // Sun position remains constant with Asia/Europe in daylight
    
    // Animate impact marker with zoom-aware scaling and pulsing
    if (impactMarkerRef.current && impactPoint) {
      const cameraDistance = camera.position.distanceTo(earthRef.current?.position || new THREE.Vector3())
      
      // Adjust pulse intensity based on zoom level
      let pulseIntensity, pulseSpeed
      if (cameraDistance < 3) {
        // Close zoom - subtle pulse for precision
        pulseIntensity = 0.15
        pulseSpeed = 3
      } else if (cameraDistance < 6) {
        // Medium zoom - moderate pulse
        pulseIntensity = 0.25
        pulseSpeed = 4
      } else {
        // Far zoom - stronger pulse for visibility
        pulseIntensity = 0.4
        pulseSpeed = 5
      }
      
      const pulseFactor = Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseIntensity + 1
      const adaptiveScale = markerScale * pulseFactor
      impactMarkerRef.current.scale.setScalar(adaptiveScale)
    }
  })

  // Load cloud texture
  const cloudTexture = React.useMemo(() => {
    const textureLoader = new THREE.TextureLoader()
    return textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png'
    )
  }, [])

  return (
    <group>
      {/* Earth Group - contains Earth, clouds, and impact marker so they rotate together */}
      <group ref={earthRef}>
        {/* Main Earth sphere with realistic satellite textures */}
        <Sphere 
          args={[2, 256, 128]} 
          onClick={handleClick}
          material={earthMaterial}
        />
        
        {/* Subtle night lights layer */}
        <Sphere args={[2.001, 256, 128]}>
          <meshBasicMaterial 
            map={earthTextures.nightLightsMap}
            transparent 
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            color={new THREE.Color(1.2, 1.0, 0.7)}
            depthWrite={false}
          />
        </Sphere>
        
        {/* Realistic Clouds layer */}
        <Sphere ref={cloudsRef} args={[2.01, 128, 64]}>
          <meshPhongMaterial 
            map={cloudTexture}
            transparent 
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.NormalBlending}
          />
        </Sphere>
        
        {/* Precise point-like impact marker */}
        {impactPoint && (
          <group ref={impactMarkerRef} position={impactPoint.localPosition}>
            {/* Precision center point - exact impact location */}
            <Sphere args={[0.003, 16, 16]}>
              <meshBasicMaterial 
                color="#ffffff" 
                transparent 
                opacity={1.0}
              />
            </Sphere>
            
            {/* High-precision core - immediate impact */}
            <Sphere args={[0.008, 12, 12]}>
              <meshBasicMaterial 
                color="#ff0000" 
                transparent 
                opacity={0.9}
              />
            </Sphere>
            
            {/* Inner zone - small crater area */}
            <Sphere args={[0.015, 12, 12]}>
              <meshBasicMaterial 
                color="#ff3333" 
                transparent 
                opacity={0.6}
                wireframe
              />
            </Sphere>
            
            {/* Damage radius - city-scale impact */}
            <Sphere args={[0.025, 10, 10]}>
              <meshBasicMaterial 
                color="#ff6666" 
                transparent 
                opacity={0.4}
                wireframe
              />
            </Sphere>
            
            {/* Outer effects - regional scale */}
            <Sphere args={[0.04, 8, 8]}>
              <meshBasicMaterial 
                color="#ffaaaa" 
                transparent 
                opacity={0.2}
                side={THREE.DoubleSide}
              />
            </Sphere>
          </group>
        )}
      </group>
      
      {selectedLocation && (
        <Html position={[0, 2.8, 0]} center>
          <div className="location-indicator">
            <div className="location-text">
              🎯 Impact Location Selected
            </div>
            <div className="coordinates">
              {Math.abs(selectedLocation[0]).toFixed(2)}°{selectedLocation[0] >= 0 ? 'N' : 'S'}, {Math.abs(selectedLocation[1]).toFixed(2)}°{selectedLocation[1] >= 0 ? 'E' : 'W'}
            </div>
          </div>
        </Html>
      )}
      
      {/* Atmospheric glow - inner layer */}
      <Sphere args={[2.03, 64, 32]}>
        <meshBasicMaterial 
          color="#6BB6FF" 
          transparent 
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      
      {/* Atmospheric glow - outer layer */}
      <Sphere args={[2.25, 32, 16]}>
        <meshBasicMaterial 
          color="#87CEEB" 
          transparent 
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </group>
  )
}

const EarthOnlyScene = ({ onLocationSelect, zoomToLocation, onZoomComplete }) => {
  const [autoRotate, setAutoRotate] = useState(true)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const sunLightRef = useRef()
  
  // Fixed sun position - Asia/Europe in day, Americas/Pacific in night
  const getSunPosition = React.useCallback(() => {
    // Fixed position with sun illuminating Asia/Europe (around 60°E longitude)
    // This puts sun over India/Middle East region for good Asia-Europe daylight
    const sunLongitude = 60 * Math.PI / 180 // 60° East longitude
    const declination = 15 * Math.PI / 180 // Moderate seasonal tilt
    
    // Convert to 3D position (fixed sun direction)
    const sunDirection = new THREE.Vector3(
      Math.cos(declination) * Math.cos(sunLongitude),
      Math.sin(declination), 
      Math.cos(declination) * Math.sin(sunLongitude)
    )
    
    return sunDirection.multiplyScalar(25)
  }, [])

  return (
    <div className="earth-scene-container">
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'radial-gradient(ellipse at center, #0a0a2e 0%, #000000 100%)' }}
      >
        {/* Orbit Controls for zoom and rotation */}
        <OrbitControls
          enabled={controlsEnabled}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={2.5}
          maxDistance={15}
          autoRotate={false}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          dampingFactor={0.05}
          enableDamping={true}
        />
        
        {/* Soft base lighting for overall Earth visibility */}
        <ambientLight intensity={0.4} color="#3a3a5a" />
        
        {/* Accurate real-time sun light */}
        <directionalLight 
          ref={sunLightRef}
          position={getSunPosition()}
          intensity={2.2} 
          color="#fff5dc"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        
        {/* Soft atmospheric fill light (twilight effect) */}
        <directionalLight 
          position={getSunPosition().clone().negate().multiplyScalar(0.7)}
          intensity={0.8} 
          color="#6688cc"
        />
        
        {/* Multiple soft lights to reduce harsh terminator line */}
        <pointLight 
          position={[15, 8, 12]} 
          intensity={0.4} 
          color="#ffeecc"
          distance={30}
          decay={2}
        />
        
        <pointLight 
          position={[-15, -8, -12]} 
          intensity={0.4} 
          color="#cceeff"
          distance={30}
          decay={2}
        />
        
        {/* Hemisphere light for natural sky illumination */}
        <hemisphereLight 
          skyColor="#87CEEB"
          groundColor="#4a4a6a"
          intensity={0.4}
        />
        
        <Earth 
          onLocationSelect={onLocationSelect} 
          autoRotate={autoRotate}
          zoomToLocation={zoomToLocation}
          onZoomComplete={onZoomComplete}
        />
        
        {/* Add realistic starfield */}
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade={true}
          speed={0.1}
        />
      </Canvas>
      
      <div className="scene-instructions">
        <div className="instruction-text">
          🌍 <strong>Click anywhere on Earth</strong> to select impact location
        </div>
        <div className="instruction-subtext">
          🖱️ Drag to rotate • 🔍 Scroll to zoom • ⚙️ Manual controls available
        </div>
      </div>

      <div className="controls-panel">
        <button 
          className={`control-btn ${autoRotate ? 'active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
        >
          {autoRotate ? '⏸️ Stop Auto-Rotate' : '▶️ Auto-Rotate'}
        </button>
        
        <button 
          className={`control-btn ${controlsEnabled ? 'active' : ''}`}
          onClick={() => setControlsEnabled(!controlsEnabled)}
        >
          {controlsEnabled ? '🔓 Controls ON' : '🔒 Controls OFF'}
        </button>
      </div>

      <style>{`
        .earth-scene-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 500px;
        }

        .scene-instructions {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
        }

        .instruction-text {
          font-size: 16px;
          margin-bottom: 5px;
        }

        .instruction-subtext {
          font-size: 14px;
          opacity: 0.8;
          font-style: italic;
        }

        .controls-panel {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 100;
        }

        .control-btn {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          min-width: 160px;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
        }

        .control-btn.active {
          background: rgba(0, 255, 136, 0.8);
          border-color: rgba(0, 255, 136, 1);
          color: black;
        }

        .control-btn.active:hover {
          background: rgba(0, 255, 136, 0.9);
        }

        .location-indicator {
          background: rgba(0, 255, 136, 0.9);
          color: white;
          padding: 10px 15px;
          border-radius: 20px;
          text-align: center;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
          animation: pulse 2s infinite;
        }

        .location-text {
          font-size: 14px;
          margin-bottom: 5px;
        }

        .coordinates {
          font-size: 12px;
          opacity: 0.9;
          font-family: monospace;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default EarthOnlyScene