import React from 'react'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const ImpactMap = ({ impactData, impactCoordinates, onBackTo3D }) => {
  // Use dynamic impact coordinates passed from parent component
  // Default to India coordinates if not provided (fallback safety)
  const coordinates = impactCoordinates || [20.5937, 78.9629]
  
  // Calculate crater radius in meters for map visualization
  const craterRadiusMeters = impactData?.craterDiameterMeters ? impactData.craterDiameterMeters / 2 : 0

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>


      {/* Impact information panel */}
      {impactData && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          minWidth: '250px'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Impact Analysis</h3>
          <p style={{ margin: '0.25rem 0', color: '#666' }}>
            <strong>Crater Diameter:</strong> {impactData.craterDiameterMeters?.toLocaleString()} meters
          </p>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
            ({(impactData.craterDiameterMeters / 1000)?.toFixed(2)} km)
          </p>
          <p style={{ margin: '0.25rem 0', color: '#666' }}>
            <strong>Impact Energy:</strong> {impactData.impactEnergyJoules?.toExponential(2)} joules
          </p>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
            (Equivalent to {(impactData.impactEnergyJoules / 4.184e15)?.toFixed(1)} megatons TNT)
          </p>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={coordinates}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Impact crater circle */}
        {impactData && craterRadiusMeters > 0 && (
          <Circle
            center={coordinates}
            radius={craterRadiusMeters}
            pathOptions={{
              color: '#ff4444',
              fillColor: '#ff4444',
              fillOpacity: 0.3,
              weight: 2
            }}
          >
            <Popup>
              <div>
                <h4>Impact Crater</h4>
                <p>Diameter: {impactData.craterDiameterMeters?.toLocaleString()} meters</p>
                <p>({(impactData.craterDiameterMeters / 1000)?.toFixed(2)} km)</p>
                <p>Energy: {impactData.impactEnergyJoules?.toExponential(2)} joules</p>
                <p>({(impactData.impactEnergyJoules / 4.184e15)?.toFixed(1)} megatons TNT)</p>
              </div>
            </Popup>
          </Circle>
        )}
      </MapContainer>
    </div>
  )
}

export default ImpactMap