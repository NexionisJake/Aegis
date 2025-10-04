import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { enhancedApi } from '../utils/apiClient'

// Mock the enhanced API
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getAsteroid: vi.fn(),
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

describe('Enhanced Data Fetching Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch complete asteroid data before trajectory data', async () => {
    // Mock successful API responses
    const mockAsteroidData = {
      object: {
        fullname: '99942 Apophis (2004 MN4)',
        shortname: '99942 Apophis',
        neo: true,
        pha: true
      },
      orbit: {
        elements: [
          { name: 'a', value: '0.9223803173917017', units: 'au' },
          { name: 'e', value: '0.19116633553869' },
          { name: 'i', value: '3.340958441017069', units: 'deg' }
        ]
      }
    }

    const mockTrajectoryData = {
      asteroid_path: [[1, 0, 0], [0.9, 0.1, 0]],
      earth_path: [[0, 1, 0], [0, 0.9, 0.1]]
    }

    enhancedApi.getAsteroid.mockResolvedValue(mockAsteroidData)
    enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

    render(<App />)

    // Wait for the data fetching to complete
    await waitFor(() => {
      expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(enhancedApi.getTrajectory).toHaveBeenCalledWith('Apophis')
    }, { timeout: 3000 })

    // Verify the order: asteroid data should be fetched before trajectory data
    expect(enhancedApi.getAsteroid).toHaveBeenCalledBefore(enhancedApi.getTrajectory)
  })

  it('should handle asteroid data unavailability with user-friendly messages', async () => {
    // Mock asteroid data fetch failure
    enhancedApi.getAsteroid.mockRejectedValue(new Error('Invalid asteroid data received from NASA API'))
    enhancedApi.getTrajectory.mockResolvedValue({})

    render(<App />)

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Invalid Asteroid Data')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/invalid values.*cannot be used/i)).toBeInTheDocument()
  })

  it('should store full asteroid dataset in state', async () => {
    const mockAsteroidData = {
      object: {
        fullname: '99942 Apophis (2004 MN4)',
        shortname: '99942 Apophis',
        neo: true,
        pha: true,
        orbit_class: { code: 'ATE', name: 'Aten' }
      },
      orbit: {
        elements: [
          { name: 'a', value: '0.9223803173917017', units: 'au' }
        ],
        epoch: '2459215.5'
      },
      signature: { source: 'NASA/JPL Small-Body Database' }
    }

    enhancedApi.getAsteroid.mockResolvedValue(mockAsteroidData)
    enhancedApi.getTrajectory.mockResolvedValue({
      asteroid_path: [[1, 0, 0]],
      earth_path: [[0, 1, 0]]
    })

    render(<App />)

    // Wait for successful data loading
    await waitFor(() => {
      expect(enhancedApi.getAsteroid).toHaveBeenCalled()
    }, { timeout: 3000 })

    // The component should not show loading or error states
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    // Should show the 3D view (indicating successful data loading)
    expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
  })

  it('should handle NASA API limitations gracefully', async () => {
    // Mock API response that doesn't have physical parameters
    const mockLimitedAsteroidData = {
      object: {
        fullname: '1 Ceres',
        shortname: 'Ceres',
        neo: false
      },
      orbit: {
        elements: [
          { name: 'a', value: '2.769', units: 'au' }
        ]
      }
    }

    enhancedApi.getAsteroid.mockResolvedValue(mockLimitedAsteroidData)
    enhancedApi.getTrajectory.mockResolvedValue({
      asteroid_path: [[1, 0, 0]],
      earth_path: [[0, 1, 0]]
    })
    
    // Mock impact calculation to fail due to missing parameters
    enhancedApi.calculateImpact.mockRejectedValue(
      new Error('Diameter data not available for 1 Ceres. The NASA JPL API does not provide physical parameters in the standard response.')
    )

    render(<App />)

    // Wait for data to load
    await waitFor(() => {
      expect(enhancedApi.getAsteroid).toHaveBeenCalled()
    }, { timeout: 3000 })

    // Try to simulate impact (this should fail gracefully)
    const simulateButton = screen.getByText(/simulate impact/i)
    simulateButton.click()

    // Should show appropriate error message
    await waitFor(() => {
      expect(screen.getByText('Limited Asteroid Data')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/NASA JPL API does not provide complete physical parameters/i)).toBeInTheDocument()
  })

  it('should validate asteroid data structure before storing', async () => {
    // Mock invalid asteroid data (missing object field)
    const invalidAsteroidData = {
      orbit: { elements: [] }
      // Missing 'object' field
    }

    enhancedApi.getAsteroid.mockResolvedValue(invalidAsteroidData)

    render(<App />)

    // Should show error for invalid data structure
    await waitFor(() => {
      expect(screen.getByText('Invalid Asteroid Data')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/temporary API issue/i)).toBeInTheDocument()
  })
})