import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'

// Mock the enhanced API client
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getTrajectory: vi.fn(),
    calculateImpact: vi.fn(),
    getCircuitBreakerState: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 }))
  },
  api: {
    getTrajectory: vi.fn(),
    calculateImpact: vi.fn()
  },
  APIError: class APIError extends Error {
    constructor(message, status) {
      super(message)
      this.status = status
    }
  },
  NetworkError: class NetworkError extends Error {},
  TimeoutError: class TimeoutError extends Error {}
}))

const mockEnhancedApi = {
  getTrajectory: vi.fn(),
  calculateImpact: vi.fn(),
  getCircuitBreakerState: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 }))
}

// Mock the 3D and Map components with performance tracking
vi.mock('../components/Scene3D', () => ({
  default: ({ trajectory, onSimulateImpact }) => {
    const renderStart = performance.now()
    
    // Simulate processing time based on data size
    if (trajectory && trajectory.asteroid_path) {
      const processingTime = trajectory.asteroid_path.length * 0.001 // 1ms per point
      const endTime = renderStart + processingTime
      while (performance.now() < endTime) {
        // Simulate processing
      }
    }
    
    return (
      <div data-testid="scene3d">
        <div data-testid="scene3d-info">
          {trajectory ? (
            <div>
              <span data-testid="trajectory-loaded">Trajectory Loaded</span>
              <span data-testid="asteroid-points">{trajectory.asteroid_path?.length || 0} points</span>
              <span data-testid="render-time">{(performance.now() - renderStart).toFixed(2)}ms</span>
            </div>
          ) : (
            <span data-testid="no-trajectory">No trajectory data</span>
          )}
        </div>
        <button onClick={onSimulateImpact} data-testid="simulate-impact" disabled={!trajectory}>
          Simulate Impact
        </button>
      </div>
    )
  }
}))

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactData, onBackTo3D }) => {
    const renderStart = performance.now()
    
    return (
      <div data-testid="impact-map">
        <div data-testid="impact-info">
          {impactData && (
            <div>
              <span data-testid="impact-data-loaded">Impact Data Loaded</span>
              <span data-testid="crater-size">{impactData.craterDiameterMeters}m</span>
              <span data-testid="map-render-time">{(performance.now() - renderStart).toFixed(2)}ms</span>
            </div>
          )}
        </div>
        <button onClick={onBackTo3D} data-testid="back-to-3d">
          Back to 3D View
        </button>
      </div>
    )
  }
}))

