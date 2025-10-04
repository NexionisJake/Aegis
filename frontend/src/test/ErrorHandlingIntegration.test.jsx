import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import App from '../App'

// Mock the enhanced API client
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getTrajectory: vi.fn(),
    getAsteroid: vi.fn(),
    calculateImpact: vi.fn(),
    getCircuitBreakerState: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 }))
  },
  api: {
    getTrajectory: vi.fn(),
    getAsteroid: vi.fn(),
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
  getAsteroid: vi.fn(),
  calculateImpact: vi.fn(),
  getCircuitBreakerState: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 }))
}

// Mock the 3D and Map components to avoid WebGL/Leaflet dependencies
vi.mock('../components/Scene3D', () => ({
  default: ({ trajectory, onSimulateImpact }) => (
    <div data-testid="scene3d">
      <span>Scene3D Component</span>
      {trajectory && <span data-testid="trajectory-loaded">Trajectory Loaded</span>}
      <button onClick={onSimulateImpact} data-testid="simulate-impact">
        Simulate Impact
      </button>
    </div>
  )
}))

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactData, onBackTo3D }) => (
    <div data-testid="impact-map">
      <span>ImpactMap Component</span>
      {impactData && <span data-testid="impact-data-loaded">Impact Data Loaded</span>}
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D
      </button>
    </div>
  )
}))

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network Error Scenarios', () => {
    it('handles connection errors gracefully', async () => {
      const { NetworkError } = await import('../utils/apiClient')
      const connectionError = new NetworkError('Network Error')
      
      mockEnhancedApi.getAsteroid.mockRejectedValue(connectionError)
      mockEnhancedApi.getTrajectory.mockRejectedValue(connectionError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument()
      })

      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument()
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument()
      expect(screen.getByText('Disable any VPN or proxy')).toBeInTheDocument()
    })

    it('handles timeout errors with appropriate messaging', async () => {
      const { TimeoutError } = await import('../utils/apiClient')
      const timeoutError = new TimeoutError('timeout of 30000ms exceeded')
      
      mockEnhancedApi.getAsteroid.mockRejectedValue(timeoutError)
      mockEnhancedApi.getTrajectory.mockRejectedValue(timeoutError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Request Timeout')).toBeInTheDocument()
      })

      expect(screen.getByText(/The request is taking longer than expected/)).toBeInTheDocument()
    })

    it('provides retry functionality for network errors', async () => {
      const networkError = new Error('Network Error')
      networkError.code = 'ECONNRESET'
      
      // First calls fail, then both succeed
      mockApiClient.get
        .mockRejectedValueOnce(networkError)  // First asteroid call fails
        .mockRejectedValueOnce(networkError)  // First trajectory call fails
        .mockResolvedValueOnce({              // Second asteroid call succeeds
          data: {
            phys_par: [
              { name: 'diameter', value: '0.34', unit: 'km' }
            ],
            orbit: {
              close_approach_data: [
                { v_rel: '7.42', date: '2029-04-13' }
              ]
            }
          }
        })
        .mockResolvedValueOnce({              // Second trajectory call succeeds
          data: {
            asteroid_path: [[1, 2, 3]],
            earth_path: [[4, 5, 6]]
          }
        })

      render(<App />)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText(/Retry/)
      fireEvent.click(retryButton)

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      expect(screen.queryByText('Connection Problem')).not.toBeInTheDocument()
    })
  })

  describe('API Error Scenarios', () => {
    it('handles 404 asteroid not found errors', async () => {
      const notFoundError = new Error('Request failed')
      notFoundError.response = {
        status: 404,
        data: {
          message: 'Asteroid not found in NASA database',
          error_code: 'NOT_FOUND'
        }
      }
      mockApiClient.get.mockRejectedValue(notFoundError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Asteroid Not Found')).toBeInTheDocument()
      })

      expect(screen.getByText(/The requested asteroid could not be found/)).toBeInTheDocument()
    })

    it('handles 429 rate limit errors with appropriate guidance', async () => {
      const rateLimitError = new Error('Request failed')
      rateLimitError.response = {
        status: 429,
        data: {
          message: 'NASA API rate limit exceeded. Please try again later.',
          error_code: 'RATE_LIMIT'
        }
      }
      mockApiClient.get.mockRejectedValue(rateLimitError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Too Many Requests')).toBeInTheDocument()
      })

      expect(screen.getByText(/The NASA API is currently rate-limited/)).toBeInTheDocument()
      expect(screen.getByText(/Please wait a few moments before trying again/)).toBeInTheDocument()
    })

    it('handles 503 service unavailable errors', async () => {
      const serviceError = new Error('Request failed')
      serviceError.response = {
        status: 503,
        data: {
          message: 'NASA API is temporarily unavailable',
          error_code: 'SERVICE_UNAVAILABLE'
        }
      }
      mockApiClient.get.mockRejectedValue(serviceError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Service Unavailable')).toBeInTheDocument()
      })

      expect(screen.getByText(/The NASA API is temporarily unavailable/)).toBeInTheDocument()
    })
  })

  describe('Impact Calculation Error Scenarios', () => {
    it('handles impact calculation errors while preserving trajectory data', async () => {
      // Successful asteroid and trajectory fetch
      mockApiClient.get
        .mockResolvedValueOnce({  // Asteroid data
          data: {
            phys_par: [
              { name: 'diameter', value: '0.34', unit: 'km' }
            ],
            orbit: {
              close_approach_data: [
                { v_rel: '7.42', date: '2029-04-13' }
              ]
            }
          }
        })
        .mockResolvedValueOnce({  // Trajectory data
          data: {
            asteroid_path: [[1, 2, 3]],
            earth_path: [[4, 5, 6]]
          }
        })

      // Failed impact calculation
      const impactError = new Error('Request failed')
      impactError.response = {
        status: 422,
        data: {
          message: 'Invalid impact parameters',
          error_code: 'VALIDATION_ERROR'
        }
      }
      mockApiClient.post.mockRejectedValue(impactError)

      render(<App />)

      // Wait for trajectory to load
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Try to simulate impact
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)

      // Should show error but remain in 3D view
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })

      expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()
    })
  })

  describe('Retry Mechanism', () => {
    it('tracks retry attempts and disables after max retries', async () => {
      const persistentError = new Error('Persistent failure')
      persistentError.response = { status: 500 }
      mockApiClient.get.mockRejectedValue(persistentError)

      render(<App />)

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })

      // First retry
      let retryButton = screen.getByText(/Retry/)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/Retry \(1\/3\)/)).toBeInTheDocument()
      })

      // Second retry
      retryButton = screen.getByText(/Retry \(1\/3\)/)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/Retry \(2\/3\)/)).toBeInTheDocument()
      })

      // Third retry
      retryButton = screen.getByText(/Retry \(2\/3\)/)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Max Retries Reached')).toBeInTheDocument()
      })

      // Button should be disabled
      const maxRetriesButton = screen.getByText('Max Retries Reached')
      expect(maxRetriesButton).toBeDisabled()

      // Help message should appear
      expect(screen.getByText(/If the problem persists/)).toBeInTheDocument()
    })

    it('resets retry count on successful recovery', async () => {
      const temporaryError = new Error('Temporary failure')
      temporaryError.response = { status: 500 }

      // First calls fail, then both succeed
      mockApiClient.get
        .mockRejectedValueOnce(temporaryError)  // First asteroid call fails
        .mockRejectedValueOnce(temporaryError)  // First trajectory call fails
        .mockResolvedValueOnce({                // Second asteroid call succeeds
          data: {
            phys_par: [
              { name: 'diameter', value: '0.34', unit: 'km' }
            ],
            orbit: {
              close_approach_data: [
                { v_rel: '7.42', date: '2029-04-13' }
              ]
            }
          }
        })
        .mockResolvedValueOnce({                // Second trajectory call succeeds
          data: {
            asteroid_path: [[1, 2, 3]],
            earth_path: [[4, 5, 6]]
          }
        })

      render(<App />)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })

      // Retry and succeed
      const retryButton = screen.getByText(/Retry/)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Error should be gone
      expect(screen.queryByText('API Error')).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator during initial fetch', async () => {
      // Create a promise that we can control
      let resolvePromise
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockApiClient.get.mockReturnValue(pendingPromise)

      render(<App />)

      // Should show loading immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Resolve the promise
      resolvePromise({
        data: {
          asteroid_path: [[1, 2, 3]],
          earth_path: [[4, 5, 6]]
        }
      })

      // Loading should disappear
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })

    it('shows loading during retry attempts', async () => {
      const error = new Error('Temporary error')
      error.response = { status: 500 }

      mockApiClient.get
        .mockRejectedValueOnce(error)
        .mockImplementationOnce(() => {
          // Return a pending promise for the retry
          return new Promise(() => {}) // Never resolves
        })

      render(<App />)

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByText(/Retry/)
      fireEvent.click(retryButton)

      // Should show loading during retry
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Error Recovery Workflows', () => {
    it('handles complete error-to-success workflow', async () => {
      const networkError = new Error('Network failure')
      networkError.code = 'ECONNRESET'

      const trajectoryData = {
        asteroid_path: [[1, 2, 3]],
        earth_path: [[4, 5, 6]]
      }

      const impactData = {
        craterDiameterMeters: 1000,
        impactEnergyJoules: 1.5e15
      }

      // Initial failure, then success for both calls
      mockApiClient.get
        .mockRejectedValueOnce(networkError)  // First asteroid call fails
        .mockRejectedValueOnce(networkError)  // First trajectory call fails
        .mockResolvedValueOnce({              // Second asteroid call succeeds
          data: {
            phys_par: [
              { name: 'diameter', value: '0.34', unit: 'km' }
            ],
            orbit: {
              close_approach_data: [
                { v_rel: '7.42', date: '2029-04-13' }
              ]
            }
          }
        })
        .mockResolvedValueOnce({ data: trajectoryData })  // Second trajectory call succeeds
      
      mockApiClient.post.mockResolvedValue({ data: impactData })

      render(<App />)

      // Should show network error initially
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument()
      })

      // Retry and succeed
      const retryButton = screen.getByText(/Retry/)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Now simulate impact
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Should be in 2D view now
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      expect(screen.queryByTestId('scene3d')).not.toBeInTheDocument()
    })
  })

  describe('Page Reload Functionality', () => {
    it('provides reload option for persistent errors', async () => {
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      const persistentError = new Error('Persistent error')
      persistentError.response = { status: 500 }
      mockApiClient.get.mockRejectedValue(persistentError)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })

      const reloadButton = screen.getByText('Reload Page')
      fireEvent.click(reloadButton)

      expect(mockReload).toHaveBeenCalledOnce()
    })
  })
})