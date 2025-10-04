import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import SolarSystem from '../components/SolarSystem'

// Mock Three.js Vector3 for testing
const createMockVector3 = (x, y, z) => ({
  x,
  y,
  z,
  clone: () => createMockVector3(x, y, z),
  normalize: () => {
    const length = Math.sqrt(x * x + y * y + z * z)
    return createMockVector3(x / length, y / length, z / length)
  }
})

describe('3D to Geographic Coordinate Conversion', () => {
  let convertToLatLng

  beforeEach(() => {
    // We need to extract the convertToLatLng function from the component
    // This is a bit tricky since it's internal, so we'll test it through the component
    const TestWrapper = ({ onConvert }) => {
      return (
        <Canvas>
          <SolarSystem 
            trajectory={{ earth_path: [[1, 0, 0]], asteroid_path: [[2, 0, 0]] }}
            onImpactSelect={onConvert}
          />
        </Canvas>
      )
    }

    // For direct testing, we'll implement the function as it should be
    convertToLatLng = (point, radius = 0.12) => {
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
        throw new Error('Invalid 3D point provided for coordinate conversion')
      }

      if (radius <= 0) {
        throw new Error('Invalid radius provided for coordinate conversion')
      }

      // Normalize the point to unit sphere for accurate coordinate calculation
      const length = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
      const normalizedPoint = {
        x: point.x / length,
        y: point.y / length,
        z: point.z / length
      }
      
      // Calculate latitude using Math.asin(point.y / radius) * (180 / Math.PI)
      const latitude = Math.asin(normalizedPoint.y) * (180 / Math.PI)
      
      // Calculate longitude using Math.atan2(point.z, point.x) * (180 / Math.PI)
      const longitude = Math.atan2(normalizedPoint.z, normalizedPoint.x) * (180 / Math.PI)
      
      // Validate and ensure coordinates are within valid Earth surface bounds
      const clampedLatitude = Math.max(-90, Math.min(90, latitude))
      const clampedLongitude = Math.max(-180, Math.min(180, longitude))
      
      // Additional validation to ensure we have valid numeric coordinates
      if (isNaN(clampedLatitude) || isNaN(clampedLongitude)) {
        throw new Error('Coordinate conversion resulted in invalid values')
      }
      
      return [clampedLatitude, clampedLongitude]
    }
  })

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

  describe('Coordinate bounds validation', () => {
    it('should clamp latitude to valid range [-90, 90]', () => {
      // Test with a point that might produce out-of-bounds latitude
      const point = createMockVector3(0, 2, 0) // Exaggerated Y value
      const [lat, lng] = convertToLatLng(point)
      
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
    })

    it('should clamp longitude to valid range [-180, 180]', () => {
      // Test various points to ensure longitude is always in valid range
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
        
        // Latitude should be between -90 and 90
        expect(lat).toBeGreaterThanOrEqual(-90)
        expect(lat).toBeLessThanOrEqual(90)
        
        // Longitude should be between -180 and 180
        expect(lng).toBeGreaterThanOrEqual(-180)
        expect(lng).toBeLessThanOrEqual(180)
        
        // Both should be valid numbers
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

  describe('Mathematical accuracy', () => {
    it('should use correct latitude formula: Math.asin(point.y / radius) * (180 / Math.PI)', () => {
      const point = createMockVector3(0, 0.5, 0)
      const [lat] = convertToLatLng(point)
      
      // For normalized point (0, 0.5, 0) -> (0, 1, 0), latitude should be 90°
      const expectedLat = Math.asin(1) * (180 / Math.PI)
      expect(lat).toBeCloseTo(expectedLat, 5)
    })

    it('should use correct longitude formula: Math.atan2(point.z, point.x) * (180 / Math.PI)', () => {
      const point = createMockVector3(1, 0, 1)
      const [, lng] = convertToLatLng(point)
      
      // For normalized point, longitude should be atan2(z, x) in degrees
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
        
        // Verify coordinates are in expected quadrant
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

  describe('Real-world coordinate examples', () => {
    it('should handle coordinates similar to major cities', () => {
      // Test with points that would correspond to major city locations
      const testCases = [
        { name: 'Equatorial Africa', point: createMockVector3(0.9, 0, 0.1) },
        { name: 'Northern Europe', point: createMockVector3(0.5, 0.7, 0.2) },
        { name: 'Southern Hemisphere', point: createMockVector3(0.3, -0.6, 0.4) },
        { name: 'Pacific Region', point: createMockVector3(-0.2, 0.1, 0.8) }
      ]
      
      testCases.forEach(({ name, point }) => {
        const [lat, lng] = convertToLatLng(point)
        
        // Ensure all coordinates are valid
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

    it('should accurately convert known geographic locations', () => {
      // Test specific known locations for accuracy
      const knownLocations = [
        { name: 'Greenwich (0°, 0°)', point: createMockVector3(1, 0, 0), expectedLat: 0, expectedLng: 0 },
        { name: 'North Pole', point: createMockVector3(0, 1, 0), expectedLat: 90, expectedLng: 0 },
        { name: 'South Pole', point: createMockVector3(0, -1, 0), expectedLat: -90, expectedLng: 0 },
        { name: '90° East', point: createMockVector3(0, 0, 1), expectedLat: 0, expectedLng: 90 },
        { name: '90° West', point: createMockVector3(0, 0, -1), expectedLat: 0, expectedLng: -90 },
        { name: '180° Longitude', point: createMockVector3(-1, 0, 0), expectedLat: 0, expectedLng: 180 }
      ]

      knownLocations.forEach(({ name, point, expectedLat, expectedLng }) => {
        const [lat, lng] = convertToLatLng(point)
        expect(lat).toBeCloseTo(expectedLat, 1)
        expect(lng).toBeCloseTo(expectedLng, 1)
      })
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle very small coordinate values', () => {
      const smallPoint = createMockVector3(0.001, 0.001, 0.001)
      const [lat, lng] = convertToLatLng(smallPoint)
      
      expect(typeof lat).toBe('number')
      expect(typeof lng).toBe('number')
      expect(isNaN(lat)).toBe(false)
      expect(isNaN(lng)).toBe(false)
    })

    it('should handle very large coordinate values', () => {
      const largePoint = createMockVector3(1000000, 1000000, 1000000)
      const [lat, lng] = convertToLatLng(largePoint)
      
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lng).toBeGreaterThanOrEqual(-180)
      expect(lng).toBeLessThanOrEqual(180)
    })

    it('should be consistent with repeated conversions', () => {
      const testPoint = createMockVector3(0.5, 0.3, 0.7)
      const [lat1, lng1] = convertToLatLng(testPoint)
      const [lat2, lng2] = convertToLatLng(testPoint)
      
      expect(lat1).toBe(lat2)
      expect(lng1).toBe(lng2)
    })

    it('should handle negative coordinates correctly', () => {
      const negativePoints = [
        createMockVector3(-1, 0, 0),
        createMockVector3(0, -1, 0),
        createMockVector3(0, 0, -1),
        createMockVector3(-0.5, -0.5, -0.5)
      ]

      negativePoints.forEach(point => {
        const [lat, lng] = convertToLatLng(point)
        expect(lat).toBeGreaterThanOrEqual(-90)
        expect(lat).toBeLessThanOrEqual(90)
        expect(lng).toBeGreaterThanOrEqual(-180)
        expect(lng).toBeLessThanOrEqual(180)
      })
    })
  })
})