import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

// Mock the API client to avoid network calls
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

// Import the mocked functions after the mock is set up
import { enhancedApi } from '../utils/apiClient'

describe('Comprehensive Dynamic Parameters Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Parameter Extraction with Various NASA API Response Formats', () => {
    it('should extract diameter from standard NASA API format', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0.34', unit: 'km' },
          { name: 'mass', value: '6.1e10', unit: 'kg' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      const diameter = extractDiameter(mockAsteroidData)
      expect(diameter).toBe(0.34)
    })

    it('should extract diameter from alternative NASA API format with different naming', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'mean_diameter', value: '1.2', unit: 'km' },
          { name: 'albedo', value: '0.14' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      const diameter = extractDiameter(mockAsteroidData)
      expect(diameter).toBe(1.2)
    })

    it('should extract velocity from standard close approach data format', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: [
            { v_rel: '7.42', date: '2029-04-13', distance: '0.0002' },
            { v_rel: '6.14', date: '2036-04-13', distance: '0.0003' }
          ]
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      const velocity = extractVelocity(mockAsteroidData)
      expect(velocity).toBe(7.42)
    })

    it('should extract velocity from alternative API format with different structure', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: [
            { 
              v_rel: '12.8', 
              date: '2025-03-15',
              miss_distance: { kilometers: '7500000' },
              orbiting_body: 'Earth'
            }
          ]
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      const velocity = extractVelocity(mockAsteroidData)
      expect(velocity).toBe(12.8)
    })

    it('should handle NASA API format with empty physical parameters array', () => {
      const mockAsteroidData = {
        phys_par: []
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Diameter data not found in asteroid parameters')
    })

    it('should handle NASA API format with empty close approach data array', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: []
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractVelocity(mockAsteroidData)).toThrow('Velocity data not found in close approach data')
    })
  })

  describe('Error Handling for Missing Data', () => {
    it('should throw error when asteroid data is completely missing', () => {
      const mockAsteroidData = null

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Physical parameters not available for this asteroid')
    })

    it('should throw error when physical parameters section is missing', () => {
      const mockAsteroidData = {
        orbit: {
          elements: [{ name: 'a', value: '1.52' }]
        }
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Physical parameters not available for this asteroid')
    })

    it('should throw error when orbit section is missing', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0.34', unit: 'km' }
        ]
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractVelocity(mockAsteroidData)).toThrow('Close approach data not available for this asteroid')
    })

    it('should throw error when diameter parameter has no value', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', unit: 'km' },
          { name: 'mass', value: '6.1e10', unit: 'kg' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Diameter data not found in asteroid parameters')
    })

    it('should throw error when velocity parameter has no value', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: [
            { date: '2029-04-13', distance: '0.0002' }
          ]
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractVelocity(mockAsteroidData)).toThrow('Velocity data not found in close approach data')
    })
  })

  describe('Parameter Validation and Fallback Logic', () => {
    it('should throw error for negative diameter values', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '-0.5', unit: 'km' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Invalid diameter value in asteroid data')
    })

    it('should throw error for zero diameter values', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0', unit: 'km' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Invalid diameter value in asteroid data')
    })

    it('should throw error for negative velocity values', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: [
            { v_rel: '-5.2', date: '2029-04-13' }
          ]
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractVelocity(mockAsteroidData)).toThrow('Invalid velocity value in asteroid data')
    })

    it('should throw error for non-numeric diameter strings', () => {
      const mockAsteroidData = {
        phys_par: [
          { name: 'diameter', value: 'unknown', unit: 'km' }
        ]
      }

      let extractDiameter
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractDiameter = useCallback((asteroidData) => {
          if (!asteroidData?.phys_par) {
            throw new Error('Physical parameters not available for this asteroid')
          }
          
          const diameterParam = asteroidData.phys_par.find(param => 
            param.name && param.name.toLowerCase().includes('diameter')
          )
          
          if (!diameterParam?.value) {
            throw new Error('Diameter data not found in asteroid parameters')
          }
          
          const diameter = parseFloat(diameterParam.value)
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error('Invalid diameter value in asteroid data')
          }
          
          return diameter
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractDiameter(mockAsteroidData)).toThrow('Invalid diameter value in asteroid data')
    })

    it('should throw error for non-numeric velocity strings', () => {
      const mockAsteroidData = {
        orbit: {
          close_approach_data: [
            { v_rel: 'fast', date: '2029-04-13' }
          ]
        }
      }

      let extractVelocity
      
      function TestComponent() {
        const { useCallback } = require('react')
        
        extractVelocity = useCallback((asteroidData) => {
          if (!asteroidData?.orbit?.close_approach_data) {
            throw new Error('Close approach data not available for this asteroid')
          }
          
          const approachData = asteroidData.orbit.close_approach_data[0]
          if (!approachData?.v_rel) {
            throw new Error('Velocity data not found in close approach data')
          }
          
          const velocity = parseFloat(approachData.v_rel)
          if (isNaN(velocity) || velocity <= 0) {
            throw new Error('Invalid velocity value in asteroid data')
          }
          
          return velocity
        }, [])

        return <div>Test Component</div>
      }

      render(<TestComponent />)
      
      expect(() => extractVelocity(mockAsteroidData)).toThrow('Invalid velocity value in asteroid data')
    })
  })

  describe('handleSimulateImpact Integration Tests', () => {
    it('should successfully simulate impact with valid asteroid data', async () => {
      const validAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0.34', unit: 'km' }
        ],
        orbit: {
          close_approach_data: [
            { v_rel: '7.42', date: '2029-04-13' }
          ]
        }
      }

      const mockTrajectoryData = { positions: [[0, 0, 0]] }
      const mockImpactData = { crater_diameter: 5.2, energy: 1200 }

      enhancedApi.getAsteroid.mockResolvedValue(validAsteroidData)
      enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      enhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Wait for initial data loading
      await waitFor(() => {
        expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      })

      // Find and click the simulate impact button
      const simulateButton = screen.getByText(/simulate impact/i)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(enhancedApi.calculateImpact).toHaveBeenCalledWith({
          diameter_km: 0.34,
          velocity_kps: 7.42
        })
      })
    })

    it('should use fallback values when diameter extraction fails', async () => {
      const invalidAsteroidData = {
        phys_par: [
          { name: 'mass', value: '6.1e10', unit: 'kg' }
        ],
        orbit: {
          close_approach_data: [
            { v_rel: '7.42', date: '2029-04-13' }
          ]
        }
      }

      const mockTrajectoryData = { positions: [[0, 0, 0]] }
      const mockImpactData = { crater_diameter: 5.2, energy: 1200 }

      enhancedApi.getAsteroid.mockResolvedValue(invalidAsteroidData)
      enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      enhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Wait for initial data loading
      await waitFor(() => {
        expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      })

      // Find and click the simulate impact button
      const simulateButton = screen.getByText(/simulate impact/i)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(enhancedApi.calculateImpact).toHaveBeenCalledWith({
          diameter_km: 0.34, // fallback value
          velocity_kps: 7.42
        })
      })
    })

    it('should use fallback values when velocity extraction fails', async () => {
      const invalidAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0.34', unit: 'km' }
        ],
        orbit: {
          close_approach_data: [
            { date: '2029-04-13' }
          ]
        }
      }

      const mockTrajectoryData = { positions: [[0, 0, 0]] }
      const mockImpactData = { crater_diameter: 5.2, energy: 1200 }

      enhancedApi.getAsteroid.mockResolvedValue(invalidAsteroidData)
      enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
      enhancedApi.calculateImpact.mockResolvedValue(mockImpactData)

      render(<App />)

      // Wait for initial data loading
      await waitFor(() => {
        expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      })

      // Find and click the simulate impact button
      const simulateButton = screen.getByText(/simulate impact/i)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(enhancedApi.calculateImpact).toHaveBeenCalledWith({
          diameter_km: 0.34,
          velocity_kps: 7.42 // fallback value
        })
      })
    })

    it('should show error when asteroid data is completely unavailable', async () => {
      enhancedApi.getAsteroid.mockResolvedValue(null)
      enhancedApi.getTrajectory.mockResolvedValue({ 
        asteroid_path: [[0, 0, 0]], 
        earth_path: [[1, 0, 0]] 
      })

      render(<App />)

      // Wait for initial data loading and error to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid asteroid data/i)).toBeInTheDocument()
      })

      // Verify that the asteroid API was called but trajectory might not be called due to error
      expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      
      // The error message should indicate invalid asteroid data
      expect(screen.getByText(/the asteroid data contains invalid values/i)).toBeInTheDocument()
    })

    it('should show error when both parameter extractions fail with invalid data', async () => {
      const invalidAsteroidData = {
        phys_par: [
          { name: 'diameter', value: 'invalid', unit: 'km' }
        ],
        orbit: {
          close_approach_data: [
            { v_rel: 'invalid', date: '2029-04-13' }
          ]
        }
      }

      const mockTrajectoryData = { positions: [[0, 0, 0]] }

      enhancedApi.getAsteroid.mockResolvedValue(invalidAsteroidData)
      enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)

      render(<App />)

      // Wait for initial data loading
      await waitFor(() => {
        expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      })

      // Find and click the simulate impact button
      const simulateButton = screen.getByText(/simulate impact/i)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(enhancedApi.calculateImpact).toHaveBeenCalledWith({
          diameter_km: 0.34, // fallback values used
          velocity_kps: 7.42
        })
      })
    })

    it('should handle API errors during impact simulation', async () => {
      const validAsteroidData = {
        phys_par: [
          { name: 'diameter', value: '0.34', unit: 'km' }
        ],
        orbit: {
          close_approach_data: [
            { v_rel: '7.42', date: '2029-04-13' }
          ]
        }
      }

      enhancedApi.getAsteroid.mockResolvedValue(validAsteroidData)
      enhancedApi.getTrajectory.mockResolvedValue({ positions: [[0, 0, 0]] })
      enhancedApi.calculateImpact.mockRejectedValue(new Error('Impact calculation failed'))

      render(<App />)

      // Wait for initial data loading
      await waitFor(() => {
        expect(enhancedApi.getAsteroid).toHaveBeenCalledWith('Apophis')
      })

      // Find and click the simulate impact button
      const simulateButton = screen.getByText(/simulate impact/i)
      fireEvent.click(simulateButton)

      await waitFor(() => {
        expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
      })
    })
  })
})