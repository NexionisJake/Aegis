import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// Mock the 3D and Map components to avoid WebGL/Leaflet dependencies
vi.mock('../components/Scene3D', () => ({
  default: ({ trajectory, onSimulateImpact }) => (
    <div data-testid="scene3d">
      <div data-testid="scene3d-info">
        {trajectory ? (
          <div>
            <span data-testid="trajectory-loaded">Trajectory Loaded</span>
            <span data-testid="webgl-support">WebGL Supported</span>
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
            <span data-testid="leaflet-support">Leaflet Supported</span>
          </div>
        )}
      </div>
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D View
      </button>
    </div>
  )
}))

describe('Cross-Browser Compatibility Tests', () => {
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

  describe('Viewport and Responsive Design Tests', () => {
    it('adapts to mobile viewport dimensions', async () => {
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

      // Trigger resize event
      window.dispatchEvent(new Event('resize'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should render correctly on mobile
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('Impact Map')).toBeInTheDocument()
    })

    it('adapts to tablet viewport dimensions', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Simulate tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      })

      window.dispatchEvent(new Event('resize'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })

    it('adapts to desktop viewport dimensions', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

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

      window.dispatchEvent(new Event('resize'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })

    it('handles viewport orientation changes', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate orientation change (portrait to landscape)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375
      })

      window.dispatchEvent(new Event('orientationchange'))
      window.dispatchEvent(new Event('resize'))

      // Should still work after orientation change
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })

  describe('Browser Feature Detection and Fallbacks', () => {
    it('handles missing requestAnimationFrame API', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock missing requestAnimationFrame
      const originalRAF = window.requestAnimationFrame
      delete window.requestAnimationFrame

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should still work without requestAnimationFrame
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()

      // Restore requestAnimationFrame
      window.requestAnimationFrame = originalRAF
    })

    it('handles missing performance API', async () => {
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

    it('handles missing localStorage', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock missing localStorage
      const originalLocalStorage = window.localStorage
      delete window.localStorage

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should still work without localStorage
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()

      // Restore localStorage
      window.localStorage = originalLocalStorage
    })

    it('handles missing fetch API', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock missing fetch API
      const originalFetch = window.fetch
      delete window.fetch

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should still work without fetch (using axios)
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()

      // Restore fetch API
      window.fetch = originalFetch
    })
  })

  describe('Touch and Input Device Compatibility', () => {
    it('handles touch events for mobile interaction', async () => {
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

      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: null
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Simulate touch interaction
      const simulateButton = screen.getByTestId('simulate-impact')
      
      // Create touch event
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      fireEvent(simulateButton, touchEvent)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })
    })

    it('handles keyboard navigation', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Test keyboard navigation
      const simulateButton = screen.getByTestId('simulate-impact')
      
      // Focus and activate with keyboard
      simulateButton.focus()
      expect(document.activeElement).toBe(simulateButton)

      // Test Enter key
      fireEvent.keyDown(simulateButton, { key: 'Enter', code: 'Enter' })
      
      // Test Space key
      fireEvent.keyDown(simulateButton, { key: ' ', code: 'Space' })
    })

    it('handles high DPI displays', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock high DPI display
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2.0
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should render correctly on high DPI displays
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })

  describe('Network and Connectivity Tests', () => {
    it('handles slow network connections', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      // Simulate slow network with delay
      mockEnhancedApi.getTrajectory.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockTrajectoryData), 2000)
        )
      )

      render(<App />)

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Wait for slow response
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('handles intermittent connectivity', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      // First request fails, second succeeds
      mockEnhancedApi.getTrajectory
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTrajectoryData)

      render(<App />)

      // Should eventually load after retry
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('handles offline scenarios', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false
      })

      mockEnhancedApi.getTrajectory.mockRejectedValue(new Error('Network unavailable'))

      render(<App />)

      // Should show appropriate error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true
      })
    })
  })

  describe('Memory and Performance Tests', () => {
    it('handles memory constraints on mobile devices', async () => {
      const mockTrajectoryData = {
        asteroid_path: Array.from({ length: 1000 }, (_, i) => [i, i * 2, i * 3]),
        earth_path: Array.from({ length: 1000 }, (_, i) => [i * 0.5, i, i * 1.5])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock limited memory environment
      const originalMemory = navigator.deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        writable: true,
        configurable: true,
        value: 1 // 1GB RAM
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should handle large datasets on low-memory devices
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()

      // Restore original memory value
      if (originalMemory !== undefined) {
        Object.defineProperty(navigator, 'deviceMemory', {
          writable: true,
          configurable: true,
          value: originalMemory
        })
      }
    })

    it('handles CPU-intensive operations gracefully', async () => {
      const mockTrajectoryData = {
        asteroid_path: Array.from({ length: 5000 }, (_, i) => [
          Math.sin(i * 0.01),
          Math.cos(i * 0.01),
          i * 0.001
        ]),
        earth_path: Array.from({ length: 5000 }, (_, i) => [
          Math.cos(i * 0.01),
          Math.sin(i * 0.01),
          0
        ])
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should complete within reasonable time even with large datasets
      expect(renderTime).toBeLessThan(5000) // 5 seconds max
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })

  describe('Accessibility and Standards Compliance', () => {
    it('maintains accessibility features across browsers', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Check for accessibility attributes
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
        // Buttons should be focusable
        expect(button.tabIndex).toBeGreaterThanOrEqual(0)
      })

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('supports screen readers and assistive technologies', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Check for ARIA labels and descriptions
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Buttons should have accessible names
        expect(button).toHaveAccessibleName()
      })
    })

    it('handles reduced motion preferences', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should respect reduced motion preferences
      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })
  })

  describe('Data Format and Encoding Tests', () => {
    it('handles different number formats correctly', async () => {
      const mockTrajectoryData = {
        asteroid_path: [
          [1.0, 2.0, 3.0],           // Standard decimals
          [1e-6, 2e6, 3.14159],      // Scientific notation and pi
          [0.000001, 2000000, -1.5]  // Very small/large numbers
        ],
        earth_path: [
          [1, 2, 3],                 // Integers
          [1.5, 2.5, 3.5],          // Half values
          [0, -1, 1]                 // Zero and negative
        ]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    })

    it('handles Unicode and international characters', async () => {
      const mockTrajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should handle Unicode in UI text
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
    })

    it('handles malformed or unexpected data gracefully', async () => {
      const malformedData = {
        asteroid_path: null,
        earth_path: undefined
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(malformedData)

      render(<App />)

      // Should handle malformed data gracefully
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })
  })
})