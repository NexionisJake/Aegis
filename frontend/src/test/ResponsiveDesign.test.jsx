import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { enhancedApi } from '../utils/apiClient'

// Mock the enhanced API
vi.mock('../utils/apiClient', () => ({
  enhancedApi: {
    getTrajectory: vi.fn(),
    calculateImpact: vi.fn(),
  },
  APIError: class APIError extends Error {
    constructor(message, status) {
      super(message)
      this.status = status
    }
  },
  NetworkError: class NetworkError extends Error {},
  TimeoutError: class TimeoutError extends Error {},
}))

// Mock trajectory data
const mockTrajectoryData = {
  earth_path: Array.from({ length: 365 }, (_, i) => [
    Math.cos(i * 0.017) * 1.0,
    0,
    Math.sin(i * 0.017) * 1.0
  ]),
  asteroid_path: Array.from({ length: 365 }, (_, i) => [
    Math.cos(i * 0.015) * 1.2,
    Math.sin(i * 0.01) * 0.1,
    Math.sin(i * 0.015) * 1.2
  ])
}

// Mock impact data
const mockImpactData = {
  craterDiameterMeters: 3400,
  impactEnergyJoules: 1.2e16
}

// Utility function to simulate different viewport sizes
const setViewportSize = (width, height) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enhancedApi.getTrajectory.mockResolvedValue(mockTrajectoryData)
    enhancedApi.calculateImpact.mockResolvedValue(mockImpactData)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Reset viewport to default
    setViewportSize(1024, 768)
  })

  describe('Desktop Layout (1920x1080)', () => {
    beforeEach(() => {
      setViewportSize(1920, 1080)
    })

    it('should display full desktop layout', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Verify header elements are properly positioned
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('Impact Map')).toBeInTheDocument()

      // Verify 3D scene info panel
      expect(screen.getByText('Orbital Visualization')).toBeInTheDocument()
      expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()

      // Verify simulate impact button
      expect(screen.getByText('🌍 Simulate Impact')).toBeInTheDocument()

      // Verify controls are visible
      expect(screen.getByText(/Drag to rotate • Scroll to zoom • Right-click to pan/)).toBeInTheDocument()
    })

    it('should have proper spacing and layout for large screens', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Verify container structure
      const appContainer = container.querySelector('.app')
      expect(appContainer).toBeInTheDocument()

      const header = container.querySelector('.app-header')
      expect(header).toBeInTheDocument()

      const main = container.querySelector('.app-main')
      expect(main).toBeInTheDocument()
    })
  })

  describe('Tablet Layout (768x1024)', () => {
    beforeEach(() => {
      setViewportSize(768, 1024)
    })

    it('should adapt layout for tablet screens', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // All main elements should still be visible
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('Impact Map')).toBeInTheDocument()
      expect(screen.getByText('🌍 Simulate Impact')).toBeInTheDocument()
    })

    it('should maintain functionality on tablet screens', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Test view switching
      const simulateButton = screen.getByText('🌍 Simulate Impact')
      await user.click(simulateButton)

      await waitFor(() => {
        const impactMapButton = screen.getByText('Impact Map')
        expect(impactMapButton).toHaveClass('active')
      })

      // Switch back to 3D view
      const view3DButton = screen.getByText('3D Orbital View')
      await user.click(view3DButton)

      expect(view3DButton).toHaveClass('active')
    })
  })

  describe('Mobile Layout (375x667)', () => {
    beforeEach(() => {
      setViewportSize(375, 667)
    })

    it('should adapt layout for mobile screens', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Essential elements should be visible
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('Impact Map')).toBeInTheDocument()
      expect(screen.getByText('🌍 Simulate Impact')).toBeInTheDocument()
    })

    it('should maintain touch-friendly interactions on mobile', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Test button interactions
      const simulateButton = screen.getByText('🌍 Simulate Impact')
      expect(simulateButton).toBeInTheDocument()

      // Button should be clickable/tappable
      await user.click(simulateButton)

      await waitFor(() => {
        const impactMapButton = screen.getByText('Impact Map')
        expect(impactMapButton).toHaveClass('active')
      })
    })

    it('should handle mobile-specific interactions', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Verify touch-friendly controls are available
      expect(screen.getByText(/Drag to rotate • Scroll to zoom • Right-click to pan/)).toBeInTheDocument()
    })
  })

  describe('Small Mobile Layout (320x568)', () => {
    beforeEach(() => {
      setViewportSize(320, 568)
    })

    it('should work on very small screens', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Core functionality should remain
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('3D Orbital View')).toBeInTheDocument()
      expect(screen.getByText('🌍 Simulate Impact')).toBeInTheDocument()
    })

    it('should maintain usability on small screens', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Test core workflow
      const simulateButton = screen.getByText('🌍 Simulate Impact')
      await user.click(simulateButton)

      await waitFor(() => {
        const impactMapButton = screen.getByText('Impact Map')
        expect(impactMapButton).toHaveClass('active')
      })
    })
  })

  describe('Ultra-wide Layout (2560x1080)', () => {
    beforeEach(() => {
      setViewportSize(2560, 1080)
    })

    it('should utilize ultra-wide screen space effectively', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // All elements should be properly positioned
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('Orbital Visualization')).toBeInTheDocument()
      expect(screen.getByText('🌍 Simulate Impact')).toBeInTheDocument()
    })
  })

  describe('Orientation Changes', () => {
    it('should handle landscape to portrait orientation change', async () => {
      // Start in landscape
      setViewportSize(1024, 768)
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Change to portrait
      setViewportSize(768, 1024)

      // Application should still function
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
    })

    it('should handle portrait to landscape orientation change', async () => {
      // Start in portrait
      setViewportSize(768, 1024)
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Change to landscape
      setViewportSize(1024, 768)

      // Application should still function
      expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
    })
  })

  describe('Dynamic Viewport Changes', () => {
    it('should handle rapid viewport size changes', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Simulate rapid viewport changes
      const viewportSizes = [
        [1920, 1080],
        [768, 1024],
        [375, 667],
        [320, 568],
        [2560, 1080]
      ]

      for (const [width, height] of viewportSizes) {
        setViewportSize(width, height)
        
        // Application should remain stable
        expect(screen.getByText('Project Aegis - Asteroid Impact Simulator')).toBeInTheDocument()
      }
    })

    it('should maintain state during viewport changes', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Switch to impact view
      const simulateButton = screen.getByText('🌍 Simulate Impact')
      await user.click(simulateButton)

      await waitFor(() => {
        const impactMapButton = screen.getByText('Impact Map')
        expect(impactMapButton).toHaveClass('active')
      })

      // Change viewport size
      setViewportSize(375, 667)

      // State should be maintained
      const impactMapButtonAfterResize = screen.getByText('Impact Map')
      expect(impactMapButtonAfterResize).toHaveClass('active')
    })
  })

  describe('Performance on Different Screen Sizes', () => {
    it('should maintain performance on large screens', async () => {
      setViewportSize(2560, 1440)
      
      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time even on large screens
      expect(renderTime).toBeLessThan(5000)
    })

    it('should maintain performance on small screens', async () => {
      setViewportSize(320, 568)
      
      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render efficiently on small screens
      expect(renderTime).toBeLessThan(3000)
    })
  })

  describe('Accessibility Across Screen Sizes', () => {
    it('should maintain accessibility on mobile screens', async () => {
      setViewportSize(375, 667)
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // Buttons should be accessible
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })

    it('should maintain accessibility on desktop screens', async () => {
      setViewportSize(1920, 1080)
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✓ Trajectory data loaded')).toBeInTheDocument()
      })

      // All interactive elements should be accessible
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })
  })
})