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

// Mock the 3D and Map components to avoid WebGL/Leaflet dependencies
vi.mock('../components/Scene3D', () => ({
  default: ({ trajectory, onSimulateImpact }) => (
    <div data-testid="scene3d">
      <div data-testid="scene3d-info">
        {trajectory ? (
          <div>
            <span data-testid="trajectory-loaded">Trajectory Loaded</span>
            <span data-testid="asteroid-points">{trajectory.asteroid_path?.length || 0} asteroid points</span>
            <span data-testid="earth-points">{trajectory.earth_path?.length || 0} earth points</span>
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
}))

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactData, onBackTo3D }) => (
    <div data-testid="impact-map">
      <div data-testid="impact-info">
        {impactData && (
          <div>
            <span data-testid="impact-data-loaded">Impact Data Loaded</span>
            <span data-testid="crater-diameter">{impactData.craterDiameterMeters}m crater</span>
            <span data-testid="impact-energy">{impactData.impactEnergyJoules}J energy</span>
          </div>
        )}
      </div>
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D View
      </button>
    </div>
  )
}))

describe('End-to-End Integration Tests', () => {
  let mockEnhancedApi

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked API
    const { enhancedApi } = await import('../utils/apiClient')
    mockEnhancedApi = enhancedApi
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Orbital Visualization User Journey', () => {
    it('loads trajectory data and displays 3D visualization on startup', async () => {
      const mockTrajectoryData = {
        asteroid_path: [
          [1.0, 0.5, 0.1],
          [1.1, 0.6, 0.2],
          [1.2, 0.7, 0.3]
        ],
        earth_path: [
          [1.0, 0.0, 0.0],
          [0.9, 0.1, 0.0],
          [0.8, 0.2, 0.0]
        ]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Wait for trajectory to load
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify trajectory data is displayed
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('3 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('3 earth points')

      // Should be in 3D view
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()

      // Verify API call
      expect(mockEnhancedApi.getTrajectory).toHaveBeenCalledWith('Apophis')
    })

    it('handles complete workflow from 3D visualization to impact simulation', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1.0, 0.5, 0.1], [1.1, 0.6, 0.2]],
        earth_path: [[1.0, 0.0, 0.0], [0.9, 0.1, 0.0]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1500,
        impactEnergyJoules: 2.5e15,
        massKg: 4.2e10,
        craterDiameterKm: 1.5,
        impactEnergyMegatons: 597
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify 3D view is active
      const view3DButton = screen.getByText('3D Orbital View')
      const impactMapButton = screen.getByText('Impact Map')
      
      expect(view3DButton).toHaveClass('active')
      expect(impactMapButton).toBeDisabled()

      // Simulate impact
      const simulateButton = screen.getByTestId('simulate-impact')
      expect(simulateButton).not.toBeDisabled()
      
      fireEvent.click(simulateButton)

      // Wait for impact calculation and view switch
      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Should now be in 2D view
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      expect(screen.queryByTestId('scene3d')).not.toBeInTheDocument()

      // Verify impact data is displayed
      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('1500m crater')
      expect(screen.getByTestId('impact-energy')).toHaveTextContent('2500000000000000J energy')

      // Verify view buttons state
      expect(impactMapButton).toHaveClass('active')
      expect(impactMapButton).not.toBeDisabled()

      // Verify API calls
      expect(mockEnhancedApi.getTrajectory).toHaveBeenCalledWith('Apophis')
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledWith({
        diameter_km: 0.34,
        velocity_kps: 7.42
      })
    })

    it('allows switching between 3D and 2D views after impact simulation', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1.0, 0.5, 0.1]],
        earth_path: [[1.0, 0.0, 0.0]]
      }

      const mockImpactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.5e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Complete the workflow to impact view
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Switch back to 3D view using header button
      const view3DButton = screen.getByText('3D Orbital View')
      fireEvent.click(view3DButton)

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()
      expect(view3DButton).toHaveClass('active')

      // Switch back to 2D view using header button
      const impactMapButton = screen.getByText('Impact Map')
      fireEvent.click(impactMapButton)

      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      expect(screen.queryByTestId('scene3d')).not.toBeInTheDocument()
      expect(impactMapButton).toHaveClass('active')

      // Use back button in 2D view
      const backButton = screen.getByTestId('back-to-3d')
      fireEvent.click(backButton)

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()
    })
  })

  describe('Data Flow Verification', () => {
    it('verifies data consistency between backend and frontend visualization', async () => {
      const mockTrajectoryData = {
        asteroid_path: [
          [0.922, 0.191, 0.033],  // Realistic Apophis-like coordinates
          [0.925, 0.195, 0.035],
          [0.928, 0.199, 0.037]
        ],
        earth_path: [
          [1.000, 0.000, 0.000],  // Earth's orbital coordinates
          [0.999, 0.017, 0.000],
          [0.998, 0.035, 0.000]
        ]
      }

      const mockImpactData = {
        craterDiameterMeters: 1234,
        impactEnergyJoules: 1.23e15,
        massKg: 4.56e10,
        craterDiameterKm: 1.234,
        impactEnergyMegatons: 294
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify trajectory data is correctly passed to 3D component
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('3 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('3 earth points')

      // Simulate impact
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Verify impact data is correctly passed to map component
      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('1234m crater')
      expect(screen.getByTestId('impact-energy')).toHaveTextContent('1230000000000000J energy')
    })

    it('maintains state consistency during view transitions', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const mockImpactData = {
        craterDiameterMeters: 2000,
        impactEnergyJoules: 3.0e15
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Complete workflow
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Switch views multiple times
      fireEvent.click(screen.getByText('3D Orbital View'))
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Impact Map'))
      expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()

      fireEvent.click(screen.getByText('3D Orbital View'))
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()

      // Data should persist - no additional API calls
      expect(mockEnhancedApi.getTrajectory).toHaveBeenCalledTimes(1)
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance Testing', () => {
    it('handles large trajectory datasets efficiently', async () => {
      // Create large trajectory dataset
      const largeTrajectoryData = {
        asteroid_path: Array.from({ length: 1000 }, (_, i) => [
          1.0 + i * 0.001,
          0.5 + i * 0.0005,
          0.1 + i * 0.0001
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
      const renderTime = endTime - startTime

      // Should handle large datasets reasonably quickly (under 2 seconds)
      expect(renderTime).toBeLessThan(2000)

      // Verify data is correctly processed
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('1000 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('1000 earth points')
    })

    it('maintains responsiveness during multiple rapid interactions', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
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

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Rapidly switch views multiple times
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByText('3D Orbital View'))
        fireEvent.click(screen.getByText('Impact Map'))
      }

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // Should remain responsive (under 1 second for 20 view switches)
      expect(interactionTime).toBeLessThan(1000)

      // Should still be in correct final state
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })
  })

  describe('Real NASA API Data Simulation', () => {
    it('handles realistic Apophis orbital data', async () => {
      // Realistic Apophis trajectory data
      const realisticApophisData = {
        asteroid_path: [
          [0.9224, 0.1914, 0.0333],  // Semi-major axis ~0.92 AU
          [0.9230, 0.1920, 0.0335],
          [0.9236, 0.1926, 0.0337],
          [0.9242, 0.1932, 0.0339]
        ],
        earth_path: [
          [1.0000, 0.0000, 0.0000],  // Earth at 1 AU
          [0.9998, 0.0175, 0.0000],
          [0.9993, 0.0349, 0.0000],
          [0.9986, 0.0523, 0.0000]
        ]
      }

      const realisticImpactData = {
        craterDiameterMeters: 3400,      // ~3.4 km crater
        impactEnergyJoules: 1.2e16,      // ~1200 megatons
        massKg: 6.1e10,                  // ~61 billion kg
        craterDiameterKm: 3.4,
        impactEnergyMegatons: 2870
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(realisticApophisData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(realisticImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify realistic trajectory data
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('4 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('4 earth points')

      // Simulate impact
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Verify realistic impact results
      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('3400m crater')
      expect(screen.getByTestId('impact-energy')).toHaveTextContent('12000000000000000J energy')

      // Verify correct API parameters for Apophis
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledWith({
        diameter_km: 0.34,  // Apophis diameter
        velocity_kps: 7.42  // Typical encounter velocity
      })
    })

    it('simulates various asteroid sizes and impact scenarios', async () => {
      const testScenarios = [
        {
          name: 'Small Asteroid',
          trajectory: {
            asteroid_path: [[1.1, 0.1, 0.01]],
            earth_path: [[1.0, 0.0, 0.0]]
          },
          impact: {
            craterDiameterMeters: 150,
            impactEnergyJoules: 1.5e12
          },
          params: { diameter_km: 0.05, velocity_kps: 15.0 }
        },
        {
          name: 'Large Asteroid',
          trajectory: {
            asteroid_path: [[2.5, 0.3, 0.15]],
            earth_path: [[1.0, 0.0, 0.0]]
          },
          impact: {
            craterDiameterMeters: 15000,
            impactEnergyJoules: 1.5e18
          },
          params: { diameter_km: 2.0, velocity_kps: 20.0 }
        }
      ]

      for (const scenario of testScenarios) {
        mockEnhancedApi.getTrajectory.mockResolvedValue(scenario.trajectory)
        mockEnhancedApi.calculateImpact.mockResolvedValue(scenario.impact)

        const { unmount } = render(<App />)

        await waitFor(() => {
          expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByTestId('simulate-impact'))

        await waitFor(() => {
          expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
        })

        // Verify scenario-specific results
        expect(screen.getByTestId('crater-diameter')).toHaveTextContent(
          `${scenario.impact.craterDiameterMeters}m crater`
        )

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('Cross-Browser Compatibility Simulation', () => {
    it('handles different viewport sizes', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should still render correctly on mobile
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('Impact Map')).toBeInTheDocument()

      // Simulate desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      })

      // Should still work correctly
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })

    it('gracefully handles missing browser features', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock missing performance API
      const originalPerformance = window.performance
      delete window.performance

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should still work without performance API
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()

      // Restore performance API
      window.performance = originalPerformance
    })
  })

  describe('Application State Management', () => {
    it('maintains consistent state across component re-renders', async () => {
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

      const { rerender } = render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Force re-render
      rerender(<App />)

      // State should be maintained
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()

      // Switch to 3D view
      fireEvent.click(screen.getByText('3D Orbital View'))
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()

      // Force another re-render
      rerender(<App />)

      // Should still be in 3D view with data
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    it('handles rapid state changes gracefully', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
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

      // Rapidly trigger multiple state changes
      await act(async () => {
        fireEvent.click(screen.getByTestId('simulate-impact'))
        fireEvent.click(screen.getByText('3D Orbital View'))
        fireEvent.click(screen.getByText('Impact Map'))
      })

      // Should eventually settle in a consistent state
      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })
  })
})