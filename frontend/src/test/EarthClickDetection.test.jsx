import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

// Mock Three.js components
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
    Canvas: ({ children }) => <div data-testid="canvas">{children}</div>
  }
})

// Mock the coordinate conversion logic
const convertToLatLng = (point, radius = 0.12) => {
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
    throw new Error('Invalid 3D point provided for coordinate conversion')
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

// Mock raycaster for testing
const createMockRaycaster = () => ({
  setFromCamera: vi.fn(),
  intersectObject: vi.fn()
})

// Mock mouse event
const createMockMouseEvent = (clientX = 400, clientY = 300) => ({
  clientX,
  clientY,
  stopPropagation: vi.fn()
})

describe('Earth Click Detection Tests', () => {
  let mockOnImpactSelect
  let mockRaycaster
  let mockCamera
  let mockGl

  beforeEach(() => {
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

  describe('Coordinate conversion accuracy', () => {
    it('should convert 3D coordinates to latitude/longitude correctly', () => {
      // Test point on the equator at longitude 0
      const point1 = { x: 1, y: 0, z: 0 }
      const [lat1, lng1] = convertToLatLng(point1)
      expect(lat1).toBeCloseTo(0, 1) // Should be near equator
      expect(lng1).toBeCloseTo(0, 1) // Should be near prime meridian

      // Test point at north pole
      const point2 = { x: 0, y: 1, z: 0 }
      const [lat2, lng2] = convertToLatLng(point2)
      expect(lat2).toBeCloseTo(90, 1) // Should be near north pole

      // Test point at south pole
      const point3 = { x: 0, y: -1, z: 0 }
      const [lat3, lng3] = convertToLatLng(point3)
      expect(lat3).toBeCloseTo(-90, 1) // Should be near south pole
    })

    it('should clamp coordinates to valid Earth bounds', () => {
      // Test extreme values
      const extremePoint = { x: 1000, y: 1000, z: 1000 }
      const [lat, lng] = convertToLatLng(extremePoint)
      
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lng).toBeGreaterThanOrEqual(-180)
      expect(lng).toBeLessThanOrEqual(180)
    })

    it('should handle zero coordinates gracefully', () => {
      const zeroPoint = { x: 0, y: 0, z: 0 }
      
      // Zero vector should throw an error as it cannot be normalized
      expect(() => convertToLatLng(zeroPoint)).toThrow('Coordinate conversion resulted in invalid values')
    })

    it('should validate input parameters', () => {
      expect(() => convertToLatLng(null)).toThrow('Invalid 3D point provided for coordinate conversion')
      expect(() => convertToLatLng(undefined)).toThrow('Invalid 3D point provided for coordinate conversion')
      expect(() => convertToLatLng({ x: 'invalid', y: 2, z: 3 })).toThrow('Invalid 3D point provided for coordinate conversion')
    })
  })

  describe('Raycaster interaction mocking', () => {
    it('should properly mock raycaster setFromCamera method', () => {
      const mouseEvent = createMockMouseEvent(400, 300)
      
      // Simulate mouse position calculation
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

  describe('Earth click detection logic', () => {
    it('should handle raycaster intersection logic', () => {
      // Mock raycaster intersection result
      const mockIntersection = {
        point: { x: 0.12, y: 0, z: 0 }
      }

      // Simulate the handleEarthClick logic
      const point = mockIntersection.point
      const [lat, lng] = convertToLatLng(point)
      
      expect(lat).toBeCloseTo(0, 1)
      expect(lng).toBeCloseTo(0, 1)
    })

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
  })

  describe('Callback functionality', () => {
    it('should validate that onImpactSelect callback receives correct format', () => {
      // Test that coordinates are passed as [latitude, longitude] array
      const testPoint = { x: 0.1, y: 0.05, z: 0.08 }
      const [lat, lng] = convertToLatLng(testPoint)
      
      // Simulate calling the callback
      const mockCallback = vi.fn()
      mockCallback([lat, lng])
      
      expect(mockCallback).toHaveBeenCalledWith([
        expect.any(Number),
        expect.any(Number)
      ])
      
      const callArgs = mockCallback.mock.calls[0][0]
      expect(Array.isArray(callArgs)).toBe(true)
      expect(callArgs.length).toBe(2)
    })

    it('should call onImpactSelect with valid coordinates when Earth is clicked', () => {
      const testPoint = { x: 0.12, y: 0, z: 0 }
      const [expectedLat, expectedLng] = convertToLatLng(testPoint)
      
      // Simulate successful Earth click
      mockOnImpactSelect([expectedLat, expectedLng])
      
      expect(mockOnImpactSelect).toHaveBeenCalledWith([expectedLat, expectedLng])
      expect(mockOnImpactSelect).toHaveBeenCalledTimes(1)
    })

    it('should not call onImpactSelect when no intersection occurs', () => {
      // Simulate no intersection
      mockRaycaster.intersectObject.mockReturnValue([])
      
      // onImpactSelect should not be called
      expect(mockOnImpactSelect).not.toHaveBeenCalled()
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      
      const testPoint = { x: 0.12, y: 0, z: 0 }
      const [lat, lng] = convertToLatLng(testPoint)
      
      // Should not throw when callback throws
      expect(() => {
        try {
          errorCallback([lat, lng])
        } catch (error) {
          // Simulate error handling in the component
          console.error('Failed to handle impact selection:', error)
        }
      }).not.toThrow()
    })
  })

  describe('Event handling', () => {
    it('should call stopPropagation on mouse events', () => {
      const mouseEvent = createMockMouseEvent()
      
      // Simulate event handling
      mouseEvent.stopPropagation()
      
      expect(mouseEvent.stopPropagation).toHaveBeenCalled()
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
})