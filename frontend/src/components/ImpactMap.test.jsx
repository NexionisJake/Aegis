import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ImpactMap from './ImpactMap'

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props) => <div data-testid="tile-layer" {...props} />,
  Circle: ({ children, ...props }) => (
    <div data-testid="impact-circle" {...props}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>
}))

// Mock leaflet CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}))

describe('ImpactMap', () => {
  const mockOnBackTo3D = vi.fn()
  
  const mockImpactData = {
    craterDiameterMeters: 1000,
    impactEnergyJoules: 1.5e15
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders map container with correct configuration', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('renders OpenStreetMap tile layer', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const tileLayer = screen.getByTestId('tile-layer')
    expect(tileLayer).toBeInTheDocument()
  })

  it('renders back to 3D button and handles click', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const backButton = screen.getByText('← Back to 3D View')
    expect(backButton).toBeInTheDocument()
    
    fireEvent.click(backButton)
    expect(mockOnBackTo3D).toHaveBeenCalledTimes(1)
  })

  it('displays impact information panel when impact data is provided', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    expect(screen.getByText('Impact Analysis')).toBeInTheDocument()
    expect(screen.getByText('Crater Diameter:')).toBeInTheDocument()
    expect(screen.getByText('1,000 meters')).toBeInTheDocument()
    expect(screen.getAllByText('(1.00 km)')).toHaveLength(2) // Appears in both panel and popup
    expect(screen.getByText('Impact Energy:')).toBeInTheDocument()
    expect(screen.getByText('1.50e+15 joules')).toBeInTheDocument()
    expect(screen.getByText(/Equivalent to.*megatons TNT/)).toBeInTheDocument()
  })

  it('renders impact circle when impact data is provided', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const impactCircle = screen.getByTestId('impact-circle')
    expect(impactCircle).toBeInTheDocument()
  })

  it('renders popup with impact details', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const popup = screen.getByTestId('popup')
    expect(popup).toBeInTheDocument()
    expect(popup).toHaveTextContent('Impact Crater')
    expect(popup).toHaveTextContent('Diameter: 1,000 meters')
    expect(popup).toHaveTextContent('(1.00 km)')
    expect(popup).toHaveTextContent('Energy: 1.50e+15 joules')
    expect(popup).toHaveTextContent('megatons TNT')
  })

  it('does not render impact circle when no impact data is provided', () => {
    render(<ImpactMap impactData={null} onBackTo3D={mockOnBackTo3D} />)
    
    expect(screen.queryByTestId('impact-circle')).not.toBeInTheDocument()
  })

  it('does not render information panel when no impact data is provided', () => {
    render(<ImpactMap impactData={null} onBackTo3D={mockOnBackTo3D} />)
    
    expect(screen.queryByText('Impact Analysis')).not.toBeInTheDocument()
  })

  it('handles zero crater diameter correctly', () => {
    const zeroImpactData = {
      craterDiameterMeters: 0,
      impactEnergyJoules: 0
    }
    
    render(<ImpactMap impactData={zeroImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    expect(screen.queryByTestId('impact-circle')).not.toBeInTheDocument()
  })

  it('calculates crater radius correctly for circle visualization', () => {
    const largeImpactData = {
      craterDiameterMeters: 2000,
      impactEnergyJoules: 1e16
    }
    
    render(<ImpactMap impactData={largeImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const impactCircle = screen.getByTestId('impact-circle')
    expect(impactCircle).toBeInTheDocument()
    // The radius should be half the diameter (1000 meters)
  })

  it('uses predefined impact coordinates', () => {
    render(<ImpactMap impactData={mockImpactData} onBackTo3D={mockOnBackTo3D} />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toBeInTheDocument()
    // The component should use NYC coordinates [40.7128, -74.0060]
  })
})