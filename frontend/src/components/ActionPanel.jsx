import PropTypes from 'prop-types'
import './ActionPanel.css'

const ActionPanel = ({ 
  onSimulateImpact, 
  onEnterDefenderMode, 
  view,
  defenderMode,
  loading = false 
}) => {
  return (
    <div className="action-panel">
      <button
        className="action-button simulate-button"
        onClick={onSimulateImpact}
        disabled={loading || view === '2D'}
        title={view === '2D' ? 'Already viewing impact simulation' : 'Calculate and visualize asteroid impact'}
      >
        <span className="button-icon">⚡</span>
        <span className="button-text">Simulate Impact</span>
        {loading && <span className="button-spinner"></span>}
      </button>
      
      <button
        className="action-button defender-button"
        onClick={onEnterDefenderMode}
        disabled={loading}
        title={defenderMode ? 'Exit defender mode' : 'Enter Earth defender mission mode'}
      >
        <span className="button-icon">{defenderMode ? '🛡' : '🛡'}</span>
        <span className="button-text">{defenderMode ? 'Exit Defender Mode' : 'Enter Defender Mode'}</span>
      </button>
    </div>
  )
}

ActionPanel.propTypes = {
  onSimulateImpact: PropTypes.func.isRequired,
  onEnterDefenderMode: PropTypes.func.isRequired,
  view: PropTypes.string.isRequired,
  defenderMode: PropTypes.bool,
  loading: PropTypes.bool
}

export default ActionPanel
