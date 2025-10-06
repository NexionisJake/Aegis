import axios from 'axios'

// Custom error classes
export class APIError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class NetworkError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'NetworkError'
    this.originalError = originalError
  }
}

export class TimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT']
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Calculate delay with exponential backoff and jitter
const calculateDelay = (attempt, config) => {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
  const clampedDelay = Math.min(exponentialDelay, config.maxDelay)
  // Add jitter (±25% of the delay)
  const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, clampedDelay + jitter)
}

// Check if error is retryable
const isRetryableError = (error, config) => {
  // Network errors
  if (error.code && config.retryableErrors.includes(error.code)) {
    return true
  }
  
  // HTTP status codes
  if (error.response && config.retryableStatuses.includes(error.response.status)) {
    return true
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return true
  }
  
  return false
}

// Retry wrapper function
const withRetry = async (fn, config = DEFAULT_RETRY_CONFIG) => {
  let lastError
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        break
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, config)) {
        break
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config)
      console.warn(`API request failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${Math.round(delay)}ms...`, error.message)
      
      await sleep(delay)
    }
  }
  
  // All attempts failed, throw the last error
  throw lastError
}

// Get API base URL from environment variables with fallback
const getApiBaseUrl = () => {
  // Use environment variable if available, otherwise fallback to localhost
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  // Ensure /api suffix is added
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
}

// Create axios instance with enhanced configuration
const createApiClient = (baseURL = getApiBaseUrl(), options = {}) => {
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  })

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
      return config
    },
    (error) => {
      console.error('API Request Error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      console.log(`API Response: ${response.status} ${response.config.url}`)
      return response
    },
    (error) => {
      console.error('API Response Error:', error.message)
      
      // Transform axios errors into our custom error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new TimeoutError('Request timed out. Please check your connection and try again.')
      }
      
      if (!error.response) {
        // Network error
        throw new NetworkError(
          'Unable to connect to the server. Please check your internet connection.',
          error
        )
      }
      
      // HTTP error with response
      const { status, data } = error.response
      const message = data?.message || data?.detail || error.message || 'An unexpected error occurred'
      const code = data?.error_code || data?.code
      const details = data?.details
      
      throw new APIError(message, status, code, details)
    }
  )

  return client
}

// Create the default API client
let apiClient
try {
  apiClient = createApiClient()
} catch (error) {
  // Handle case where axios is not available (e.g., in tests)
  console.warn('Failed to create API client:', error.message)
  apiClient = null
}

// Enhanced API methods with retry logic
export const api = {
  // Get trajectory data with retry
  async getTrajectory(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.get(`/trajectory/${encodeURIComponent(asteroidName)}`)
      return response.data
    }, retryConfig)
  },

  // Get asteroid data with retry
  async getAsteroid(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.get(`/asteroid/${encodeURIComponent(asteroidName)}`)
      return response.data
    }, retryConfig)
  },

  // Calculate impact with retry
  async calculateImpact(impactParams, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.post('/impact/calculate', impactParams)
      return response.data
    }, retryConfig)
  },

  // Calculate impact for specific asteroid using real NASA parameters
  async calculateAsteroidImpact(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.post(`/impact/calculate/${encodeURIComponent(asteroidName)}`)
      return response.data
    }, retryConfig)
  },

  // Get list of featured asteroids
  async getAsteroidsList(retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.get('/asteroids/list')
      return response.data
    }, retryConfig)
  },

  // Get top 10 nearest asteroids with trajectories
  async getTop10Nearest(retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.get('/asteroids/top-10-nearest')
      return response.data
    }, retryConfig)
  },

  // Calculate deflection trajectory
  async calculateDeflection(deflectionParams, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.post('/deflection/calculate', deflectionParams)
      return response.data
    }, retryConfig)
  },

  // Health check
  async healthCheck() {
    if (!apiClient) throw new NetworkError('API client not available')
    const response = await apiClient.get('/health')
    return response.data
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 60000 // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000 // 10 seconds
    
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.lastFailureTime = null
    this.nextAttemptTime = null
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
    this.nextAttemptTime = null
  }

  onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttemptTime = Date.now() + this.resetTimeout
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime
    }
  }
}

// Create circuit breaker for NASA API calls
const nasaApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
})

// Enhanced API with circuit breaker
export const enhancedApi = {
  async getTrajectory(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    return nasaApiCircuitBreaker.execute(() => 
      api.getTrajectory(asteroidName, retryConfig)
    )
  },

  async getAsteroid(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    return nasaApiCircuitBreaker.execute(() => 
      api.getAsteroid(asteroidName, retryConfig)
    )
  },

  async calculateImpact(impactParams, retryConfig = DEFAULT_RETRY_CONFIG) {
    return api.calculateImpact(impactParams, retryConfig)
  },

  async calculateAsteroidImpact(asteroidName, retryConfig = DEFAULT_RETRY_CONFIG) {
    return api.calculateAsteroidImpact(asteroidName, retryConfig)
  },

  async getAsteroidsList(retryConfig = DEFAULT_RETRY_CONFIG) {
    return nasaApiCircuitBreaker.execute(() => 
      api.getAsteroidsList(retryConfig)
    )
  },

  async getTop10Nearest(retryConfig = DEFAULT_RETRY_CONFIG) {
    return nasaApiCircuitBreaker.execute(() => 
      api.getTop10Nearest(retryConfig)
    )
  },

  async calculateDeflection(deflectionParams, retryConfig = DEFAULT_RETRY_CONFIG) {
    return api.calculateDeflection(deflectionParams, retryConfig)
  },

  async getEnhancedAsteroidsList(retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.get('/asteroids/enhanced-list')
      return response.data
    }, retryConfig)
  },

  async analyzeImpact(analysisData, retryConfig = DEFAULT_RETRY_CONFIG) {
    if (!apiClient) throw new NetworkError('API client not available')
    return withRetry(async () => {
      const response = await apiClient.post('/impact/analyze', analysisData)
      return response.data
    }, retryConfig)
  },

  getCircuitBreakerState() {
    return nasaApiCircuitBreaker.getState()
  }
}

export default apiClient