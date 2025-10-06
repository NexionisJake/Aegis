import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MapOverlay = ({ location, impactData, isVisible }) => {
  const [mapCenter, setMapCenter] = useState([0, 0])
  const [craterRadiusMeters, setCraterRadiusMeters] = useState(1000)
  const [blastRadiusMeters, setBlastRadiusMeters] = useState(5000)
  const [initialZoom, setInitialZoom] = useState(8)
  
  useEffect(() => {
    if (location) {
      setMapCenter([location[0], location[1]])
    }
  }, [location])
  
  useEffect(() => {
    if (impactData) {
      // Calculate crater radius (half of diameter)
      const craterRadius = (impactData.craterDiameterMeters || 2000) / 2
      setCraterRadiusMeters(craterRadius)
      
      // Calculate blast radius (empirical formula: ~10x crater radius for major damage)
      const blastRadius = craterRadius * 10
      setBlastRadiusMeters(blastRadius)
      
      // Calculate appropriate zoom level based on blast radius
      // Larger impacts need more zoomed out view
      const blastRadiusKm = blastRadius / 1000
      let zoom
      if (blastRadiusKm > 500) {
        zoom = 6  // Very large impact - country/regional view
      } else if (blastRadiusKm > 200) {
        zoom = 7  // Large impact - regional view
      } else if (blastRadiusKm > 100) {
        zoom = 8  // Medium-large impact - multi-city view
      } else if (blastRadiusKm > 50) {
        zoom = 9  // Medium impact - city view
      } else if (blastRadiusKm > 20) {
        zoom = 10 // Small-medium impact - city district view
      } else {
        zoom = 11 // Small impact - neighborhood view
      }
      setInitialZoom(zoom)
    }
  }, [impactData])
  
  if (!isVisible || !location) {
    return null
  }
  
  return (
    <div className="map-overlay-container">
      <div className="map-overlay-header">
        <h3>📍 Impact Location Detail</h3>
        <div className="coordinates-display">
          {Math.abs(location[0]).toFixed(4)}°{location[0] >= 0 ? 'N' : 'S'}, {' '}
          {Math.abs(location[1]).toFixed(4)}°{location[1] >= 0 ? 'E' : 'W'}
        </div>
      </div>
      
      <MapContainer
        center={mapCenter}
        zoom={initialZoom}
        style={{ width: '100%', height: '500px', borderRadius: '10px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Crater circle - immediate impact zone */}
        <Circle
          center={mapCenter}
          radius={craterRadiusMeters}
          pathOptions={{
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.5,
            weight: 3
          }}
        >
          <Popup>
            <strong>Crater Zone</strong><br />
            Radius: {(craterRadiusMeters / 1000).toFixed(2)} km<br />
            <em>Complete destruction</em>
          </Popup>
        </Circle>
        
        {/* Blast radius circle - major damage zone */}
        <Circle
          center={mapCenter}
          radius={blastRadiusMeters}
          pathOptions={{
            color: '#ff6600',
            fillColor: '#ff6600',
            fillOpacity: 0.2,
            weight: 2
          }}
        >
          <Popup>
            <strong>Blast Damage Zone</strong><br />
            Radius: {(blastRadiusMeters / 1000).toFixed(2)} km<br />
            <em>Severe structural damage</em>
          </Popup>
        </Circle>
        
        {/* Impact epicenter marker */}
        <Marker position={mapCenter}>
          <Popup>
            <strong>💥 Impact Epicenter</strong><br />
            {Math.abs(location[0]).toFixed(4)}°{location[0] >= 0 ? 'N' : 'S'}<br />
            {Math.abs(location[1]).toFixed(4)}°{location[1] >= 0 ? 'E' : 'W'}
          </Popup>
        </Marker>
      </MapContainer>
      
      <div className="impact-statistics">
        <h4>📊 Impact Statistics</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Crater Radius:</span>
            <span className="stat-value">{(craterRadiusMeters / 1000).toFixed(2)} km</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Blast Radius:</span>
            <span className="stat-value">{(blastRadiusMeters / 1000).toFixed(2)} km</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Affected Area:</span>
            <span className="stat-value">
              {(Math.PI * Math.pow(blastRadiusMeters / 1000, 2)).toFixed(2)} km²
            </span>
          </div>
          {impactData?.impactEnergyMegatons && (
            <div className="stat-item">
              <span className="stat-label">Impact Energy:</span>
              <span className="stat-value">{impactData.impactEnergyMegatons.toLocaleString()} Mt</span>
            </div>
          )}
        </div>
        
        <div className="population-estimate">
          <h5>⚠️ Estimated Impact</h5>
          <p className="warning-text">
            The impact zone covers approximately {(Math.PI * Math.pow(blastRadiusMeters / 1000, 2)).toFixed(2)} km² 
            of affected area. Population and infrastructure damage estimates depend on local density.
          </p>
          <p className="info-text">
            <strong>Immediate Crater Zone:</strong> Total devastation within {(craterRadiusMeters / 1000).toFixed(2)} km radius.
            <br />
            <strong>Blast Damage Zone:</strong> Severe structural damage up to {(blastRadiusMeters / 1000).toFixed(2)} km radius.
          </p>
        </div>
      </div>
      
      <style>{`
        .map-overlay-container {
          position: fixed;
          top: 80px;
          right: 20px;
          width: 500px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(15px);
          border-radius: 15px;
          padding: 20px;
          z-index: 1000;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .map-overlay-header {
          margin-bottom: 15px;
        }
        
        .map-overlay-header h3 {
          color: #00ff88;
          margin: 0 0 8px 0;
          font-size: 20px;
        }
        
        .coordinates-display {
          color: #aaa;
          font-family: monospace;
          font-size: 14px;
        }
        
        .impact-statistics {
          margin-top: 15px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .impact-statistics h4 {
          color: #00ff88;
          margin: 0 0 15px 0;
          font-size: 16px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 15px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .stat-label {
          color: #888;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        .stat-value {
          color: #fff;
          font-size: 18px;
          font-weight: bold;
        }
        
        .population-estimate {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .population-estimate h5 {
          color: #ff6600;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        
        .warning-text {
          color: #ffaa00;
          font-size: 13px;
          margin: 8px 0;
          line-height: 1.5;
        }
        
        .info-text {
          color: #ccc;
          font-size: 12px;
          margin: 8px 0;
          line-height: 1.6;
        }
        
        .info-text strong {
          color: #00ff88;
        }
        
        /* Scrollbar styling */
        .map-overlay-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .map-overlay-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .map-overlay-container::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.5);
          border-radius: 10px;
        }
        
        .map-overlay-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 136, 0.7);
        }
        
        @media (max-width: 768px) {
          .map-overlay-container {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default MapOverlay
