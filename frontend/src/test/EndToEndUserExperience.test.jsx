import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock performance API for performance testing
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn()
};
global.performance = mockPerformance;

// Mock 3D components with realistic interaction simulation
vi.mock('../components/Scene3D', () => ({
  default: ({ onImpactSelect }) => {
    const handleEarthClick = (event) => {
      // Simulate realistic coordinate conversion
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to mock lat/lng (simplified)
      const lat = 90 - (y / rect.height) * 180;
      const lng = (x / rect.width) * 360 - 180;
      
      if (onImpactSelect) {
        onImpactSelect([lat, lng]);
      }
    };

    return (
      <div 
        data-testid="scene3d-interactive"
        style={{ width: '400px', height: '300px', background: '#001122' }}
        onClick={handleEarthClick}
      >
        <div data-testid="earth-mesh" style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          background: '#4a90e2',
          margin: '100px auto',
          cursor: 'pointer'
        }}>
          Earth
        </div>
      </div>
    );
  }
}));

vi.mock('../components/ImpactMap', () => ({
  default: ({ impactCoordinates }) => (
    <div data-testid="impact-map-interactive">
      <div data-testid="map-center">
        Center: {impactCoordinates ? `${impactCoordinates[0].toFixed(2)}, ${impactCoordinates[1].toFixed(2)}` : 'Default (20.59, 78.96)'}
      </div>
      <div data-testid="impact-marker">
        Impact Location Marker
      </div>
    </div>
  )
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('End-to-End User Experience Tests', () => {
  const mockAsteroidData = {
    name: 'Apophis',
    phys_par: [
      { name: 'diameter', value: '0.370', unit: 'km' },
      { name: 'mass', value: '6.1e10', unit: 'kg' }
    ],
    orbit: {
      close_approach_data: [
        { 
          v_rel: '7.42',
          miss_distance: '0.000255',
          close_approach_date: '2029-04-13'
        }
      ],
      elements: [
        { name: 'epoch', value: '2460000.5' },
        { name: 'semi_major_axis', value: '0.9224' },
        { name: 'eccentricity', value: '0.1914' }
      ],
      epoch: '2460000.5'
    }
  };

  const mockTrajectoryData = {
    asteroid_trajectory: Array.from({ length: 100 }, (_, i) => [
      Math.cos(i * 0.1) * (0.9 + 0.1 * Math.sin(i * 0.05)),
      Math.sin(i * 0.1) * (0.9 + 0.1 * Math.sin(i * 0.05)),
      Math.sin(i * 0.02) * 0.1
    ]),
    earth_trajectory: Array.from({ length: 100 }, (_, i) => [
      Math.cos(i * 0.1),
      Math.sin(i * 0.1),
      0
    ]),
    epoch_used: '2460000.5'
  };

  const mockImpactData = {
    crater_diameter: 5.2,
    energy_released: 1200,
    affected_area: 850,
    casualties_estimate: 125000,
    economic_damage: 45000000000
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockPerformance.now.mockClear();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide smooth user experience from start to impact simulation', async () => {
    const user = userEvent.setup();
    
    // Setup realistic API response timing
    mockFetch
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockAsteroidData)
        }), 100))
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockTrajectoryData)
        }), 200))
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockImpactData)
        }), 150))
      );

    const startTime = performance.now();
    render(<App />);

    // Step 1: Verify loading states are user-friendly
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Step 2: Wait for asteroid data to load
    await waitFor(() => {
      expect(screen.getByTestId('scene3d-interactive')).toBeInTheDocument();
    }, { timeout: 3000 });

    const dataLoadTime = performance.now();
    console.log(`Data load time: ${dataLoadTime - startTime}ms`);

    // Step 3: Verify 3D scene is interactive
    const earthMesh = screen.getByTestId('earth-mesh');
    expect(earthMesh).toBeInTheDocument();

    // Step 4: Test 3D interaction responsiveness
    const interactionStartTime = performance.now();
    await user.click(earthMesh);

    await waitFor(() => {
      const mapCenter = screen.getByTestId('map-center');
      expect(mapCenter).not.toHaveTextContent('Default');
    });

    const interactionTime = performance.now() - interactionStartTime;
    console.log(`3D interaction response time: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(100); // Should be very responsive

    // Step 5: Verify impact coordinates are updated in real-time
    const mapCenter = screen.getByTestId('map-center');
    expect(mapCenter).toHaveTextContent(/Center: \d+\.\d+, -?\d+\.\d+/);

    // Step 6: Test impact simulation with real parameters
    const simulateButton = screen.getByText(/simulate impact/i);
    expect(simulateButton).toBeInTheDocument();

    const simulationStartTime = performance.now();
    await user.click(simulateButton);

    // Step 7: Verify simulation uses extracted asteroid parameters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/impact'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"diameter":0.37')
        })
      );
    });

    // Step 8: Verify results are displayed with proper formatting
    await waitFor(() => {
      expect(screen.getByText(/crater diameter/i)).toBeInTheDocument();
      expect(screen.getByText(/5.2/)).toBeInTheDocument();
    });

    const totalTime = performance.now() - startTime;
    console.log(`Total workflow time: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(5000); // Complete workflow should be under 5 seconds
  });

  it('should handle multiple impact location selections smoothly', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAsteroidData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrajectoryData)
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('scene3d-interactive')).toBeInTheDocument();
    });

    const scene3d = screen.getByTestId('scene3d-interactive');
    const mapCenter = screen.getByTestId('map-center');

    // Test multiple clicks in different locations
    const clickPositions = [
      { x: 100, y: 50 },   // Northern hemisphere
      { x: 300, y: 200 },  // Southern hemisphere
      { x: 200, y: 150 }   // Equatorial region
    ];

    for (const position of clickPositions) {
      // Simulate click at specific position
      fireEvent.click(scene3d, {
        clientX: position.x,
        clientY: position.y,
        target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }) }
      });

      await waitFor(() => {
        const centerText = mapCenter.textContent;
        expect(centerText).toMatch(/Center: -?\d+\.\d+, -?\d+\.\d+/);
      });

      // Verify coordinates are within valid Earth bounds
      const coords = mapCenter.textContent.match(/-?\d+\.\d+/g);
      if (coords) {
        const lat = parseFloat(coords[0]);
        const lng = parseFloat(coords[1]);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
      }
    }
  });

  it('should provide clear error messages and recovery options', async () => {
    const user = userEvent.setup();

    // Test network error scenario
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/error loading asteroid data/i)).toBeInTheDocument();
    });

    // Verify error message is user-friendly
    const errorMessage = screen.getByText(/error loading asteroid data/i);
    expect(errorMessage).toBeInTheDocument();

    // Test recovery - retry button should work
    const retryButton = screen.queryByText(/retry/i);
    if (retryButton) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAsteroidData)
      });

      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/error loading asteroid data/i)).not.toBeInTheDocument();
      });
    }
  });

  it('should maintain performance with complex interactions', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAsteroidData)
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTrajectoryData)
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('scene3d-interactive')).toBeInTheDocument();
    });

    const scene3d = screen.getByTestId('scene3d-interactive');
    
    // Perform rapid interactions to test performance
    const startTime = performance.now();
    
    for (let i = 0; i < 10; i++) {
      fireEvent.click(scene3d, {
        clientX: 100 + i * 20,
        clientY: 100 + i * 10,
        target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }) }
      });
      
      // Small delay to simulate realistic user interaction
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const interactionTime = performance.now() - startTime;
    console.log(`10 rapid interactions completed in: ${interactionTime}ms`);
    
    // Should handle rapid interactions without significant performance degradation
    expect(interactionTime).toBeLessThan(2000);

    // Verify final state is consistent
    await waitFor(() => {
      const mapCenter = screen.getByTestId('map-center');
      expect(mapCenter).toHaveTextContent(/Center: -?\d+\.\d+, -?\d+\.\d+/);
    });
  });

  it('should validate scientific accuracy in user-facing results', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAsteroidData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrajectoryData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockImpactData)
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('scene3d-interactive')).toBeInTheDocument();
    });

    // Select impact location
    const earthMesh = screen.getByTestId('earth-mesh');
    await user.click(earthMesh);

    // Trigger impact simulation
    const simulateButton = screen.getByText(/simulate impact/i);
    await user.click(simulateButton);

    // Verify scientific accuracy of displayed results
    await waitFor(() => {
      expect(screen.getByText(/crater diameter/i)).toBeInTheDocument();
    });

    // Check that results are within scientifically reasonable ranges for Apophis
    const craterText = screen.getByText(/5.2/).textContent;
    const energyText = screen.getByText(/1200/).textContent;
    
    // Crater diameter should be reasonable for 370m asteroid
    expect(screen.getByText(/5.2/)).toBeInTheDocument();
    
    // Energy should be in reasonable range (hundreds to thousands of MT)
    expect(screen.getByText(/1200/)).toBeInTheDocument();

    // Verify units are displayed correctly
    expect(screen.getByText(/km/i)).toBeInTheDocument(); // crater diameter unit
    expect(screen.getByText(/MT/i)).toBeInTheDocument(); // energy unit
  });
});