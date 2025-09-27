import React from 'react'
import './ErrorBoundary.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Report error to logging service if available
    if (window.reportError) {
      window.reportError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state
      const { fallback: CustomFallback } = this.props

      // If a custom fallback component is provided, use it
      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            retryCount={retryCount}
          />
        )
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              {this.props.errorMessage || 
               "An unexpected error occurred while rendering this component."}
            </p>
            
            {error && (
              <details className="error-boundary-details">
                <summary>Error Details</summary>
                <div className="error-boundary-stack">
                  <strong>Error:</strong> {error.toString()}
                  {errorInfo && (
                    <>
                      <br />
                      <strong>Component Stack:</strong>
                      <pre>{errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-boundary-actions">
              <button 
                onClick={this.handleRetry}
                className="error-boundary-button retry"
                disabled={retryCount >= 3}
              >
                {retryCount >= 3 ? 'Max Retries Reached' : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
              </button>
              <button 
                onClick={this.handleReload}
                className="error-boundary-button reload"
              >
                Reload Page
              </button>
            </div>

            {retryCount >= 3 && (
              <p className="error-boundary-help">
                If the problem persists, please try reloading the page or contact support.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Specialized error boundary for 3D rendering
export class ThreeDErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Rendering Error:', error, errorInfo)
    this.setState({ error })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="threejs-error-fallback">
          <div className="threejs-error-content">
            <h3>3D Visualization Unavailable</h3>
            <p>
              Your browser may not support WebGL or there was an error loading the 3D scene.
            </p>
            <div className="threejs-error-suggestions">
              <h4>Try these solutions:</h4>
              <ul>
                <li>Update your browser to the latest version</li>
                <li>Enable hardware acceleration in your browser settings</li>
                <li>Try using a different browser (Chrome, Firefox, Safari)</li>
                <li>Check if WebGL is supported: <a href="https://get.webgl.org/" target="_blank" rel="noopener noreferrer">WebGL Test</a></li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="error-boundary-button reload"
            >
              Reload and Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary