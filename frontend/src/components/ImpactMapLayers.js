// Layered visualization and animation helpers for ImpactMap
import { Circle, LayerGroup, Popup, useMap, Polygon } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'

// This file uses JSX and should have a .jsx extension.

// Blast radius (gradient ring)
export function BlastRadius({ center, radius }) {
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: '#ff9900',
        fillColor: '#ff9900',
        fillOpacity: 0.15,
        weight: 1,
        dashArray: '6 8',
      }}
    />
  )
}

// Thermal radiation (yellow halo)
export function ThermalHalo({ center, radius }) {
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: '#ffe066',
        fillColor: '#ffe066',
        fillOpacity: 0.10,
        weight: 1,
      }}
    />
  )
}

// Tsunami risk (blue overlay)
export function TsunamiOverlay({ polygon }) {
  return (
    <Polygon
      positions={polygon}
      pathOptions={{
        color: '#2196f3',
        fillColor: '#2196f3',
        fillOpacity: 0.18,
        weight: 0,
      }}
    />
  )
}

// Population heatmap (requires leaflet.heat plugin)
export function PopulationHeatmap({ points }) {
  const map = useMap()
  const layerRef = useRef()
  useEffect(() => {
    if (!map || !points?.length) return
    if (!window.L || !window.L.heatLayer) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }
    layerRef.current = window.L.heatLayer(points, { radius: 30, blur: 25, maxZoom: 14, gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' } })
    layerRef.current.addTo(map)
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, points])
  return null
}

// Animated tsunami wavefronts
export function TsunamiWaves({ center, count = 3, baseRadius = 20000, duration = 3000 }) {
  const [wave, setWave] = React.useState(0)
  useEffect(() => {
    let running = true
    let t0 = Date.now()
    function animate() {
      if (!running) return
      setWave(((Date.now() - t0) % duration) / duration)
      requestAnimationFrame(animate)
    }
    animate()
    return () => { running = false }
  }, [duration])
  return (
    <LayerGroup>
      {Array.from({ length: count }).map((_, i) => (
        <Circle
          key={i}
          center={center}
          radius={baseRadius * (1 + wave + i * 0.5)}
          pathOptions={{
            color: '#2196f3',
            fillColor: '#2196f3',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '2 12',
          }}
        />
      ))}
    </LayerGroup>
  )
}
