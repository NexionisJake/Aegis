import React from 'react'
import './DefenderTechCards.css'

const techs = [
  { name: 'Kinetic Impactor', cost: 120, time: '2d', chance: 65, desc: 'Direct hit with a high-speed probe.' },
  { name: 'Nuclear Option', cost: 300, time: '1d', chance: 85, desc: 'Detonate a nuke near the asteroid.' },
  { name: 'Gravity Tractor', cost: 80, time: '7d', chance: 40, desc: 'Use a heavy spacecraft to tug the asteroid.' }
]

export default function DefenderTechCards({ onSelect, selected }) {
  return (
    <div className="defender-tech-cards">
      {techs.map(t => (
        <div
          key={t.name}
          className={`tech-card${selected === t.name ? ' selected' : ''}`}
          onClick={() => onSelect(t.name)}
        >
          <h4>{t.name}</h4>
          <div className="tech-desc">{t.desc}</div>
          <div className="tech-stats">
            <span>💰 {t.cost}M</span>
            <span>⏱ {t.time}</span>
            <span>🎯 {t.chance}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}
