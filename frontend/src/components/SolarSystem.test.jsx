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

describe('SolarSystem Component', () => {
  it('renders without trajectory data', () => {
    const { container } = render(<SolarSystem trajectory={null} />)
    
    // Should still render the Sun
    const spheres = container.querySelectorAll('[data-testid="sphere"]')
    expect(spheres.length).toBeGreaterThan(0)
  })

  it('renders Sun at center', () => {
    const { container } = render(<SolarSystem trajectory={null} />)
    
    const sunSphere = container.querySelector('[data-position="[0,0,0]"]')
    expect(sunSphere).toBeInTheDocument()
    expect(sunSphere.getAttribute('data-args')).toBe('[0.3,32,32]') // Updated size
  })

  it('renders Earth and asteroid when trajectory data is provided', () => {
    const mockTrajectory = {
      asteroid_path: [[2, 0, 0], [2.1, 0.1, 0]],
      earth_path: [[1, 0, 0], [1.1, 0.1, 0]]
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    const spheres = container.querySelectorAll('[data-testid="sphere"]')
    
    // Should have Sun, Sun glow, Earth, Asteroid, and Asteroid trail
    expect(spheres.length).toBe(5)
    
    // Check Earth position (scaled: [1*5, 0*5, 0*5] = [5,0,0])
    const earthSphere = container.querySelector('[data-position="[5,0,0]"]')
    expect(earthSphere).toBeInTheDocument()
    expect(earthSphere.getAttribute('data-args')).toBe('[0.12,32,32]') // Updated size
    
    // Check Asteroid position (scaled: [2*5, 0*5, 0*5] = [10,0,0])
    const asteroidSphere = container.querySelector('[data-position="[10,0,0]"]')
    expect(asteroidSphere).toBeInTheDocument()
    expect(asteroidSphere.getAttribute('data-args')).toBe('[0.04,16,16]') // Updated size
  })

  it('handles empty trajectory arrays', () => {
    const mockTrajectory = {
      asteroid_path: [],
      earth_path: []
    }

    const { container } = render(<SolarSystem trajectory={mockTrajectory} />)
    
    // Should still render Sun, Sun glow, and Earth (with default position)
    const spheres = container.querySelectorAll('[data-testid="sphere"]')
    expect(spheres.length).toBeGreaterThanOrEqual(3)
  })

  it('uses default Earth position when no trajectory data', () => {
    const { container } = render(<SolarSystem trajectory={null} />)
    
    // Earth should be at default position [5, 0, 0] (scaled)
    const earthSphere = container.querySelector('[data-position="[5,0,0]"]')
    expect(earthSphere).toBeInTheDocument()
  })
})