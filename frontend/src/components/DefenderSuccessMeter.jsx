import React from 'react'
import './DefenderSuccessMeter.css'

export default function DefenderSuccessMeter({ score }) {
  // score: 0-100
  const color = score > 80 ? '#00e676' : score > 50 ? '#ffee58' : '#e53935'
  return (
    <div className="defender-success-meter">
      <div className="meter-label">Mission Success</div>
      <div className="meter-bar" style={{background: 'linear-gradient(90deg, #00e676, #ffee58, #e53935)'}}>
        <div className="meter-fill" style={{width: `${score}%`, background: color}} />
      </div>
      <div className="meter-score">{score}%</div>
    </div>
  )
}
