import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ErrorBoundary, { withErrorBoundary, ThreeDErrorBoundary } from '../components/ErrorBoundary'

// Mock component that can throw errors
const ThrowError = ({ shouldThrow, errorMessage }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error')
  }
  return <div data-testid="success">Component rendered successfully</div>
}

// Mock component for testing withErrorBoundary HOC
const TestComponent = ({ message }) => (
  <div data-testid="test-component">{message}</div>
)

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear console errors for clean test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('success')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    expect(screen.queryByTestId('success')).not.toBeInTheDocument()
  })

  it('displays custom error message when provided', () => {
    const customMessage = 'Custom error message for testing'
    
    render(
      <ErrorBoundary errorMessage={customMessage}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it('shows error details when expanded', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed test error" />
      </ErrorBoundary>
    )

    const detailsButton = screen.getByText('Error Details')
    fireEvent.click(detailsButton)

    expect(screen.getByText(/Error:/)).toBeInTheDocument()
    expect(screen.getByText(/Detailed test error/)).toBeInTheDocument()
  })

  it('handles retry functionality', async () => {
    let shouldThrow = true
    
    const RetryableComponent = () => {
      if (shouldThrow) {
        throw new Error('Retryable error')
      }
      return <div data-testid="retry-success">Retry successful</div>
    }

    render(
      <ErrorBoundary>
        <RetryableComponent />
      </ErrorBoundary>
    )

    // Should show error initially
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click retry button
    const retryButton = screen.getByText(/Try Again/)
    
    // Simulate fixing the error
    shouldThrow = false
    fireEvent.click(retryButton)

    // Should show success after retry
    await waitFor(() => {
      expect(screen.getByTestId('retry-success')).toBeInTheDocument()
    })
  })

  it('disables retry button after max attempts', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText(/Try Again/)
    
    // Click retry 3 times
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)

    // Button should be disabled and show max retries message
    expect(screen.getByText('Max Retries Reached')).toBeInTheDocument()
    expect(screen.getByText('Max Retries Reached')).toBeDisabled()
  })

  it('shows help message after max retries', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText(/Try Again/)
    
    // Exhaust retry attempts
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)

    expect(screen.getByText(/If the problem persists/)).toBeInTheDocument()
  })

  it('handles reload functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    fireEvent.click(reloadButton)

    expect(mockReload).toHaveBeenCalledOnce()
  })

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, onRetry, onReload }) => (
      <div data-testid="custom-fallback">
        <h2>Custom Error UI</h2>
        <p>{error.message}</p>
        <button onClick={onRetry}>Custom Retry</button>
        <button onClick={onReload}>Custom Reload</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} errorMessage="Custom error" />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    expect(screen.getByText('Custom error')).toBeInTheDocument()
    expect(screen.getByText('Custom Retry')).toBeInTheDocument()
    expect(screen.getByText('Custom Reload')).toBeInTheDocument()
  })

  it('logs errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Logged error" />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    )
  })

  it('reports errors to global error handler if available', () => {
    const mockReportError = vi.fn()
    window.reportError = mockReportError

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Reported error" />
      </ErrorBoundary>
    )

    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )

    // Clean up
    delete window.reportError
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)

    render(<WrappedComponent message="Test message" />)

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('passes error boundary props correctly', () => {
    const customMessage = 'HOC error message'
    const WrappedComponent = withErrorBoundary(TestComponent, {
      errorMessage: customMessage
    })

    const ThrowingTestComponent = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('HOC test error')
      }
      return <TestComponent message="Success" />
    }

    const WrappedThrowingComponent = withErrorBoundary(ThrowingTestComponent, {
      errorMessage: customMessage
    })

    render(<WrappedThrowingComponent shouldThrow={true} />)

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it('sets correct display name', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })
})

describe('ThreeDErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when there is no error', () => {
    render(
      <ThreeDErrorBoundary>
        <div data-testid="3d-content">3D Scene</div>
      </ThreeDErrorBoundary>
    )

    expect(screen.getByTestId('3d-content')).toBeInTheDocument()
  })

  it('renders 3D-specific error UI when child throws', () => {
    render(
      <ThreeDErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="WebGL error" />
      </ThreeDErrorBoundary>
    )

    expect(screen.getByText('3D Visualization Unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Your browser may not support WebGL/)).toBeInTheDocument()
    expect(screen.getByText('Try these solutions:')).toBeInTheDocument()
    expect(screen.getByText(/Update your browser/)).toBeInTheDocument()
    expect(screen.getByText(/Enable hardware acceleration/)).toBeInTheDocument()
  })

  it('provides WebGL test link', () => {
    render(
      <ThreeDErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ThreeDErrorBoundary>
    )

    const webglLink = screen.getByText('WebGL Test')
    expect(webglLink).toBeInTheDocument()
    expect(webglLink.getAttribute('href')).toBe('https://get.webgl.org/')
    expect(webglLink.getAttribute('target')).toBe('_blank')
    expect(webglLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('handles reload functionality', () => {
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })

    render(
      <ThreeDErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ThreeDErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload and Try Again')
    fireEvent.click(reloadButton)

    expect(mockReload).toHaveBeenCalledOnce()
  })

  it('logs 3D rendering errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ThreeDErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="3D rendering error" />
      </ThreeDErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      '3D Rendering Error:',
      expect.any(Error),
      expect.any(Object)
    )
  })
})

describe('Error Boundary Integration', () => {
  it('handles nested error boundaries correctly', () => {
    render(
      <ErrorBoundary errorMessage="Outer boundary">
        <div>
          <ThreeDErrorBoundary>
            <ThrowError shouldThrow={true} errorMessage="Inner error" />
          </ThreeDErrorBoundary>
        </div>
      </ErrorBoundary>
    )

    // Inner boundary should catch the error
    expect(screen.getByText('3D Visualization Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument()
  })

  it('outer boundary catches errors from inner components', () => {
    const ProblematicInnerComponent = () => {
      throw new Error('Inner component error')
    }

    render(
      <ErrorBoundary errorMessage="Outer boundary caught error">
        <div>
          <ProblematicInnerComponent />
        </div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Outer boundary caught error')).toBeInTheDocument()
  })
})