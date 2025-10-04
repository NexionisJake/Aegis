import React from 'react'
import './DefenderLeaderboard.css'

const dummyScores = [
  { name: 'You', time: '1d 2h', cost: 120, score: 92 },
  { name: 'Alex', time: '1d 4h', cost: 140, score: 88 },
  { name: 'Sam', time: '2d 0h', cost: 80, score: 70 }
]

export default function DefenderLeaderboard() {
  return (
    <div className="defender-leaderboard">
      <h4>Leaderboard</h4>
      <table>
        <thead>
          <tr><th>Name</th><th>Time</th><th>Cost</th><th>Score</th></tr>
        </thead>
        <tbody>
          {dummyScores.map((s, i) => (
            <tr key={i}>
              <td>{s.name}</td>
              <td>{s.time}</td>
              <td>${s.cost}M</td>
              <td>{s.score}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
