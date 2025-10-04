import React from 'react'
import './DefenderHUD.css'

export default function DefenderHUD({ fuel, time, probability }) {
  return (
    <div className="defender-hud">
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
  )
}
