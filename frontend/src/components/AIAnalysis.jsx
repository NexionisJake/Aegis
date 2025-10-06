import React, { useState, useEffect, useCallback } from 'react'
import { enhancedApi, APIError } from '../utils/apiClient'
import './AIAnalysis.css'

const AIAnalysis = ({ asteroidData, impactResults, location }) => {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const analysisData = {
        asteroid_data: asteroidData,
        impact_results: impactResults,
        location: `${location[0].toFixed(2)}°${location[0] >= 0 ? 'N' : 'S'}, ${location[1].toFixed(2)}°${location[1] >= 0 ? 'E' : 'W'}`
      }
      
      const data = await enhancedApi.analyzeImpact(analysisData)
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('AI analysis failed:', err)
      
      if (err instanceof APIError) {
        if (err.status === 503) {
          setError('AI analysis unavailable: Gemini API not configured or server in degraded mode.')
        } else {
          setError(`AI analysis failed: ${err.message}`)
        }
      } else {
        setError('AI analysis temporarily unavailable. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }, [asteroidData, impactResults, location])

  useEffect(() => {
    if (asteroidData && impactResults && location) {
      generateAnalysis()
    }
  }, [asteroidData, impactResults, location, generateAnalysis])

  const formatAnalysis = (text) => {
    if (!text) return []
    
    // Split by lines and process each line
    const lines = text.split('\n').filter(line => line.trim())
    const sections = []
    let currentSection = null
    
    lines.forEach(line => {
      const trimmed = line.trim()
      
      // Check if it's a header (starts with ** or is bold)
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          title: trimmed.replace(/\*\*/g, ''),
          content: []
        }
      } else if (trimmed) {
        if (!currentSection) {
          currentSection = {
            title: 'Analysis',
            content: []
          }
        }
        currentSection.content.push(trimmed)
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }
    
    return sections
  }

  if (loading) {
    return (
      <div className="ai-analysis loading">
        <div className="ai-header">
          <span className="ai-icon">🤖</span>
          <h3>AI Impact Analysis</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <div className="loading-text">
            <p>Analyzing asteroid impact scenario...</p>
            <div className="loading-details">
              <div>🔍 Processing asteroid parameters</div>
              <div>🧮 Calculating impact effects</div>
              <div>🤖 Generating AI insights with Gemini 1.5 Flash</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ai-analysis error">
        <div className="ai-header">
          <span className="ai-icon">🤖</span>
          <h3>AI Impact Analysis</h3>
        </div>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={generateAnalysis}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const analysisSegments = formatAnalysis(analysis)

  return (
    <div className="ai-analysis">
      <div className="ai-header">
        <span className="ai-icon">🤖</span>
        <h3>AI Impact Analysis</h3>
        <span className="powered-by">
          <span className="gemini-logo">💎</span>
          Powered by Gemini 1.5 Flash
        </span>
      </div>
      
      <div className="analysis-content">
        {analysisSegments.length > 0 ? (
          <div className="analysis-sections">
            {analysisSegments.map((section, index) => (
              <div key={index} className="analysis-section">
                <h4 className="section-title">{section.title}</h4>
                <div className="section-content">
                  {section.content.map((line, lineIndex) => (
                    <p key={lineIndex} className="analysis-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="analysis-text">
            {analysis.split('\n').map((line, index) => (
              <p key={index} className="analysis-line">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
      
      <div className="ai-footer">
        <button 
          className="regenerate-btn"
          onClick={generateAnalysis}
          disabled={loading}
        >
          🔄 Generate New Analysis
        </button>
        
        <div className="disclaimer">
          <small>
            ⚠️ AI-generated analysis for educational purposes. 
            Actual impact effects may vary significantly.
          </small>
        </div>
      </div>
    </div>
  )
}

export default AIAnalysis