import React, { useState } from 'react'
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { BlastRadius, ThermalHalo, TsunamiOverlay, HeatmapLayer, TsunamiWaves } from './ImpactMapLayers.jsx'
import GlossaryPopover from './GlossaryPopover.jsx'
import NarrationBar from './NarrationBar.jsx'

const dummyHeatPoints = [
  [20.6, 78.96, 0.8], [20.7, 78.95, 0.6], [20.5, 78.97, 0.9], [20.8, 78.93, 0.7]
]
const dummyTsunamiPoly = [
  [
    [20.3, 78.7], [20.9, 78.7], [20.9, 79.2], [20.3, 79.2]
  ]
]

const landmarkComparisons = [
  { name: 'Central Park', size: 4000 }, // meters
  { name: 'Colosseum', size: 188 },
  { name: 'Wembley Stadium', size: 315 },
  { name: 'Golden Gate Bridge', size: 2737 },
]

function craterLandmarkText(diameter) {
  if (!diameter) return '';
  const match = landmarkComparisons.find(l => diameter / l.size < 5 && diameter / l.size > 0.5)
  if (match) {
    const times = (diameter / match.size).toFixed(1)
    return `≈ ${times}x ${match.name}`
  }
  return ''
}

function energyComparison(megatons) {
  if (!megatons) return '';
  const hiroshima = 0.015;
  const times = Math.round(megatons / hiroshima);
  if (times > 1) return `~${times}x Hiroshima yield`;
  return '';
}

const narrationText = "Asteroid Impactor-2025 has entered Earth's vicinity... calculating deflection window...";

const ImpactMap = ({ impactData, impactCoordinates, onBackTo3D }) => {
  // Use dynamic impact coordinates passed from parent component
  // Default to India coordinates if not provided (fallback safety)
  const coordinates = impactCoordinates || [20.5937, 78.9629]
  // Calculate crater radius in meters for map visualization
  const craterRadiusMeters = impactData?.craterDiameterMeters ? impactData.craterDiameterMeters / 2 : 0
  const craterDiameter = impactData?.craterDiameterMeters || 0
  const energy = impactData?.impactEnergyMt || 0
  // Example radii for blast/thermal/tsunami
  const blastRadius = craterRadiusMeters * 4
  const thermalRadius = craterRadiusMeters * 7
  const tsunamiRisk = impactData?.isOceanImpact
  // Tooltip/panel state
  const [hovered, setHovered] = useState(null)
  const [panel, setPanel] = useState(null)

  // Animated transition (simple fade/zoom)
  const [showMap, setShowMap] = useState(true)
  React.useEffect(() => {
    setShowMap(false)
    setTimeout(() => setShowMap(true), 400)
  }, [impactCoordinates])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', transition: 'opacity 0.7s, transform 0.7s', opacity: showMap ? 1 : 0, transform: showMap ? 'scale(1)' : 'scale(1.2)' }}>


      {/* Impact information panel & city stats */}
      {panel ? (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1001, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px #0002', padding: 18, minWidth: 260 }}>
          <h4 style={{margin:0}}>{panel.city || 'Location'}</h4>
          <p style={{margin:'6px 0 0 0',fontSize:15}}>Population: {panel.population?.toLocaleString() || 'N/A'}</p>
          <p style={{margin:'2px 0',fontSize:15}}>Risk: <b style={{color:panel.risk==='High'?'#e53935':'#fbc02d'}}>{panel.risk}</b></p>
          <button style={{marginTop:10,background:'#2196f3',color:'#fff',border:'none',borderRadius:5,padding:'6px 14px',fontWeight:700,cursor:'pointer'}} onClick={()=>setPanel(null)}>Close</button>
          <button style={{marginTop:10,marginLeft:10,background:'#eee',color:'#333',border:'none',borderRadius:5,padding:'6px 14px',fontWeight:700,cursor:'pointer'}}>Satellite View</button>
        </div>
      ) : impactData && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'rgba(255, 255, 255, 0.95)', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', minWidth: '250px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Impact Analysis</h3>
          <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Crater Diameter:</strong> {impactData.craterDiameterMeters?.toLocaleString()} meters</p>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>({(impactData.craterDiameterMeters / 1000)?.toFixed(2)} km)</p>
          <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Impact Energy:</strong> {impactData.impactEnergyJoules?.toExponential(2)} joules</p>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>(Equivalent to {(impactData.impactEnergyJoules / 4.184e15)?.toFixed(1)} megatons TNT)</p>
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
            pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.3, weight: 2 }}
            eventHandlers={{
              mouseover: (e) => setHovered({ type: 'crater', ...impactData }),
              mouseout: () => setHovered(null),
              click: () => setPanel({ city: 'Ground Zero', population: 12000, risk: 'High' })
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
        {/* Blast radius */}
        {impactData && blastRadius > 0 && <BlastRadius center={coordinates} radius={blastRadius} />}
        {/* Thermal radiation halo */}
        {impactData && thermalRadius > 0 && <ThermalHalo center={coordinates} radius={thermalRadius} />}
        {/* Tsunami risk overlay (dummy polygon) */}
        {tsunamiRisk && <TsunamiOverlay polygon={dummyTsunamiPoly} />}
        {/* Population heatmap (dummy points) */}
        <HeatmapLayer points={dummyHeatPoints} />
        {/* Animated tsunami waves (for ocean impact) */}
        {tsunamiRisk && <TsunamiWaves center={coordinates} />}
        {/* Data tooltip on hover */}
        {hovered && (
          <Popup position={coordinates}>
            <div>
              <b>{hovered.type === 'crater' ? 'Impact Crater' : 'Zone'}</b><br/>
              Radius: {craterRadiusMeters.toLocaleString()} m<br/>
              Population impacted: 12,000<br/>
              Cities: Nagpur, Wardha<br/>
              Risk: <b style={{color:'#e53935'}}>High</b>
            </div>
          </Popup>
        )}
      </MapContainer>
      {/* Animated transition overlay (optional) */}
      {/* <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',background:'radial-gradient(circle at 50% 50%,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.7) 100%)',opacity:showMap?0:1,transition:'opacity 0.7s'}} /> */}
      <NarrationBar text={narrationText} />
      <div className="impact-map-panel glass-panel">
        <h2>
          Impact Details
        </h2>
        <div>
          <span className="data-label">Crater Diameter</span>: 
          <span className="data-value crater-size numeric">{craterDiameter.toLocaleString()} m</span>
          <GlossaryPopover term="semi-major axis" />
          {craterLandmarkText(craterDiameter) && (
            <span className="infographic">{craterLandmarkText(craterDiameter)}</span>
          )}
        </div>
        <div>
          <span className="data-label">Impact Energy</span>: 
          <span className="data-value energy-value numeric">{energy.toLocaleString()} Mt TNT</span>
          <GlossaryPopover term="megatons TNT" />
          {energyComparison(energy) && (
            <span className="infographic">{energyComparison(energy)}</span>
          )}
        </div>
        {/* Add more terms and popovers as needed */}
        <button onClick={onBackTo3D} className="glass-panel" style={{marginTop:'1.2rem'}}>Back to 3D View</button>
      </div>
    </div>
  )
}

export default ImpactMap