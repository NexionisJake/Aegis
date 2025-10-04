import React, { useState, useEffect } from 'react'
import './AegisControls.css'

const AegisControls = ({ 
  trajectory, 
  asteroidData, 
  onSimulateImpact, 
  onViewChange, 
  currentView, 
  loading,
  impactData 
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [simulationStatus, setSimulationStatus] = useState('ready')

  // Extract asteroid info for display
  const asteroidInfo = trajectory ? {
    name: trajectory.object_name || 'Unknown Asteroid',
    diameter: asteroidData?.phys_par?.find(p => p.name?.toLowerCase().includes('diameter'))?.value || 'Unknown',
    velocity: trajectory.velocity || 'Unknown',
    distance: trajectory.distance || 'Unknown'
  } : null

  const handleImpactSimulation = async () => {
    setSimulationStatus('calculating')
    try {
      await onSimulateImpact()
      setSimulationStatus('complete')
    } catch (error) {
      setSimulationStatus('error')
    }
  }

  const formatValue = (value, unit = '') => {
    if (!value || value === 'Unknown') return 'Unknown'
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit}`.trim()
    }
    return `${value} ${unit}`.trim()
  }

  return (
    <div className={`aegis-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="controls-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <span className="shield-icon">🛡️</span>
          Aegis Command Center
        </h3>
        <button className="expand-toggle">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="controls-content">
          {/* Asteroid Information Panel */}
          {asteroidInfo && (
            <div className="info-panel">
              <h4><span className="icon">🌌</span>Target Object</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name:</span>
                  <span className="value primary">{asteroidInfo.name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Diameter:</span>
                  <span className="value">{formatValue(asteroidInfo.diameter, 'km')}</span>
                </div>
                <div className="info-item">
                  <span className="label">Velocity:</span>
                  <span className="value">{formatValue(asteroidInfo.velocity, 'km/s')}</span>
                </div>
                <div className="info-item">
                  <span className="label">Distance:</span>
                  <span className="value">{formatValue(asteroidInfo.distance, 'AU')}</span>
                </div>
              </div>
            </div>
          )}

          {/* View Controls */}
          <div className="view-panel">
            <h4><span className="icon">👁️</span>Visualization Mode</h4>
            <div className="view-buttons">
              <button 
                className={`view-btn ${currentView === '3D' ? 'active' : ''}`}
                onClick={() => onViewChange('3D')}
                disabled={loading}
              >
                <span className="btn-icon">🌍</span>
                <span className="btn-text">3D Orbital</span>
              </button>
              <button 
                className={`view-btn ${currentView === '2D' ? 'active' : ''}`}
                onClick={() => onViewChange('2D')}
                disabled={loading || !impactData}
              >
                <span className="btn-icon">🗺️</span>
                <span className="btn-text">Impact Map</span>
              </button>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="simulation-panel">
            <h4><span className="icon">⚡</span>Impact Simulation</h4>
            <button 
              className={`impact-btn ${simulationStatus}`}
              onClick={handleImpactSimulation}
              disabled={loading || !asteroidData || simulationStatus === 'calculating'}
            >
              <span className="impact-icon">
                {simulationStatus === 'calculating' ? '⏱️' : 
                 simulationStatus === 'complete' ? '✅' : 
                 simulationStatus === 'error' ? '❌' : '💥'}
              </span>
              <span className="impact-text">
                {simulationStatus === 'calculating' ? 'Calculating Impact...' :
                 simulationStatus === 'complete' ? 'Simulation Complete' :
                 simulationStatus === 'error' ? 'Simulation Failed' :
                 'Simulate Earth Impact'}
              </span>
            </button>
            
            {simulationStatus === 'complete' && impactData && (
              <div className="impact-summary">
                <div className="summary-item">
                  <span className="summary-label">Crater Diameter:</span>
                  <span className="summary-value">{formatValue(impactData.crater_diameter, 'km')}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Energy Released:</span>
                  <span className="summary-value">{formatValue(impactData.energy_megatons, 'MT')}</span>
                </div>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="status-panel">
            <h4><span className="icon">📊</span>System Status</h4>
            <div className="status-indicators">
              <div className={`status-item ${trajectory ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span className="status-text">Orbital Data</span>
              </div>
              <div className={`status-item ${asteroidData ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span className="status-text">Physical Parameters</span>
              </div>
              <div className={`status-item ${impactData ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span className="status-text">Impact Simulation</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AegisControls