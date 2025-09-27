import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { api, enhancedApi, APIError, NetworkError, TimeoutError } from '../utils/apiClient'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('API Client Error Handling', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('APIError', () => {
    it('creates APIError with all properties', () => {
      const error = new APIError('Test message', 404, 'NOT_FOUND', 'Additional details')
      
      expect(error.name).toBe('APIError')
      expect(error.message).toBe('Test message')
      expect(error.status).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.details).toBe('Additional details')
    })
  })

  describe('NetworkError', () => {
    it('creates NetworkError with original error', () => {
      const originalError = new Error('Connection failed')
      const error = new NetworkError('Network problem', originalError)
      
      expect(error.name).toBe('NetworkError')
      expect(error.message).toBe('Network problem')
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('TimeoutError', () => {
    it('creates TimeoutError with message', () => {
      const error = new TimeoutError('Request timed out')
      
      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('Request timed out')
    })
  })

  describe('API Methods', () => {
    describe('getTrajectory', () => {
      it('successfully fetches trajectory data', async () => {
        const mockData = {
          asteroid_path: [[1, 2, 3]],
          earth_path: [[4, 5, 6]]
        }
        
        mockAxiosInstance.get.mockResolvedValue({ data: mockData })
        
        const result = await api.getTrajectory('Apophis')
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/trajectory/Apophis')
        expect(result).toEqual(mockData)
      })

      it('handles network errors', async () => {
        const networkError = new Error('Network Error')
        networkError.code = 'ECONNREFUSED'
        mockAxiosInstance.get.mockRejectedValue(networkError)
        
        await expect(api.getTrajectory('Apophis')).rejects.toThrow(NetworkError)
      })

      it('handles timeout errors', async () => {
        const timeoutError = new Error('timeout of 30000ms exceeded')
        timeoutError.code = 'ECONNABORTED'
        mockAxiosInstance.get.mockRejectedValue(timeoutError)
        
        await expect(api.getTrajectory('Apophis')).rejects.toThrow(TimeoutError)
      })

      it('handles API errors with response', async () => {
        const apiError = new Error('Request failed')
        apiError.response = {
          status: 404,
          data: {
            message: 'Asteroid not found',
            error_code: 'NOT_FOUND'
          }
        }
        mockAxiosInstance.get.mockRejectedValue(apiError)
        
        await expect(api.getTrajectory('NonExistent')).rejects.toThrow(APIError)
      })

      it('encodes asteroid names properly', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: {} })
        
        await api.getTrajectory('99942 Apophis')
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/trajectory/99942%20Apophis')
      })
    })

    describe('getAsteroid', () => {
      it('successfully fetches asteroid data', async () => {
        const mockData = {
          object: { fullname: '99942 Apophis' }
        }
        
        mockAxiosInstance.get.mockResolvedValue({ data: mockData })
        
        const result = await api.getAsteroid('Apophis')
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/asteroid/Apophis')
        expect(result).toEqual(mockData)
      })
    })

    describe('calculateImpact', () => {
      it('successfully calculates impact', async () => {
        const mockParams = {
          diameter_km: 0.34,
          velocity_kps: 7.42
        }
        
        const mockData = {
          craterDiameterMeters: 1000,
          impactEnergyJoules: 1.5e15
        }
        
        mockAxiosInstance.post.mockResolvedValue({ data: mockData })
        
        const result = await api.calculateImpact(mockParams)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/impact/calculate', mockParams)
        expect(result).toEqual(mockData)
      })

      it('handles validation errors', async () => {
        const validationError = new Error('Validation failed')
        validationError.response = {
          status: 422,
          data: {
            message: 'Invalid parameters',
            details: 'Diameter must be positive'
          }
        }
        mockAxiosInstance.post.mockRejectedValue(validationError)
        
        await expect(api.calculateImpact({})).rejects.toThrow(APIError)
      })
    })

    describe('healthCheck', () => {
      it('successfully checks health', async () => {
        const mockData = {
          status: 'healthy',
          nasa_api_configured: true
        }
        
        mockAxiosInstance.get.mockResolvedValue({ data: mockData })
        
        const result = await api.healthCheck()
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health')
        expect(result).toEqual(mockData)
      })
    })
  })

  describe('Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('retries on retryable errors', async () => {
      const retryableError = new Error('Service unavailable')
      retryableError.response = { status: 503 }
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({ data: { success: true } })
      
      const resultPromise = api.getTrajectory('Apophis')
      
      // Fast-forward through retry delays
      await vi.runAllTimersAsync()
      
      const result = await resultPromise
      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
    })

    it('does not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Bad request')
      nonRetryableError.response = { status: 400 }
      
      mockAxiosInstance.get.mockRejectedValue(nonRetryableError)
      
      await expect(api.getTrajectory('Invalid')).rejects.toThrow(APIError)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })

    it('gives up after max retry attempts', async () => {
      const retryableError = new Error('Server error')
      retryableError.response = { status: 500 }
      
      mockAxiosInstance.get.mockRejectedValue(retryableError)
      
      const resultPromise = api.getTrajectory('Apophis')
      
      // Fast-forward through all retry attempts
      await vi.runAllTimersAsync()
      
      await expect(resultPromise).rejects.toThrow(APIError)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('uses exponential backoff for retries', async () => {
      const retryableError = new Error('Timeout')
      retryableError.code = 'ECONNABORTED'
      
      mockAxiosInstance.get.mockRejectedValue(retryableError)
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const resultPromise = api.getTrajectory('Apophis')
      
      // Fast-forward through retry attempts
      await vi.runAllTimersAsync()
      
      await expect(resultPromise).rejects.toThrow(TimeoutError)
      
      // Check that retry messages were logged with increasing delays
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt 1/3'),
        expect.any(String)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt 2/3'),
        expect.any(String)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Enhanced API with Circuit Breaker', () => {
    it('executes requests through circuit breaker', async () => {
      const mockData = { success: true }
      mockAxiosInstance.get.mockResolvedValue({ data: mockData })
      
      const result = await enhancedApi.getTrajectory('Apophis')
      
      expect(result).toEqual(mockData)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/trajectory/Apophis')
    })

    it('opens circuit breaker after failures', async () => {
      const error = new Error('Service failure')
      error.response = { status: 500 }
      
      mockAxiosInstance.get.mockRejectedValue(error)
      
      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(enhancedApi.getTrajectory('Apophis')).rejects.toThrow()
      }
      
      // Circuit should be open now
      const state = enhancedApi.getCircuitBreakerState()
      expect(state.state).toBe('OPEN')
      expect(state.failureCount).toBe(3)
    })

    it('blocks requests when circuit is open', async () => {
      const error = new Error('Service failure')
      error.response = { status: 500 }
      
      mockAxiosInstance.get.mockRejectedValue(error)
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(enhancedApi.getTrajectory('Apophis')).rejects.toThrow()
      }
      
      // Next request should be blocked
      await expect(enhancedApi.getTrajectory('Apophis')).rejects.toThrow(
        'Circuit breaker is OPEN'
      )
    })

    it('provides circuit breaker state', () => {
      const state = enhancedApi.getCircuitBreakerState()
      
      expect(state).toHaveProperty('state')
      expect(state).toHaveProperty('failureCount')
      expect(state).toHaveProperty('nextAttemptTime')
    })
  })

  describe('Error Message Mapping', () => {
    it('maps different HTTP status codes correctly', async () => {
      const testCases = [
        { status: 404, expectedType: APIError },
        { status: 429, expectedType: APIError },
        { status: 500, expectedType: APIError },
        { status: 503, expectedType: APIError }
      ]
      
      for (const testCase of testCases) {
        const error = new Error('Test error')
        error.response = { 
          status: testCase.status,
          data: { message: 'Test message' }
        }
        
        mockAxiosInstance.get.mockRejectedValueOnce(error)
        
        await expect(api.getTrajectory('Test')).rejects.toThrow(testCase.expectedType)
      }
    })

    it('extracts error details from response', async () => {
      const error = new Error('API Error')
      error.response = {
        status: 422,
        data: {
          message: 'Validation failed',
          error_code: 'VALIDATION_ERROR',
          details: 'Invalid input parameters'
        }
      }
      
      mockAxiosInstance.get.mockRejectedValue(error)
      
      try {
        await api.getTrajectory('Test')
      } catch (e) {
        expect(e).toBeInstanceOf(APIError)
        expect(e.message).toBe('Validation failed')
        expect(e.status).toBe(422)
        expect(e.code).toBe('VALIDATION_ERROR')
        expect(e.details).toBe('Invalid input parameters')
      }
    })
  })

  describe('Request/Response Interceptors', () => {
    it('sets up request interceptor for logging', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('sets up response interceptor for error handling', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })
})