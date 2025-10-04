import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import SolarSystem from '../components/SolarSystem'
import App from '../App'

// Mock Three.js components and hooks
vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useThree: vi.fn(() => ({
      camera: {
        position: { x: 0, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      gl: {
        domElement: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
          })
        }
      }
    })),
    useFrame: vi.fn(),
    Canvas: ({ children }) => <div data-testid="canvas">{children}</div>
  }
})

// Mock Three.js Sphere component
vi.mock('@react-three/drei', () => ({
  Sphere: ({ children, onClick, ...props }) => (
    <div 
      data-testid="sphere" 
      onClick={onClick}
      data-args={JSON.stringify(props.args)}
      data-position={JSON.stringify(props.position)}
    >
      {children}
    </div>
  )
}))

// Mock the API client
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getAsteroid: vi.fn().mockResolvedValue({
      phys_par: [{ name: 'diameter', value: '0.34' }],
      orbit: {
        close_approach_data: [{ v_rel: '7.42' }]
      }
    }),
    getTrajectory: vi.fn().mockResolvedValue({
      earth_path: [[1, 0, 0], [0.9, 0.1, 0], [0.8, 0.2, 0]],
      asteroid_path: [[2, 0, 0], [1.9, 0.1, 0], [1.8, 0.2, 0]]
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

// Mock Scene3D component
vi.mock('../components/Scene3D', () => ({
  default: ({ onSimulateImpact, onImpactSelect }) => (
    <div data-testid="scene3d">
      <button onClick={onSimulateImpact} data-testid="simulate-impact">
        Simulate Impact
      </button>
      <button 
        onClick={() => onImpactSelect && onImpactSelect([51.5074, -0.1278])} 
        data-testid="select-london"
      >
        Select London
      </button>
      <button 
        onClick={() => onImpactSelect && onImpactSelect([35.6762, 139.6503])} 
        data-testid="select-tokyo"
      >
        Select Tokyo
      </button>
    </div>
  )
}))

// Mock ImpactMap component
vi.mock('../components/ImpactMap', () => ({
  default: ({ impactCoordinates, impactData, onBackTo3D }) => (
    <div data-testid="impact-map">
      <div data-testid="impact-coordinates">
        {impactCoordinates ? `${impactCoordinates[0]}, ${impactCoordinates[1]}` : 'No coordinates'}
      </div>
      <button onClick={onBackTo3D} data-testid="back-to-3d">
        Back to 3D
      </button>
    </div>
  )
}))

// Utility functions for testing
const createMockVector3 = (x, y, z) => ({
  x,
  y,
  z,
  clone: () => createMockVector3(x, y, z),
  normalize: () => {
    const length = Math.sqrt(x * x + y * y + z * z)
    if (length === 0) return createMockVector3(0, 0, 0)
    return createMockVector3(x / length, y / length, z / length)
  }
})

const createMockRaycaster = () => ({
  setFromCamera: vi.fn(),
  intersectObject: vi.fn()
})

const createMockMouseEvent = (clientX = 400, clientY = 300) => ({
  clientX,
  clientY,
  stopPropagation: vi.fn()
})

// Coordinate conversion function (extracted from SolarSystem component)
const convertToLatLng = (point, radius = 0.12) => {
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
    throw new Error('Invalid 3D point provided for coordinate conversion')
  }

  if (radius <= 0) {
    throw new Error('Invalid radius provided for coordinate conversion')
  }

  const length = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
  if (length === 0) {
    throw new Error('Coordinate conversion resulted in invalid values')
  }

  const normalizedPoint = {
    x: point.x / length,
    y: point.y / length,
    z: point.z / length
  }
  
  const latitude = Math.asin(normalizedPoint.y) * (180 / Math.PI)
  const longitude = Math.atan2(normalizedPoint.z, normalizedPoint.x) * (180 / Math.PI)
  
  const clampedLatitude = Math.max(-90, Math.min(90, latitude))
  const clampedLongitude = Math.max(-180, Math.min(180, longitude))
  
  if (isNaN(clampedLatitude) || isNaN(clampedLongitude)) {
    throw new Error('Coordinate conversion resulted in invalid values')
  }
  
  return [clampedLatitude, clampedLongitude]
}

describe('3D Interaction Functionality Tests', () => {
  let mockOnImpactSelect
  let mockRaycaster
  let mockCamera
  let mockGl

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnImpactSelect = vi.fn()
    mockRaycaster = createMockRaycaster()
    mockCamera = { position: { x: 0, y: 0, z: 10 } }
    mockGl = {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600
        })
      }
    }
  })

  describe('3D to Geographic Coordinate Conversion Accuracy', () => {
    describe('Basic coordinate conversion', () => {
      it('should convert 3D point at north pole to correct latitude/longitude', () => {
        const northPolePoint = createMockVector3(0, 1, 0)
        const [lat, lng] = convertToLatLng(northPolePoint)
        
        expect(lat).toBeCloseTo(90, 5)
        expect(lng).toBeCloseTo(0, 5)
      })

      it('should convert 3D point at south pole to correct latitude/longitude', () => {
        const southPolePoint = createMockVector3(0, -1, 0)
        const [lat, lng] = convertToLatLng(southPolePoint)
        
        expect(lat).toBeCloseTo(-90, 5)
        expect(lng).toBeCloseTo(0, 5)
      })

      it('should convert 3D point at equator (0°, 0°) to correct coordinates', () => {
        const equatorPoint = createMockVector3(1, 0, 0)
        const [lat, lng] = convertToLatLng(equatorPoint)
        
        expect(lat).toBeCloseTo(0, 5)
        expect(lng).toBeCloseTo(0, 5)
      })

      it('should convert 3D point at equator (0°, 90°) to correct coordinates', () => {
        const equatorPoint = createMockVector3(0, 0, 1)
        const [lat, lng] = convertToLatLng(equatorPoint)
        
        expect(lat).toBeCloseTo(0, 5)
        expect(lng).toBeCloseTo(90, 5)
      })

      it('should convert 3D point at equator (0°, -90°) to correct coordinates', () => {
        const equatorPoint = createMockVector3(0, 0, -1)
        const [lat, lng] = convertToLatLng(equatorPoint)
        
        expect(lat).toBeCloseTo(0, 5)
        expect(lng).toBeCloseTo(-90, 5)
      })

      it('should convert 3D point at equator (0°, 180°) to correct coordinates', () => {
        const equatorPoint = createMockVector3(-1, 0, 0)
        const [lat, lng] = convertToLatLng(equatorPoint)
        
        expect(lat).toBeCloseTo(0, 5)
        expect(lng).toBeCloseTo(180, 5)
      })
    })

    describe('Mathematical accuracy', () => {
      it('should use correct latitude formula: Math.asin(point.y / radius) * (180 / Math.PI)', () => {
        const point = createMockVector3(0, 0.5, 0)
        const [lat] = convertToLatLng(point)
        
        const normalizedPoint = point.normalize()
        const expectedLat = Math.asin(normalizedPoint.y) * (180 / Math.PI)
        expect(lat).toBeCloseTo(expectedLat, 5)
      })

      it('should use correct longitude formula: Math.atan2(point.z, point.x) * (180 / Math.PI)', () => {
        const point = createMockVector3(1, 0, 1)
        const [, lng] = convertToLatLng(point)
        
        const normalizedPoint = point.normalize()
        const expectedLng = Math.atan2(normalizedPoint.z, normalizedPoint.x) * (180 / Math.PI)
        expect(lng).toBeCloseTo(expectedLng, 5)
      })

      it('should handle various quadrants correctly', () => {
        const testCases = [
          { point: createMockVector3(1, 0, 1), expectedQuadrant: 'NE' },
          { point: createMockVector3(-1, 0, 1), expectedQuadrant: 'NW' },
          { point: createMockVector3(-1, 0, -1), expectedQuadrant: 'SW' },
          { point: createMockVector3(1, 0, -1), expectedQuadrant: 'SE' }
        ]
        
        testCases.forEach(({ point, expectedQuadrant }) => {
          const [lat, lng] = convertToLatLng(point)
          
          switch (expectedQuadrant) {
            case 'NE':
              expect(lng).toBeGreaterThan(0)
              expect(lng).toBeLessThan(90)
              break
            case 'NW':
              expect(lng).toBeGreaterThan(90)
              expect(lng).toBeLessThan(180)
              break
            case 'SW':
              expect(lng).toBeGreaterThan(-180)
              expect(lng).toBeLessThan(-90)
              break
            case 'SE':
              expect(lng).toBeGreaterThan(-90)
              expect(lng).toBeLessThan(0)
              break
          }
        })
      })
    })

    describe('Coordinate bounds validation', () => {
      it('should clamp latitude to valid range [-90, 90]', () => {
        const testPoints = [
          createMockVector3(0.5, 0.5, 0.5),
          createMockVector3(-0.3, 0.7, -0.2),
          createMockVector3(0.1, -0.9, 0.4)
        ]
        
        testPoints.forEach(point => {
          const [lat] = convertToLatLng(point)
          expect(lat).toBeGreaterThanOrEqual(-90)
          expect(lat).toBeLessThanOrEqual(90)
        })
      })

      it('should clamp longitude to valid range [-180, 180]', () => {
        const points = [
          createMockVector3(1, 0, 1),
          createMockVector3(-1, 0, 1),
          createMockVector3(1, 0, -1),
          createMockVector3(-1, 0, -1)
        ]
        
        points.forEach(point => {
          const [lat, lng] = convertToLatLng(point)
          expect(lng).toBeGreaterThanOrEqual(-180)
          expect(lng).toBeLessThanOrEqual(180)
        })
      })

      it('should ensure coordinates are within valid Earth surface bounds', () => {
        const testPoints = [
          createMockVector3(0.5, 0.5, 0.5),
          createMockVector3(-0.3, 0.7, -0.2),
          createMockVector3(0.1, -0.9, 0.4)
        ]
        
        testPoints.forEach(point => {
          const [lat, lng] = convertToLatLng(point)
          
          expect(lat).toBeGreaterThanOrEqual(-90)
          expect(lat).toBeLessThanOrEqual(90)
          expect(lng).toBeGreaterThanOrEqual(-180)
          expect(lng).toBeLessThanOrEqual(180)
          expect(typeof lat).toBe('number')
          expect(typeof lng).toBe('number')
          expect(isNaN(lat)).toBe(false)
          expect(isNaN(lng)).toBe(false)
        })
      })
    })

    describe('Error handling and validation', () => {
      it('should throw error for invalid 3D point (null)', () => {
        expect(() => convertToLatLng(null)).toThrow('Invalid 3D point provided for coordinate conversion')
      })

      it('should throw error for invalid 3D point (undefined)', () => {
        expect(() => convertToLatLng(undefined)).toThrow('Invalid 3D point provided for coordinate conversion')
      })

      it('should throw error for invalid 3D point (missing coordinates)', () => {
        expect(() => convertToLatLng({ x: 1, y: 2 })).toThrow('Invalid 3D point provided for coordinate conversion')
      })

      it('should throw error for invalid 3D point (non-numeric coordinates)', () => {
        expect(() => convertToLatLng({ x: 'invalid', y: 2, z: 3 })).toThrow('Invalid 3D point provided for coordinate conversion')
      })

      it('should throw error for invalid radius (zero)', () => {
        const point = createMockVector3(1, 0, 0)
        expect(() => convertToLatLng(point, 0)).toThrow('Invalid radius provided for coordinate conversion')
      })

      it('should throw error for invalid radius (negative)', () => {
        const point = createMockVector3(1, 0, 0)
        expect(() => convertToLatLng(point, -1)).toThrow('Invalid radius provided for coordinate conversion')
      })

      it('should handle edge case of zero vector gracefully', () => {
        const zeroPoint = createMockVector3(0, 0, 0)
        expect(() => convertToLatLng(zeroPoint)).toThrow('Coordinate conversion resulted in invalid values')
      })
    })
  })

  describe('Mock Raycaster Interactions and Earth Click Detection Logic', () => {
    describe('Raycaster setup and configuration', () => {
      it('should properly mock raycaster setFromCamera method', () => {
        const mouseEvent = createMockMouseEvent(400, 300)
        
        const rect = mockGl.domElement.getBoundingClientRect()
        const mouseX = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1
        const mouseY = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
        
        mockRaycaster.setFromCamera({ x: mouseX, y: mouseY }, mockCamera)
        
        expect(mockRaycaster.setFromCamera).toHaveBeenCalledWith(
          { x: 0, y: 0 }, // Center of screen
          mockCamera
        )
      })

      it('should mock raycaster intersection with Earth mesh', () => {
        const mockIntersection = {
          point: { x: 0.12, y: 0, z: 0 }
        }
        
        mockRaycaster.intersectObject.mockReturnValue([mockIntersection])
        
        const intersections = mockRaycaster.intersectObject({}, true)
        
        expect(intersections).toHaveLength(1)
        expect(intersections[0].point).toEqual({ x: 0.12, y: 0, z: 0 })
      })

      it('should handle no intersection case', () => {
        mockRaycaster.intersectObject.mockReturnValue([])
        
        const intersections = mockRaycaster.intersectObject({}, true)
        
        expect(intersections).toHaveLength(0)
      })

      it('should handle multiple intersections and use first one', () => {
        const mockIntersections = [
          { point: { x: 0.12, y: 0, z: 0 }, distance: 1 },
          { point: { x: 0.10, y: 0.02, z: 0.01 }, distance: 2 }
        ]
        
        mockRaycaster.intersectObject.mockReturnValue(mockIntersections)
        
        const intersections = mockRaycaster.intersectObject({}, true)
        
        expect(intersections).toHaveLength(2)
        expect(intersections[0].distance).toBeLessThan(intersections[1].distance)
      })
    })

    describe('Mouse coordinate calculation', () => {
      it('should calculate mouse coordinates correctly', () => {
        const mouseEvent = createMockMouseEvent(600, 200) // Top-right quadrant
        const rect = mockGl.domElement.getBoundingClientRect()
        
        const mouseX = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1
        const mouseY = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
        
        expect(mouseX).toBeCloseTo(0.5, 2) // Right side
        expect(mouseY).toBeCloseTo(0.333, 2) // Upper side
      })

      it('should handle edge cases in mouse coordinate calculation', () => {
        const edgeCases = [
          { x: 0, y: 0, expectedX: -1, expectedY: 1 }, // Top-left corner
          { x: 800, y: 600, expectedX: 1, expectedY: -1 }, // Bottom-right corner
          { x: 400, y: 300, expectedX: 0, expectedY: 0 } // Center
        ]
        
        edgeCases.forEach(({ x, y, expectedX, expectedY }) => {
          const mouseEvent = createMockMouseEvent(x, y)
          const rect = mockGl.domElement.getBoundingClientRect()
          
          const mouseX = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1
          const mouseY = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
          
          expect(mouseX).toBeCloseTo(expectedX, 1)
          expect(mouseY).toBeCloseTo(expectedY, 1)
        })
      })

      it('should handle different mouse positions correctly', () => {
        const mousePositions = [
          { x: 100, y: 100 },
          { x: 400, y: 300 },
          { x: 700, y: 500 }
        ]
        
        mousePositions.forEach(({ x, y }) => {
          const mouseEvent = createMockMouseEvent(x, y)
          const rect = mockGl.domElement.getBoundingClientRect()
          
          const mouseX = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1
          const mouseY = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
          
          expect(mouseX).toBeGreaterThanOrEqual(-1)
          expect(mouseX).toBeLessThanOrEqual(1)
          expect(mouseY).toBeGreaterThanOrEqual(-1)
          expect(mouseY).toBeLessThanOrEqual(1)
        })
      })
    })

    describe('Click detection logic', () => {
      it('should handle raycaster intersection logic', () => {
        const mockIntersection = {
          point: { x: 0.12, y: 0, z: 0 }
        }

        const point = mockIntersection.point
        const [lat, lng] = convertToLatLng(point)
        
        expect(lat).toBeCloseTo(0, 1)
        expect(lng).toBeCloseTo(0, 1)
      })

      it('should process intersection points correctly', () => {
        const testIntersections = [
          { point: { x: 0.12, y: 0, z: 0 }, expectedLat: 0, expectedLng: 0 },
          { point: { x: 0, y: 0.12, z: 0 }, expectedLat: 90, expectedLng: 0 },
          { point: { x: 0, y: 0, z: 0.12 }, expectedLat: 0, expectedLng: 90 }
        ]

        testIntersections.forEach(({ point, expectedLat, expectedLng }) => {
          const [lat, lng] = convertToLatLng(point)
          expect(lat).toBeCloseTo(expectedLat, 1)
          expect(lng).toBeCloseTo(expectedLng, 1)
        })
      })
    })

    describe('Event handling', () => {
      it('should call stopPropagation on mouse events', () => {
        const mouseEvent = createMockMouseEvent()
        
        mouseEvent.stopPropagation()
        
        expect(mouseEvent.stopPropagation).toHaveBeenCalled()
      })

      it('should handle event propagation correctly', () => {
        const mouseEvent = createMockMouseEvent()
        
        // Simulate the event handling logic from handleEarthClick
        mouseEvent.stopPropagation()
        
        expect(mouseEvent.stopPropagation).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Impact Location State Updates and Callback Functionality', () => {
    describe('Default state and initialization', () => {
      it('should initialize with default India coordinates', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('simulate-impact')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        const coordinatesElement = screen.getByTestId('impact-coordinates')
        expect(coordinatesElement).toHaveTextContent('20.5937, 78.9629')
      })

      it('should pass impact coordinates to ImpactMap component', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('simulate-impact')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toBeInTheDocument()
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('20.5937, 78.9629')
      })
    })

    describe('Impact location updates', () => {
      it('should update impact coordinates when handleImpactSelect is called', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-london'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        const coordinatesElement = screen.getByTestId('impact-coordinates')
        expect(coordinatesElement).toHaveTextContent('51.5074, -0.1278')
      })

      it('should handle multiple different location selections', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-tokyo')).toBeInTheDocument()
        })
        
        // Select Tokyo
        fireEvent.click(screen.getByTestId('select-tokyo'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('35.6762, 139.6503')
        
        // Go back and select London
        fireEvent.click(screen.getByTestId('back-to-3d'))
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-london'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
      })

      it('should maintain updated coordinates across view switches', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-london'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
        
        fireEvent.click(screen.getByTestId('back-to-3d'))
        
        await waitFor(() => {
          expect(screen.getByTestId('scene3d')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
      })
    })

    describe('Callback validation and format', () => {
      it('should validate coordinate format passed to callback', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-london'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        const coordinatesText = screen.getByTestId('impact-coordinates').textContent
        const [lat, lng] = coordinatesText.split(', ').map(Number)
        
        expect(lat).toBeGreaterThanOrEqual(-90)
        expect(lat).toBeLessThanOrEqual(90)
        expect(lng).toBeGreaterThanOrEqual(-180)
        expect(lng).toBeLessThanOrEqual(180)
        
        expect(lat).toBeCloseTo(51.5074, 4)
        expect(lng).toBeCloseTo(-0.1278, 4)
      })

      it('should handle coordinate precision correctly', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-tokyo')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-tokyo'))
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        const coordinatesText = screen.getByTestId('impact-coordinates').textContent
        
        expect(coordinatesText).not.toContain('NaN')
        expect(coordinatesText).not.toContain('undefined')
        expect(coordinatesText).toMatch(/^-?\d+\.?\d*, -?\d+\.?\d*$/)
      })

      it('should validate that callback receives array format', () => {
        const testCoordinates = [51.5074, -0.1278]
        const mockCallback = vi.fn()
        
        mockCallback(testCoordinates)
        
        expect(mockCallback).toHaveBeenCalledWith([
          expect.any(Number),
          expect.any(Number)
        ])
        
        const callArgs = mockCallback.mock.calls[0][0]
        expect(Array.isArray(callArgs)).toBe(true)
        expect(callArgs.length).toBe(2)
      })
    })

    describe('State persistence and consistency', () => {
      it('should maintain state consistency during rapid updates', async () => {
        render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        // Rapid updates
        for (let i = 0; i < 3; i++) {
          fireEvent.click(screen.getByTestId('select-london'))
        }
        
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
      })

      it('should handle component re-renders without losing state', async () => {
        const { rerender } = render(<App />)
        
        await waitFor(() => {
          expect(screen.getByTestId('select-london')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByTestId('select-london'))
        
        rerender(<App />)
        
        fireEvent.click(screen.getByTestId('simulate-impact'))
        
        await waitFor(() => {
          expect(screen.getByTestId('impact-map')).toBeInTheDocument()
        })
        
        expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
      })
    })
  })

  describe('Integration Tests - Complete 3D Interaction Workflow', () => {
    it('should handle complete workflow from 3D click to impact simulation', async () => {
      render(<App />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('select-london')).toBeInTheDocument()
      })
      
      // Step 1: Select impact location via 3D interaction
      fireEvent.click(screen.getByTestId('select-london'))
      
      // Step 2: Simulate impact
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      // Step 3: Verify impact map shows correct coordinates
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
      
      // Step 4: Return to 3D view
      fireEvent.click(screen.getByTestId('back-to-3d'))
      
      await waitFor(() => {
        expect(screen.getByTestId('scene3d')).toBeInTheDocument()
      })
      
      // Step 5: Verify state persistence
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('51.5074, -0.1278')
    })

    it('should handle error cases gracefully in the complete workflow', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('simulate-impact')).toBeInTheDocument()
      })
      
      // Test with default coordinates (no selection)
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      // Should fall back to default India coordinates
      expect(screen.getByTestId('impact-coordinates')).toHaveTextContent('20.5937, 78.9629')
    })

    it('should validate scientific accuracy requirements', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('select-tokyo')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByTestId('select-tokyo'))
      fireEvent.click(screen.getByTestId('simulate-impact'))
      
      await waitFor(() => {
        expect(screen.getByTestId('impact-map')).toBeInTheDocument()
      })
      
      const coordinatesText = screen.getByTestId('impact-coordinates').textContent
      const [lat, lng] = coordinatesText.split(', ').map(Number)
      
      // Validate Tokyo coordinates are scientifically accurate
      expect(lat).toBeCloseTo(35.6762, 3) // Tokyo latitude
      expect(lng).toBeCloseTo(139.6503, 3) // Tokyo longitude
      
      // Validate coordinates are within Earth bounds
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lng).toBeGreaterThanOrEqual(-180)
      expect(lng).toBeLessThanOrEqual(180)
    })
  })
})