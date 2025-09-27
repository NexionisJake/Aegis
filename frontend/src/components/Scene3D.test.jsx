import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Scene3D from './Scene3D'

// Mock Three.js and react-three-fiber components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }) => (
    <div data-testid="three-canvas" {...props}>
      {children}
    </div>
  ),
  useFrame: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: () => <div data-testid="stars" />,
  Sphere: ({ children, ...props }) => (
    <div data-testid="sphere" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('./SolarSystem', () => ({
  default: ({ trajectory }) => (
    <div data-testid="solar-system">
      {trajectory && <span data-testid="trajectory-rendered">Trajectory rendered</span>}
    </div>
  )
}))

describe('Scene3D Component', () => {
  const mockOnSimulateImpact = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 3D canvas and controls', () => {
    render(<Scene3D trajectory={null} onSimulateImpact={mockOnSimulateImpact} />)
    
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('stars')).toBeInTheDocument()
    expect(screen.getByTestId('solar-system')).toBeInTheDocument()
  })

  it('shows loading state when no trajectory data', () => {
    render(<Scene3D trajectory={null} onSimulateImpact={mockOnSimulateImpact} />)
    
    expect(screen.getByText('Loading trajectory data...')).toBeInTheDocument()
    expect(screen.queryByText('Simulate Impact')).not.toBeInTheDocument()
  })

  it('displays trajectory information when data is loaded', () => {
    const mockTrajectory = {
      asteroid_path: [[1, 2, 3], [4, 5, 6]],
      earth_path: [[7, 8, 9], [10, 11, 12]]
    }

    render(<Scene3D trajectory={mockTrajectory} onSimulateImpact={mockOnSimulateImpact} />)
    
    expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
    expect(screen.getByText('Asteroid points: 2')).toBeInTheDocument()
    expect(screen.getByText('Earth points: 2')).toBeInTheDocument()
    expect(screen.getByTestId('trajectory-rendered')).toBeInTheDocument()
  })

  it('shows simulate impact button when trajectory is loaded', () => {
    const mockTrajectory = {
      asteroid_path: [[1, 2, 3]],
      earth_path: [[4, 5, 6]]
    }

    render(<Scene3D trajectory={mockTrajectory} onSimulateImpact={mockOnSimulateImpact} />)
    
    const simulateButton = screen.getByText('🌍 Simulate Impact')
    expect(simulateButton).toBeInTheDocument()
    
    fireEvent.click(simulateButton)
    expect(mockOnSimulateImpact).toHaveBeenCalledTimes(1)
  })

  it('displays control instructions', () => {
    render(<Scene3D trajectory={null} onSimulateImpact={mockOnSimulateImpact} />)
    
    expect(screen.getByText(/Drag to rotate/)).toBeInTheDocument()
    expect(screen.getByText(/Scroll to zoom/)).toBeInTheDocument()
    expect(screen.getByText(/Right-click to pan/)).toBeInTheDocument()
  })

  it('has proper CSS classes for styling', () => {
    const { container } = render(<Scene3D trajectory={null} onSimulateImpact={mockOnSimulateImpact} />)
    
    expect(container.querySelector('.scene3d-container')).toBeInTheDocument()
    expect(container.querySelector('.scene3d-overlay')).toBeInTheDocument()
    expect(container.querySelector('.scene3d-info')).toBeInTheDocument()
    expect(container.querySelector('.scene3d-controls')).toBeInTheDocument()
  })
})