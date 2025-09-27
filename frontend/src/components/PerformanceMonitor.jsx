import React, { useState, useEffect, useRef } from 'react'
import './PerformanceMonitor.css'

const PerformanceMonitor = ({ enabled = false, trajectory }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    geometryCount: 0,
    triangleCount: 0,
    drawCalls: 0
  })
  
  const metricsRef = useRef({
    frameCount: 0,
    lastTime: performance.now(),
    frameTimes: [],
    maxFrameTimes: 60
  })

  useEffect(() => {
    if (!enabled) return

    let animationId
    
    const updateMetrics = () => {
      const now = performance.now()
      const metrics = metricsRef.current
      
      metrics.frameCount++
      const deltaTime = now - metrics.lastTime
      
      // Calculate FPS
      if (deltaTime >= 1000) {
        const fps = Math.round((metrics.frameCount * 1000) / deltaTime)
        
        // Calculate average frame time
        const avgFrameTime = deltaTime / metrics.frameCount
        metrics.frameTimes.push(avgFrameTime)
        if (metrics.frameTimes.length > metrics.maxFrameTimes) {
          metrics.frameTimes.shift()
        }
        
        const avgFrameTimeSmoothed = metrics.frameTimes.reduce((a, b) => a + b, 0) / metrics.frameTimes.length
        
        // Get memory usage (if available)
        let memoryUsage = 0
        if (performance.memory) {
          memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
        }
        
        // Calculate geometry metrics
        const geometryCount = trajectory ? 
          (trajectory.earth_path?.length || 0) + (trajectory.asteroid_path?.length || 0) : 0
        
        setMetrics({
          fps,
          frameTime: Math.round(avgFrameTimeSmoothed * 100) / 100,
          memoryUsage,
          geometryCount,
          triangleCount: calculateTriangleCount(),
          drawCalls: estimateDrawCalls()
        })
        
        metrics.frameCount = 0
        metrics.lastTime = now
      }
      
      animationId = requestAnimationFrame(updateMetrics)
    }
    
    updateMetrics()
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [enabled, trajectory])

  const calculateTriangleCount = () => {
    // Estimate triangle count based on scene complexity
    let triangles = 0
    
    // Sun sphere (16x16 segments)
    triangles += 16 * 16 * 2
    
    // Earth sphere (16x16 segments)
    triangles += 16 * 16 * 2
    
    // Asteroid sphere (8x8 segments)
    triangles += 8 * 8 * 2
    
    // Trail effect sphere (6x6 segments)
    triangles += 6 * 6 * 2
    
    // Grid helper
    triangles += 20 * 20 * 2
    
    return triangles
  }

  const estimateDrawCalls = () => {
    // Estimate draw calls based on rendered objects
    let drawCalls = 0
    
    drawCalls += 1 // Sun
    drawCalls += 1 // Sun glow
    drawCalls += 1 // Earth
    drawCalls += 1 // Asteroid
    drawCalls += 1 // Trail effect
    drawCalls += 1 // Grid
    
    if (trajectory?.earth_path?.length > 0) drawCalls += 1 // Earth path
    if (trajectory?.asteroid_path?.length > 0) drawCalls += 1 // Asteroid path
    
    return drawCalls
  }

  const getPerformanceStatus = () => {
    if (metrics.fps >= 50) return 'excellent'
    if (metrics.fps >= 30) return 'good'
    if (metrics.fps >= 20) return 'fair'
    return 'poor'
  }

  const getMemoryStatus = () => {
    if (metrics.memoryUsage < 50) return 'excellent'
    if (metrics.memoryUsage < 100) return 'good'
    if (metrics.memoryUsage < 200) return 'fair'
    return 'poor'
  }

  if (!enabled) return null

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <h4>Performance Monitor</h4>
        <div className={`performance-status ${getPerformanceStatus()}`}>
          {getPerformanceStatus().toUpperCase()}
        </div>
      </div>
      
      <div className="performance-metrics">
        <div className="metric-group">
          <div className="metric">
            <span className="metric-label">FPS:</span>
            <span className={`metric-value fps-${getPerformanceStatus()}`}>
              {metrics.fps}
            </span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Frame Time:</span>
            <span className="metric-value">
              {metrics.frameTime}ms
            </span>
          </div>
        </div>
        
        <div className="metric-group">
          <div className="metric">
            <span className="metric-label">Memory:</span>
            <span className={`metric-value memory-${getMemoryStatus()}`}>
              {metrics.memoryUsage}MB
            </span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Geometry Points:</span>
            <span className="metric-value">
              {metrics.geometryCount.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="metric-group">
          <div className="metric">
            <span className="metric-label">Triangles:</span>
            <span className="metric-value">
              {metrics.triangleCount.toLocaleString()}
            </span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Draw Calls:</span>
            <span className="metric-value">
              {metrics.drawCalls}
            </span>
          </div>
        </div>
      </div>
      
      {metrics.fps < 20 && (
        <div className="performance-warning">
          ⚠️ Low performance detected. Consider reducing quality settings.
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitor