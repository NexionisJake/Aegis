import React, { useState } from 'react'
import PropTypes from 'prop-types'
import './DefenderHUD.css'

export default function DefenderHUD({ 
  fuel, 
  time, 
  probability,
  onCalculateDeflection,
  selectedAsteroid,
  loading = false
}) {
  const [deltaV, setDeltaV] = useState(100) // m/s
  const [daysFromEpoch, setDaysFromEpoch] = useState(30) // days

  const handleCalculate = () => {
    if (onCalculateDeflection) {
      onCalculateDeflection({
        asteroid_name: selectedAsteroid,
        delta_v_mps: parseFloat(deltaV),
        days_from_epoch: parseFloat(daysFromEpoch)
      })
    }
  }

  return (
    <div className="defender-hud">
      <div className="hud-row">
        <div className="hud-section">
          <span className="hud-label">Fuel</span>
          <div className="hud-bar fuel-bar"><div style={{width: `${fuel}%`}} /></div>
          <span className="hud-value">{fuel}%</span>
        </div>
        <div className="hud-section">
          <span className="hud-label">Time to Impact</span>
          <span className="hud-value">{time}</span>
        </div>
        <div className="hud-section">
          <span className="hud-label">Success Probability</span>
          <div className="hud-bar prob-bar"><div style={{width: `${probability}%`, background: `linear-gradient(90deg, #00e6ff, #e6e6e6)`}} /></div>
          <span className="hud-value">{probability}%</span>
        </div>
      </div>

      {/* Deflection Controls */}
      <div className="deflection-controls">
        <h3 className="controls-title">🛰 Deflection Parameters</h3>
        <div className="control-row">
          <div className="control-group">
            <label htmlFor="delta-v" className="control-label">
              Delta-V (m/s):
              <span className="control-hint">Velocity change to apply</span>
            </label>
            <input
              id="delta-v"
              type="number"
              min="1"
              max="10000"
              step="10"
              value={deltaV}
              onChange={(e) => setDeltaV(e.target.value)}
              className="control-input"
              disabled={loading}
            />
          </div>

          <div className="control-group">
            <label htmlFor="days-from-epoch" className="control-label">
              Time to Deflection (days):
              <span className="control-hint">Days from current epoch</span>
            </label>
            <input
              id="days-from-epoch"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={daysFromEpoch}
              onChange={(e) => setDaysFromEpoch(e.target.value)}
              className="control-input"
              disabled={loading}
            />
          </div>

          <button
            className="calculate-deflection-btn"
            onClick={handleCalculate}
            disabled={loading || !selectedAsteroid}
          >
            {loading ? '⌛ Calculating...' : '🚀 Calculate Deflection'}
          </button>
        </div>
      </div>
    </div>
  )
}

DefenderHUD.propTypes = {
  fuel: PropTypes.number,
  time: PropTypes.string,
  probability: PropTypes.number,
  onCalculateDeflection: PropTypes.func,
  selectedAsteroid: PropTypes.string,
  loading: PropTypes.bool
}
