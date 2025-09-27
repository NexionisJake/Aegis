import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
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
            <span data-testid="asteroid-points">{trajectory.asteroid_path?.length || 0} asteroid points</span>
            <span data-testid="earth-points">{trajectory.earth_path?.length || 0} earth points</span>
            <span data-testid="orbital-data">
              Semi-major axis: {trajectory.orbital_elements?.a || 'N/A'} AU
            </span>
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
            <span data-testid="impact-megatons">{impactData.impactEnergyMegatons} megatons</span>
          </div>
        )}
      </div>
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D View
      </button>
    </div>
  )
}))

describe('Real NASA API Data Simulation Tests', () => {
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

  describe('Apophis (99942) Real Data Simulation', () => {
    it('handles realistic Apophis orbital data and impact simulation', async () => {
      // Realistic Apophis trajectory data based on actual orbital elements
      const realisticApophisTrajectory = {
        asteroid_path: [
          // Apophis orbital path points (semi-major axis ~0.92 AU)
          [0.9224, 0.1914, 0.0333],  // Near aphelion
          [0.9230, 0.1920, 0.0335],
          [0.9236, 0.1926, 0.0337],
          [0.9242, 0.1932, 0.0339],
          [0.9248, 0.1938, 0.0341],
          [0.9254, 0.1944, 0.0343],
          [0.9260, 0.1950, 0.0345],
          [0.9266, 0.1956, 0.0347],
          [0.9272, 0.1962, 0.0349],
          [0.9278, 0.1968, 0.0351],
          // ... continuing orbital path
          [0.7500, 0.1500, 0.0250],  // Near perihelion
          [0.7520, 0.1520, 0.0252],
          [0.7540, 0.1540, 0.0254]
        ],
        earth_path: [
          // Earth's orbital path (1 AU circular)
          [1.0000, 0.0000, 0.0000],
          [0.9998, 0.0175, 0.0000],
          [0.9993, 0.0349, 0.0000],
          [0.9986, 0.0523, 0.0000],
          [0.9976, 0.0698, 0.0000],
          [0.9962, 0.0872, 0.0000],
          [0.9945, 0.1045, 0.0000],
          [0.9925, 0.1219, 0.0000],
          [0.9903, 0.1392, 0.0000],
          [0.9877, 0.1564, 0.0000],
          [0.9848, 0.1736, 0.0000],
          [0.9816, 0.1908, 0.0000],
          [0.9781, 0.2079, 0.0000]
        ],
        orbital_elements: {
          a: 0.9224065263,  // Semi-major axis in AU
          e: 0.1914276290,  // Eccentricity
          i: 3.3314075515,  // Inclination in degrees
          om: 204.4460932,  // Longitude of ascending node
          w: 126.4013193,   // Argument of periapsis
          ma: 268.7143018   // Mean anomaly
        }
      }

      // Realistic Apophis impact data
      const realisticApophisImpact = {
        craterDiameterMeters: 3400,      // ~3.4 km crater diameter
        impactEnergyJoules: 1.2e16,      // ~1.2 × 10^16 joules
        massKg: 6.1e10,                  // ~61 billion kg mass
        craterDiameterKm: 3.4,
        impactEnergyMegatons: 2870       // ~2870 megatons TNT equivalent
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(realisticApophisTrajectory)
      mockEnhancedApi.calculateImpact.mockResolvedValue(realisticApophisImpact)

      render(<App />)

      // Wait for trajectory to load
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify realistic trajectory data
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('13 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('13 earth points')
      expect(screen.getByTestId('orbital-data')).toHaveTextContent('Semi-major axis: 0.9224065263 AU')

      // Simulate Apophis impact
      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Verify realistic impact results
      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('3400m crater')
      expect(screen.getByTestId('impact-energy')).toHaveTextContent('1.2e+16J energy')
      expect(screen.getByTestId('impact-megatons')).toHaveTextContent('2870 megatons')

      // Verify API calls with correct Apophis parameters
      expect(mockApiClient.get).toHaveBeenCalledWith('/trajectory/Apophis')
      expect(mockApiClient.post).toHaveBeenCalledWith('/impact/calculate', {
        diameter_km: 0.34,  // Apophis diameter
        velocity_kps: 7.42  // Typical encounter velocity
      })
    })

    it('simulates various Near-Earth Asteroids with realistic data', async () => {
      const neoTestCases = [
        {
          name: 'Bennu',
          trajectory: {
            asteroid_path: [
              [1.1260, 0.2037, 0.0628],  // Bennu orbital elements
              [1.1270, 0.2040, 0.0630],
              [1.1280, 0.2043, 0.0632]
            ],
            earth_path: [
              [1.0000, 0.0000, 0.0000],
              [0.9998, 0.0175, 0.0000],
              [0.9993, 0.0349, 0.0000]
            ],
            orbital_elements: {
              a: 1.1260,  // Semi-major axis
              e: 0.2037,  // Eccentricity
              i: 6.0349   // Inclination
            }
          },
          impact: {
            craterDiameterMeters: 5200,
            impactEnergyJoules: 2.8e16,
            massKg: 7.8e10,
            impactEnergyMegatons: 6700
          },
          params: { diameter_km: 0.492, velocity_kps: 8.5 }
        },
        {
          name: 'Eros',
          trajectory: {
            asteroid_path: [
              [1.4580, 0.2226, 0.1928],  // Eros orbital elements
              [1.4590, 0.2230, 0.1930],
              [1.4600, 0.2234, 0.1932]
            ],
            earth_path: [
              [1.0000, 0.0000, 0.0000],
              [0.9998, 0.0175, 0.0000],
              [0.9993, 0.0349, 0.0000]
            ],
            orbital_elements: {
              a: 1.4580,
              e: 0.2226,
              i: 10.8276
            }
          },
          impact: {
            craterDiameterMeters: 25000,
            impactEnergyJoules: 1.5e18,
            massKg: 6.7e12,
            impactEnergyMegatons: 358000
          },
          params: { diameter_km: 16.84, velocity_kps: 12.0 }
        }
      ]

      for (const testCase of neoTestCases) {
        mockEnhancedApi.getTrajectory.mockResolvedValue(testCase.trajectory)
        mockEnhancedApi.calculateImpact.mockResolvedValue(testCase.impact)

        const { unmount } = render(<App />)

        await waitFor(() => {
          expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
        })

        // Verify orbital data
        expect(screen.getByTestId('orbital-data')).toHaveTextContent(
          `Semi-major axis: ${testCase.trajectory.orbital_elements.a} AU`
        )

        // Simulate impact
        fireEvent.click(screen.getByTestId('simulate-impact'))

        await waitFor(() => {
          expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
        })

        // Verify impact results
        expect(screen.getByTestId('crater-diameter')).toHaveTextContent(
          `${testCase.impact.craterDiameterMeters}m crater`
        )
        expect(screen.getByTestId('impact-megatons')).toHaveTextContent(
          `${testCase.impact.impactEnergyMegatons} megatons`
        )

        // Verify API calls
        expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledWith(testCase.params)

        unmount()
        vi.clearAllMocks()
      }
    })

    it('handles edge cases in NASA API data', async () => {
      const edgeCaseData = {
        asteroid_path: [
          [0.0001, 0.0001, 0.0001],  // Very small coordinates
          [100.0, 50.0, 25.0],       // Very large coordinates
          [-1.0, -2.0, -3.0]         // Negative coordinates
        ],
        earth_path: [
          [1.0, 0.0, 0.0],
          [0.0, 1.0, 0.0],
          [0.0, 0.0, 1.0]
        ],
        orbital_elements: {
          a: 0.1,    // Very small semi-major axis
          e: 0.99,   // High eccentricity
          i: 179.0   // Nearly retrograde orbit
        }
      }

      const edgeImpactData = {
        craterDiameterMeters: 50,
        impactEnergyJoules: 1.0e10,
        massKg: 1.0e6,
        impactEnergyMegatons: 0.002
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(edgeCaseData)
      mockEnhancedApi.calculateImpact.mockResolvedValue(edgeImpactData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should handle edge case data gracefully
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('3 asteroid points')
      expect(screen.getByTestId('orbital-data')).toHaveTextContent('Semi-major axis: 0.1 AU')

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('50m crater')
    })
  })

  describe('Historical Impact Event Simulations', () => {
    it('simulates Tunguska-like event parameters', async () => {
      const tunguskaTrajectory = {
        asteroid_path: [
          [0.98, 0.05, 0.01],  // Earth-crossing trajectory
          [0.99, 0.03, 0.005],
          [1.00, 0.01, 0.001],
          [1.01, -0.01, -0.001]
        ],
        earth_path: [
          [1.0, 0.0, 0.0],
          [0.999, 0.017, 0.0],
          [0.998, 0.035, 0.0],
          [0.997, 0.052, 0.0]
        ]
      }

      const tunguskaImpact = {
        craterDiameterMeters: 0,        // Tunguska was an airburst
        impactEnergyJoules: 6.3e14,     // ~15 megatons
        massKg: 1.0e8,                  // ~100,000 tons
        impactEnergyMegatons: 15,
        airburstAltitude: 8000          // 8km altitude
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(tunguskaTrajectory)
      mockEnhancedApi.calculateImpact.mockResolvedValue(tunguskaImpact)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Verify Tunguska-like parameters
      expect(screen.getByTestId('impact-megatons')).toHaveTextContent('15 megatons')
      expect(mockEnhancedApi.calculateImpact).toHaveBeenCalledWith({
        diameter_km: 0.06,   // ~60m diameter
        velocity_kps: 27.0   // High velocity entry
      })
    })

    it('simulates Chicxulub-scale impact scenario', async () => {
      const chicxulubTrajectory = {
        asteroid_path: [
          [2.5, 0.8, 0.3],   // Large asteroid trajectory
          [2.3, 0.7, 0.25],
          [2.1, 0.6, 0.2],
          [1.9, 0.5, 0.15]
        ],
        earth_path: [
          [1.0, 0.0, 0.0],
          [0.999, 0.017, 0.0],
          [0.998, 0.035, 0.0],
          [0.997, 0.052, 0.0]
        ]
      }

      const chicxulubImpact = {
        craterDiameterMeters: 150000,     // 150km crater
        impactEnergyJoules: 4.2e23,       // ~100 million megatons
        massKg: 1.0e15,                   // ~1 trillion tons
        impactEnergyMegatons: 100000000,
        craterDiameterKm: 150
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(chicxulubTrajectory)
      mockEnhancedApi.calculateImpact.mockResolvedValue(chicxulubImpact)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      // Verify Chicxulub-scale parameters
      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('150000m crater')
      expect(screen.getByTestId('impact-megatons')).toHaveTextContent('100000000 megatons')
    })
  })

  describe('Real-Time NASA API Integration Simulation', () => {
    it('handles realistic NASA API response structure', async () => {
      // Simulate actual NASA JPL SBDB API response structure
      const realisticNASAResponse = {
        signature: {
          source: "NASA/JPL Small-Body Database (SBDB) API",
          version: "1.3"
        },
        object: {
          fullname: "99942 Apophis (2004 MN4)",
          shortname: "99942 Apophis",
          neo: true,
          pha: true,
          orbit_class: {
            code: "ATE",
            name: "Aten"
          }
        },
        orbit: {
          source: "JPL",
          epoch: "2461000.5",
          elements: [
            { name: "a", value: "0.9224065263", sigma: "4.0280e-09", units: "au" },
            { name: "e", value: "0.1914276290", sigma: "1.2037e-09", units: "" },
            { name: "i", value: "3.3314075515", sigma: "1.1587e-06", units: "deg" },
            { name: "om", value: "204.4460932", sigma: "1.1587e-06", units: "deg" },
            { name: "w", value: "126.4013193", sigma: "1.1587e-06", units: "deg" },
            { name: "ma", value: "268.7143018", sigma: "1.1587e-06", units: "deg" }
          ]
        },
        phys_par: {
          H: "19.7",
          diameter: "0.34",
          extent: "0.34",
          albedo: "0.23",
          rot_per: "30.56"
        }
      }

      // Convert to trajectory format
      const processedTrajectory = {
        asteroid_path: Array.from({ length: 365 }, (_, i) => [
          0.9224 * Math.cos(i * 0.01) + 0.1914 * Math.sin(i * 0.01),
          0.9224 * Math.sin(i * 0.01) - 0.1914 * Math.cos(i * 0.01),
          0.0333 * Math.sin(i * 0.02)
        ]),
        earth_path: Array.from({ length: 365 }, (_, i) => [
          Math.cos(i * 0.01),
          Math.sin(i * 0.01),
          0
        ]),
        nasa_data: realisticNASAResponse
      }

      const realisticImpact = {
        craterDiameterMeters: 3400,
        impactEnergyJoules: 1.2e16,
        massKg: 6.1e10,
        craterDiameterKm: 3.4,
        impactEnergyMegatons: 2870
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(processedTrajectory)
      mockEnhancedApi.calculateImpact.mockResolvedValue(realisticImpact)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Verify realistic data processing
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('365 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('365 earth points')

      fireEvent.click(screen.getByTestId('simulate-impact'))

      await waitFor(() => {
        expect(screen.getByTestId('impact-data-loaded')).toBeInTheDocument()
      })

      expect(screen.getByTestId('crater-diameter')).toHaveTextContent('3400m crater')
    })

    it('handles NASA API rate limiting and errors', async () => {
      // Simulate rate limiting
      mockEnhancedApi.getTrajectory
        .mockRejectedValueOnce({ response: { status: 429, data: { error: 'Rate limit exceeded' } } })
        .mockResolvedValueOnce({
          asteroid_path: [[1, 2, 3]],
          earth_path: [[4, 5, 6]]
        })

      render(<App />)

      // Should eventually succeed after retry
      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('validates NASA API data integrity', async () => {
      const validatedTrajectory = {
        asteroid_path: [
          [0.9224, 0.1914, 0.0333],  // Valid orbital coordinates
          [0.9230, 0.1920, 0.0335],
          [0.9236, 0.1926, 0.0337]
        ],
        earth_path: [
          [1.0000, 0.0000, 0.0000],  // Valid Earth coordinates
          [0.9998, 0.0175, 0.0000],
          [0.9993, 0.0349, 0.0000]
        ],
        validation: {
          asteroid_path_valid: true,
          earth_path_valid: true,
          coordinate_range_check: 'passed',
          data_completeness: 100
        }
      }

      mockEnhancedApi.getTrajectory.mockResolvedValue(validatedTrajectory)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('trajectory-loaded')).toBeInTheDocument()
      })

      // Should process validated data correctly
      expect(screen.getByTestId('asteroid-points')).toHaveTextContent('3 asteroid points')
      expect(screen.getByTestId('earth-points')).toHaveTextContent('3 earth points')
    })
  })
})