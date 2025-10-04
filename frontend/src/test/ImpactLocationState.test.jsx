import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import App from '../App'

// Mock the API client to avoid network calls
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getAsteroid: vi.fn().mockResolvedValue({
      phys_par: [{ name: 'diameter', value: '0.34' }],
      orbit: {
        close_approach_data: [{ v_rel: '7.42' }]
      }
    }),
    getTrajectory: vi.fn().mockResolvedValue({
      positions: [[0, 0, 0]],
      times: ['2024-01-01']
    }),
    calculateImpact: vi.fn().mockResolvedValue({
      craterDiameterMeters: 3400,
      impactEnergyJoules: 1.2e16
    })
  },
  APIError: class APIError extends Error {},
  NetworkError: class NetworkError extends Error {},
  TimeoutError: class TimeoutError extends Error {}
}))

// Mock the 3D components to avoid WebGL issues in tests
vi.mock('../components/Scene3D', () => ({
  default: ({ onSimulateImpact, onImpactSelect }) => (
    <div data-testid="scene3d">
      <button onClick={onSimulateImpact} data-testid="simulate-impact">
        Simulate Impact
      </button>
      <button 
        onClick={() => onImpactSelect && onImpactSelect([40.7128, -74.006])} 
        data-testid="select-impact-location"
      >
        Select Impact Location
      </button>
    </div>
  )
}))

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactCoordinates, impactData, onBackTo3D }) => (
    <div data-testid="impact-map">
      <div data-testid="impact-coordinates">
        {impactCoordinates ? `${impactCoordinates[0]}, ${impactCoordinates[1]}` : 'No coordinates'}
      </div>
      <div data-testid="impact-data">
        {impactData ? JSON.stringify(impactData) : 'No impact data'}
      </div>
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D
      </button>
    </div>
  )
}))

describe('Impact Location State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Default state initialization', () => {
    it('initializes with default India coordinates', async () => {
      render(<App />)
      
      // Wait for the component to load and switch to 2D view to see the map
      await waitFor(() => {
        expect(screen.getByTestId('simulate-impact')).toBeInTheDocument()
      })
      
      // Simulate impact to switch to 2D view
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)
      
      // Wait for the impact map to appear
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Check that the default India coordinates are being used
      const coordinatesElement = screen.getByTestId('impact-coordinates')
      expect(coordinatesElement).toHaveTextContent('20.5937, 78.9629')
    })

    it('passes impact coordinates to ImpactMap component', async () => {
      render(<App />)
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByTestId('simulate-impact')).toBeInTheDocument()
      })
      
      // Simulate impact to switch to 2D view
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)
      
      // Wait for the impact map to appear
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Verify that coordinates are passed to the ImpactMap component
      expect(screen.getByTestId('impact-coordinates')).toBeInTheDocument()
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('20.5937, 78.9629')
    })

    it('has handleImpactSelect callback function available', () => {
      // This test verifies that the App component has the handleImpactSelect function
      // We can't directly test the function without exposing it, but we can verify
      // that the component renders without errors, which means the function is properly defined
      expect(() => render(<App />)).not.toThrow()
    })
  })

  describe('Impact location updates', () => {
    it('updates impact coordinates when handleImpactSelect is called', async () => {
      render(<App />)
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // Simulate selecting a new impact location (New York coordinates)
      const selectLocationButton = screen.getByTestId('select-impact-location')
      fireEvent.click(selectLocationButton)
      
      // Simulate impact to switch to 2D view and see the updated coordinates
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)
      
      // Wait for the impact map to appear
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Check that the coordinates have been updated to New York
      const coordinatesElement = screen.getByTestId('impact-coordinates')
      expect(coordinatesElement).toHaveTextContent('40.7128, -74.006')
    })

    it('maintains updated coordinates across view switches', async () => {
      render(<App />)
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // Select new impact location
      const selectLocationButton = screen.getByTestId('select-impact-location')
      fireEvent.click(selectLocationButton)
      
      // Switch to 2D view
      const simulateButton = screen.getByTestId('simulate-impact')
      fireEvent.click(simulateButton)
      
      // Wait for the impact map to appear
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Verify updated coordinates
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
      
      // Switch back to 3D view
      const backTo3DButton = screen.getByTestId('back-to-3d')
      fireEvent.click(backTo3DButton)
      
      // Wait for 3D view to appear
      await waitFor(() => {
        expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      })
      
      // Switch to 2D view again
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      // Wait for the impact map to appear again
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Verify coordinates are still updated
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
    })

    it('handles multiple impact location updates correctly', async () => {
      render(<App />)
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // First update
      fireEvent.click(screen.getByTestId('select-impact-location'))
      
      // Switch to 2D view to verify first update
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
      
      // Switch back to 3D view for second update
      fireEvent.click(screen.getByTestId('back-to-3d'))
      
      await waitFor(() => {
        expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      })
      
      // Second update (same coordinates in this mock, but tests the mechanism)
      fireEvent.click(screen.getByTestId('select-impact-location'))
      
      // Verify the update mechanism works
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
    })
  })

  describe('Callback functionality validation', () => {
    it('validates coordinate format passed to callback', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // The mock callback passes [40.7128, -74.006] which should be valid coordinates
      fireEvent.click(screen.getByTestId('select-impact-location'))
      
      // Switch to 2D view to verify the coordinates were processed correctly
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      const coordinatesText = screen.getByTestId('impact-coordinates').textContent
      const [lat, lng] = coordinatesText.split(', ').map(Number)
      
      // Validate coordinate ranges
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lng).toBeGreaterThanOrEqual(-180)
      expect(lng).toBeLessThanOrEqual(180)
      
      // Validate specific values
      expect(lat).toBeCloseTo(40.7128, 4)
      expect(lng).toBeCloseTo(-74.006, 3)
    })

    it('handles edge case coordinates correctly', async () => {
      // This test would require modifying the mock to test edge cases
      // For now, we verify that the current implementation handles the provided coordinates
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByTestId('select-impact-location'))
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Verify that coordinates are displayed as numbers, not NaN or undefined
      const coordinatesText = screen.getByTestId('impact-coordinates').textContent
      expect(coordinatesText).not.toContain('NaN')
      expect(coordinatesText).not.toContain('undefined')
      expect(coordinatesText).toMatch(/^-?\d+\.?\d*, -?\d+\.?\d*$/)
    })

    it('preserves coordinate precision', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByTestId('select-impact-location'))
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      const coordinatesText = screen.getByTestId('impact-coordinates').textContent
      
      // Verify that the coordinates maintain their precision (4 decimal places)
      expect(coordinatesText).toBe('40.7128, -74.006')
    })
  })

  describe('State persistence and consistency', () => {
    it('maintains state consistency during rapid updates', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // Rapid updates
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('select-impact-location'))
      }
      
      // Verify final state
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
    })

    it('handles component re-renders without losing state', async () => {
      const { rerender } = render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-impact-location')).toBeInTheDocument()
      })
      
      // Update coordinates
      fireEvent.click(screen.getByTestId('select-impact-location'))
      
      // Force re-render
      rerender(<App />)
      
      // Verify state is maintained
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('40.7128, -74.006')
    })
  })
})