describe('Performance Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked API
    const { enhancedApi } = await import('../utils/apiClient')
    Object.assign(mockEnhancedApi, enhancedApi)
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Large Dataset Performance Tests', () => {
    it('handles large trajectory datasets efficiently', async () => {
      // Create large trajectory dataset (1000 points)
      const largeTrajectoryData = {
        asteroid_path: Array.from({ length: 1000 }, (_, i) => [
          Math.sin(i * 0.01) * (1 + i * 0.001),
          Math.cos(i * 0.01) * (1 + i * 0.001),
          i * 0.0001
        ]),
        earth_path: Array.from({ length: 1000 }, (_, i) => [
          Math.cos(i * 0.01),
          Math.sin(i * 0.01),
          0
        ])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(largeTrajectoryData)

      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle large datasets within reasonable time (under 3 seconds)
      expect(totalTime).toBeLessThan(3000)

      // Verify data is correctly processed
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('1000 points')

      // Check render performance
      const renderTimeElement = screen.getByTestId('render-time')
      const renderTime = parseFloat(renderTimeElement.textContent)
      expect(renderTime).toBeLessThan(2000) // Under 2 seconds for rendering
    })

    it('handles extremely large datasets with graceful degradation', async () => {
      // Create very large trajectory dataset (5000 points)
      const veryLargeTrajectoryData = {
        asteroid_path: Array.from({ length: 5000 }, (_, i) => [
          Math.sin(i * 0.001) * (2 + i * 0.0001),
          Math.cos(i * 0.001) * (2 + i * 0.0001),
          Math.sin(i * 0.002) * 0.1
        ]),
        earth_path: Array.from({ length: 5000 }, (_, i) => [
          Math.cos(i * 0.001),
          Math.sin(i * 0.001),
          0
        ])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(veryLargeTrajectoryData)

      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      }, { timeout: 10000 }) // Allow more time for very large datasets

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should still complete within reasonable time (under 10 seconds)
      expect(totalTime).toBeLessThan(10000)

      // Verify data is processed
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('5000 points')
    })

    it('maintains responsiveness during data processing', async () => {
      const largeTrajectoryData = {
        asteroid_path: Array.from({ length: 2000 }, (_, i) => [i, i * 2, i * 3]),
        earth_path: Array.from({ length: 2000 }, (_, i) => [i * 0.5, i, i * 1.5])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(largeTrajectoryData)

      render(<App />)

      // Should show loading state immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // UI should remain responsive - buttons should be clickable
      const viewButtons = screen.getAllByRole('button')
      viewButtons.forEach(button => {
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Memory Usage and Cleanup Tests', () => {
    it('properly cleans up resources when switching views', async () => {
      const mockTrajectoryData = {
        asteroid_path: Array.from({ length: 500 }, (_, i) => [i, i * 2, i * 3]),
        earth_path: Array.from({ length: 500 }, (_, i) => [i * 0.5, i, i * 1.5])
      }

      const mockImpactData = {
        craterDiameterMeters: 1500,
        impactEnergyJoules: 2.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Switch to impact view
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Switch back to 3D view multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('3D Orbital View'))
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Impact Map'))
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      }

      // Should still be responsive after multiple switches
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })

    it('handles memory pressure gracefully', async () => {
      // Simulate multiple large datasets being loaded
      const datasets = Array.from({ length: 3 }, (_, datasetIndex) => ({
        asteroid_path: Array.from({ length: 1000 }, (_, i) => [
          i + datasetIndex * 1000,
          (i + datasetIndex * 1000) * 2,
          (i + datasetIndex * 1000) * 3
        ]),
        earth_path: Array.from({ length: 1000 }, (_, i) => [
          (i + datasetIndex * 1000) * 0.5,
          i + datasetIndex * 1000,
          (i + datasetIndex * 1000) * 1.5
        ])
      }))

      for (let i = 0; i < datasets.length; i++) {
        mockEnhancedApi.getTrajectory.mockResolvedValue(datasets[i])

        const { unmount } = render(<App />)

        await waitFor(() => {
          expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
        })

        // Verify data is loaded
        expect(screen.getByTestId('asteroid-points')).toHaveTextContent('1000 points')

        // Unmount to simulate cleanup
        unmount()
      }

      // Final render should still work
      mockEnhancedApi.getTrajectory.mockResolvedValue(datasets[0])
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })
    })
  })

  describe('Network Performance Tests', () => {
    it('handles slow API responses efficiently', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3], [4, 5, 6]],
        earth_path: [[7, 8, 9], [10, 11, 12]]
      }

      // Simulate slow network (2 second delay)
      mockEnhancedApi.getTrajectory.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockTrajectoryData), 2000)
        )
      )

      const startTime = performance.now()
      render(<App />)

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      }, { timeout: 3000 })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle slow responses gracefully
      expect(totalTime).toBeGreaterThan(2000) // At least the delay time
      expect(totalTime).toBeLessThan(3000) // But not much longer
    })

    it('optimizes API calls to prevent unnecessary requests', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate impact
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Switch views multiple times
      fireEvent.click(screen.getByText('3D Orbital View'))
      fireEvent.click(screen.getByText('Impact Map'))
      fireEvent.click(screen.getByText('3D Orbital View'))

      // Should only make API calls once for each endpoint
      expect(mockEnhancedApi.getTrajectory).toHaveBeenCalledTimes(1)
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledTimes(1)
    })

    it('handles concurrent API requests efficiently', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.0e15
      }

      // Add small delays to simulate real network conditions
      mockEnhancedApi.getTrajectory.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockTrajectoryData), 100)
        )
      )

      mockEnhancedApi.calculateImpact.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockImpactData), 50)
        )
      )

      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Quickly trigger impact simulation
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle sequential requests efficiently
      expect(totalTime).toBeLessThan(1000) // Under 1 second total
    })
  })

  describe('Rendering Performance Tests', () => {
    it('maintains smooth rendering with frequent updates', async () => {
      const mockTrajectoryData = {
        asteroid_path: Array.from({ length: 100 }, (_, i) => [i, i * 2, i * 3]),
        earth_path: Array.from({ length: 100 }, (_, i) => [i * 0.5, i, i * 1.5])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate rapid view changes
      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByText('Impact Map'))
        fireEvent.click(screen.getByText('3D Orbital View'))
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle rapid changes smoothly (under 1 second for 20 switches)
      expect(totalTime).toBeLessThan(1000)

      // Should still be in correct final state
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })

    it('optimizes re-renders to prevent unnecessary updates', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      const { rerender } = render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      const initialRenderTime = screen.getByTestId('render-time').textContent

      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<App />)
      }

      // Render time should not increase significantly with re-renders
      const finalRenderTime = screen.getByTestId('render-time').textContent
      expect(parseFloat(finalRenderTime)).toBeLessThan(parseFloat(initialRenderTime) * 2)
    })

    it('handles window resize events efficiently', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate multiple resize events
      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 800 + i * 100
        })

        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 600 + i * 50
        })

        window.dispatchEvent(new Event('resize'))
      }

      const endTime = performance.now()
      const resizeTime = endTime - startTime

      // Should handle resize events efficiently
      expect(resizeTime).toBeLessThan(500) // Under 0.5 seconds for 10 resizes

      // Should still be functional after resizes
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })

  describe('User Interaction Performance Tests', () => {
    it('responds to user interactions quickly', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Measure interaction response time
      const startTime = performance.now()
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // Should respond to interactions quickly (under 1 second)
      expect(interactionTime).toBeLessThan(1000)
    })

    it('handles rapid user interactions gracefully', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate rapid clicking
      const simulateButton = screen.getByTestId('simulate-impact')

      await act(async () => {
        for (let i = 0; i < 5; i++) {
          fireEvent.click(simulateButton)
        }
      })

      // Should handle rapid interactions without breaking
      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Should only make one API call despite rapid clicking
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledTimes(1)
    })

    it('maintains performance during extended usage', async () => {
      const mockTrajectoryData = {
        asteroid_path: Array.from({ length: 200 }, (_, i) => [i, i * 2, i * 3]),
        earth_path: Array.from({ length: 200 }, (_, i) => [i * 0.5, i, i * 1.5])
      }

      const mockImpactData = {
        craterDiameterMeters: 1500,
        impactEnergyJoules: 2.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate extended usage pattern
      const startTime = performance.now()

      for (let cycle = 0; cycle < 3; cycle++) {
        // View 3D data
        expect(screen.getByTestId('scene3d')).toBeInTheDocument()

        // Simulate impact
        fireEvent.click(screen.getByTestId('simulate-impact'))

        await waitFor(() => {
          expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
        })

        // Go back to 3D
        fireEvent.click(screen.getByText('3D Orbital View'))

        await waitFor(() => {
          expect(screen.getByTestId('scene3d')).toBeInTheDocument()
        })
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should maintain performance during extended usage
      expect(totalTime).toBeLessThan(5000) // Under 5 seconds for 3 complete cycles

      // Should still be responsive
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })
})