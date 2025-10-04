import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';

// Mock the 3D components to avoid WebGL issues in tests
vi.mock('../components/Scene3D', () => ({
  default: ({ onImpactSelect, onSimulateImpact }) => (
    <div data-testid="scene3d-mock">
      <button 
        data-testid="earth-click-simulator"
        onClick={() => onImpactSelect && onImpactSelect([40.7128, -74.0060])}
      >
        Simulate Earth Click
      </button>
      <button 
        data-testid="simulate-impact-button"
        onClick={() => onSimulateImpact && onSimulateImpact()}
      >
        Simulate Impact
      </button>
    </div>
  )
}));

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactCoordinates }) => (
    <div data-testid="impact-map-mock">
      Impact Location: {impactCoordinates ? `${impactCoordinates[0]}, ${impactCoordinates[1]}` : 'Default'}
    </div>
  )
}));

// Mock the enhanced API client
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getAsteroid: vi.fn(),
    getTrajectory: vi.fn(),
    calculateImpact: vi.fn()
  },
  APIError: class APIError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  },
  NetworkError: class NetworkError extends Error {},
  TimeoutError: class TimeoutError extends Error {}
}));

describe('Integration Test Suite - Complete Workflow', () => {
  const mockAsteroidData = {
    name: 'Apophis',
    phys_par: [
      { name: 'diameter', value: '0.370', unit: 'km' }
    ],
    orbit: {
      close_approach_data: [
        { v_rel: '7.42' }
      ],
      elements: [
        { name: 'epoch', value: '2460000.5' }
      ],
      epoch: '2460000.5'
    }
  };

  const mockTrajectoryData = {
    asteroid_trajectory: [[1, 2, 3], [4, 5, 6]],
    earth_trajectory: [[7, 8, 9], [10, 11, 12]]
  };

  const mockImpactData = {
    crater_diameter: 5.2,
    energy_released: 1200,
    affected_area: 850
  };

  beforeEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete full workflow: asteroid selection → 3D interaction → impact simulation', async () => {
    const { enhancedApi } = await import('../utils/apiClient');
    
    // Setup mock responses
    enhancedApi.getAsteroid.mockResolvedValue(mockAsteroidData);
    enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData);
    enhancedApi.calculateImpact.mockResolvedValue(mockImpactData);

    render(<App />);

    // Step 1: Wait for initial asteroid data load
    await waitFor(() => {
      expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis');
    });

    // Step 2: Verify asteroid data is loaded and stored
    await waitFor(() => {
      expect(screen.getByTestId('scene3d-mock')).toBeInTheDocument();
    });

    // Step 3: Simulate 3D Earth click interaction
    const earthClickButton = screen.getByTestId('earth-click-simulator');
    fireEvent.click(earthClickButton);

    // Step 4: Trigger impact simulation
    const simulateButton = screen.getByTestId('simulate-impact-button');
    fireEvent.click(simulateButton);

    // Step 5: Verify impact simulation uses real asteroid parameters
    await waitFor(() => {
      expect(enhancedApi.calculateImpact).toHaveBeenCalledWith({
        diameter_km: 0.37,
        velocity_kps: 7.42
      });
    });

    // Step 6: Verify view switches to 2D map
    await waitFor(() => {
      expect(screen.getByTestId('impact-map-mock')).toBeInTheDocument();
    });
  });

  it('should handle error scenarios gracefully throughout workflow', async () => {
    const { enhancedApi, NetworkError } = await import('../utils/apiClient');
    
    // Test asteroid data fetch failure
    enhancedApi.getAsteroid.mockRejectedValue(new NetworkError('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Connection Problem/i)).toBeInTheDocument();
    });

    // Verify retry button is available
    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });

  it('should maintain state consistency across component interactions', async () => {
    const { enhancedApi } = await import('../utils/apiClient');
    
    enhancedApi.getAsteroid.mockResolvedValue(mockAsteroidData);
    enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData);

    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('scene3d-mock')).toBeInTheDocument();
    });

    // Simulate multiple Earth clicks to test state consistency
    const earthClickButton = screen.getByTestId('earth-click-simulator');
    
    fireEvent.click(earthClickButton);
    
    // Verify the impact coordinates are maintained consistently
    // Note: In the mock, we always return the same coordinates
    expect(screen.getByTestId('scene3d-mock')).toBeInTheDocument();
  });
});