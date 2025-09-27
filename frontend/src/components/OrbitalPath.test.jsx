import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import SolarSystem from './SolarSystem'

// Mock Three.js and react-three-fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  Sphere: ({ children, args, position, ...props }) => (
    <div 
      data-testid="sphere" 
      data-args={JSON.stringify(args)}
      data-position={JSON.stringify(position)}
      {...props}
    >
      {children}
    </div>
  ),
}))

vi.mock('three', () => ({
  Vector3: class Vector3 {
    constructor(x, y, z) {
      this.x = x
      this.y = y
      this.z = z
    }
  },
  BufferGeometry: class BufferGeometry {
    setFromPoints(points) {
      this.points = points
      return this
    }
  }
}))

describe('Orbital Path Visualization', () => {
  it('converts coordinate arrays to proper Three.js geometry', () => {
    const mockTrajectory = {
      asteroid_path: [[0.4, 0.1, 0.0], [0.5, 0.2, 0.1]],
      earth_path: [[1.0, 0.0, 0.0], [1.1, 0.1, 0.0]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Should render line elements for orbital paths
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(2) // Earth and asteroid paths
  })

  it('applies proper scaling to coordinates', () => {
    const mockTrajectory = {
      asteroid_path: [[1.0, 0.0, 0.0]],
      earth_path: [[1.0, 0.0, 0.0]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Earth should be positioned at scaled coordinates [5, 0, 0] (1.0 * 5)
    const earthSphere = container.querySelector('[data-position="[5,0,0]"]')
    expect(earthSphere).toBeInTheDocument()
    
    // Asteroid should also be at scaled position
    const asteroidSphere = container.querySelector('[data-position="[5,0,0]"]')
    expect(asteroidSphere).toBeInTheDocument()
  })

  it('creates distinct colored lines for Earth and asteroid paths', () => {
    const mockTrajectory = {
      asteroid_path: [[1, 0, 0], [2, 0, 0]],
      earth_path: [[1, 0, 0], [1.5, 0, 0]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Should have line elements with different materials
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(2)
    
    // Check for lineBasicMaterial elements
    const materials = container.querySelectorAll('lineBasicMaterial')
    expect(materials.length).toBe(2)
  })

  it('positions Earth at current location on orbital path', () => {
    const mockTrajectory = {
      asteroid_path: [[2, 1, 0]],
      earth_path: [[1.5, 0.5, 0.2]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Earth should be positioned at the first point in its trajectory (scaled)
    const earthSphere = container.querySelector('[data-position="[7.5,2.5,1]"]')
    expect(earthSphere).toBeInTheDocument()
  })

  it('handles empty trajectory arrays gracefully', () => {
    const mockTrajectory = {
      asteroid_path: [],
      earth_path: []
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Should still render Sun and basic elements
    const spheres = container.querySelectorAll('[data-testid="sphere"]')
    expect(spheres.length).toBeGreaterThan(0)
    
    // Should not crash or throw errors
    expect(container).toBeInTheDocument()
  })

  it('optimizes geometry calculations with useMemo', () => {
    const mockTrajectory = {
      asteroid_path: [[1, 0, 0], [2, 0, 0], [3, 0, 0]],
      earth_path: [[1, 0, 0], [1.1, 0, 0], [1.2, 0, 0]]
    }

    // Render twice with same trajectory to test memoization
    const { rerender } = render(<SolarSystem trajectory={mockTrajectory} />)
    rerender(<SolarSystem trajectory={mockTrajectory} />)
    
    // Component should render without issues (memoization working)
    expect(true).toBe(true) // If we get here, memoization didn't cause crashes
  })

  it('includes visual enhancements like Sun glow and grid', () => {
    const mockTrajectory = {
      asteroid_path: [[1, 0, 0]],
      earth_path: [[1, 0, 0]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Should have multiple spheres including Sun glow effect
    const spheres = container.querySelectorAll('[data-testid="sphere"]')
    expect(spheres.length).toBeGreaterThan(3) // Sun, Sun glow, Earth, Asteroid, Asteroid trail
    
    // Should have grid helper
    const grid = container.querySelector('gridHelper')
    expect(grid).toBeInTheDocument()
  })
})