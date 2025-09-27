import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import App from './App'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock the components to avoid Three.js and Leaflet dependencies in tests
vi.mock('./components/Scene3D', () => ({
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

vi.mock('./components/ImpactMap', () => ({
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

// Mock data
const mockTrajectoryData = {
  asteroid_path: [[1, 2, 3], [4, 5, 6]],
  earth_path: [[7, 8, 9], [10, 11, 12]]
}

const mockImpactData = {
  craterDiameterMeters: 1000,
  impactEnergyJoules: 1.5e15
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders app header and controls', () => {
    // Mock successful trajectory fetch
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn()
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
    expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
    expect(screen.getByText('Impact Map')).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    // Mock pending API call that never resolves
    let resolvePromise
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    const mockApiClient = {
      get: vi.fn().mockReturnValue(pendingPromise),
      post: vi.fn()
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    // Should show loading state immediately
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Clean up by resolving the promise
    resolvePromise({ data: mockTrajectoryData })
  })

  it('loads trajectory data on mount', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn()
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    expect(mockApiClient.get).toHaveBeenCalledWith('/trajectory/Apophis')
  })

  it('handles trajectory loading error', async () => {
    const mockApiClient = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
      post: vi.fn()
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })

  it('has proper initial state after loading', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn()
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    // 3D view button should be active initially
    const view3DButton = screen.getByText('3D Orbital View')
    expect(view3DButton).toHaveClass('active')
    
    // Impact map button should be disabled initially (no impact data)
    const impactMapButton = screen.getByText('Impact Map')
    expect(impactMapButton).toBeDisabled()
  })

  it('completes impact simulation workflow from 3D to 2D view', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn().mockResolvedValue({ data: mockImpactData })
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    // Wait for trajectory to load
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    // Should show 3D view initially
    expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()

    // Click simulate impact button
    const simulateButton = screen.getByTestId('simulate-impact')
    fireEvent.click(simulateButton)

    // Wait for impact calculation and view switch
    await waitFor(() => {
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })

    // Should now show 2D view
    expect(screen.queryByTestId('scene3d')).not.toBeInTheDocument()
    expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()

    // Verify API call was made with correct parameters
    expect(mockApiClient.post).toHaveBeenCalledWith('/impact/calculate', {
      diameter_km: 0.34,
      velocity_kps: 7.42
    })

    // Impact map button should now be enabled and active
    const impactMapButton = screen.getByText('Impact Map')
    expect(impactMapButton).not.toBeDisabled()
    expect(impactMapButton).toHaveClass('active')
  })

  it('can switch back from 2D to 3D view', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn().mockResolvedValue({ data: mockImpactData })
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    // Wait for trajectory to load and simulate impact
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('simulate-impact'))

    await waitFor(() => {
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })

    // Click back to 3D button
    const backTo3DButton = screen.getByTestId('back-to-3d')
    fireEvent.click(backTo3DButton)

    // Should switch back to 3D view
    expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()

    // 3D view button should be active again
    const view3DButton = screen.getByText('3D Orbital View')
    expect(view3DButton).toHaveClass('active')
  })

  it('can switch views using header buttons after impact simulation', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn().mockResolvedValue({ data: mockImpactData })
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    // Complete impact simulation workflow
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('simulate-impact'))

    await waitFor(() => {
      expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    })

    // Now both buttons should be enabled
    const view3DButton = screen.getByText('3D Orbital View')
    const impactMapButton = screen.getByText('Impact Map')

    expect(view3DButton).not.toBeDisabled()
    expect(impactMapButton).not.toBeDisabled()
    expect(impactMapButton).toHaveClass('active')

    // Switch to 3D view using header button
    fireEvent.click(view3DButton)
    expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    expect(view3DButton).toHaveClass('active')

    // Switch back to 2D view using header button
    fireEvent.click(impactMapButton)
    expect(screen.getByTestId('impact-map')).toBeInTheDocument()
    expect(impactMapButton).toHaveClass('active')
  })

  it('handles impact calculation error', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn().mockRejectedValue(new Error('Impact calculation failed'))
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('simulate-impact'))

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })

    // Should remain in 3D view
    expect(screen.getByTestId('scene3d')).toBeInTheDocument()
    expect(screen.queryByTestId('impact-map')).not.toBeInTheDocument()
  })

  it('maintains application state during view transitions', async () => {
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockTrajectoryData }),
      post: vi.fn().mockResolvedValue({ data: mockImpactData })
    }
    mockedAxios.create.mockReturnValue(mockApiClient)

    render(<App />)
    
    // Complete workflow and verify state persistence
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

    // Data should persist across view changes
    expect(mockApiClient.get).toHaveBeenCalledTimes(1) // Only called once on mount
    expect(mockApiClient.post).toHaveBeenCalledTimes(1) // Only called once for impact
  })
})