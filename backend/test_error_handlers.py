import pytest
import time
from unittest.mock import Mock, patch, MagicMock
import requests
from requests.exceptions import ConnectionError, Timeout, HTTPError
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from error_handlers import (
    RetryableError,
    NonRetryableError,
    create_retry_session,
    retry_on_failure,
    map_error_to_http_status,
    create_error_response,
    handle_api_errors,
    CircuitBreaker,
    nasa_api_circuit_breaker
)


class TestRetrySession:
    """Test suite for retry session creation."""
    
    def test_create_retry_session_default_config(self):
        """Test creating retry session with default configuration."""
        session = create_retry_session()
        
        assert isinstance(session, requests.Session)
        # Check that adapters are mounted
        assert 'http://' in session.adapters
        assert 'https://' in session.adapters
    
    def test_create_retry_session_custom_config(self):
        """Test creating retry session with custom configuration."""
        session = create_retry_session(
            retries=5,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504)
        )
        
        assert isinstance(session, requests.Session)
        # Verify adapters are configured
        http_adapter = session.adapters['http://']
        https_adapter = session.adapters['https://']
        
        assert http_adapter is not None
        assert https_adapter is not None


class TestRetryDecorator:
    """Test suite for retry decorator functionality."""
    
    def test_retry_success_on_first_attempt(self):
        """Test that successful function calls don't trigger retries."""
        call_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def successful_function():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = successful_function()
        
        assert result == "success"
        assert call_count == 1
    
    def test_retry_success_after_failures(self):
        """Test that function succeeds after initial failures."""
        call_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def eventually_successful_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise RetryableError("Temporary failure")
            return "success"
        
        result = eventually_successful_function()
        
        assert result == "success"
        assert call_count == 3
    
    def test_retry_exhausts_attempts(self):
        """Test that retry gives up after max attempts."""
        call_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def always_failing_function():
            nonlocal call_count
            call_count += 1
            raise RetryableError("Always fails")
        
        with pytest.raises(RetryableError):
            always_failing_function()
        
        assert call_count == 3
    
    def test_retry_non_retryable_error(self):
        """Test that non-retryable errors don't trigger retries."""
        call_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def non_retryable_function():
            nonlocal call_count
            call_count += 1
            raise NonRetryableError("Don't retry this")
        
        with pytest.raises(NonRetryableError):
            non_retryable_function()
        
        assert call_count == 1
    
    def test_retry_with_backoff(self):
        """Test that retry implements exponential backoff."""
        call_times = []
        
        @retry_on_failure(max_attempts=3, delay=0.1, backoff=2.0)
        def timing_function():
            call_times.append(time.time())
            raise RetryableError("Test error")
        
        with pytest.raises(RetryableError):
            timing_function()
        
        assert len(call_times) == 3
        
        # Check that delays increase (allowing for some timing variance)
        if len(call_times) >= 2:
            delay1 = call_times[1] - call_times[0]
            assert delay1 >= 0.08  # Should be around 0.1 seconds
        
        if len(call_times) >= 3:
            delay2 = call_times[2] - call_times[1]
            assert delay2 >= 0.18  # Should be around 0.2 seconds (0.1 * 2)


class TestErrorMapping:
    """Test suite for error mapping functionality."""
    
    def test_map_nasa_api_errors(self):
        """Test mapping of NASA API specific errors."""
        # Not found error
        error = Exception("Asteroid not found in database")
        status, message = map_error_to_http_status(error)
        assert status == 404
        assert "not found" in message.lower()
        
        # Rate limit error
        error = Exception("Rate limit exceeded")
        status, message = map_error_to_http_status(error)
        assert status == 429
        assert "rate limit" in message.lower()
        
        # Timeout error
        error = Exception("Request timeout occurred")
        status, message = map_error_to_http_status(error)
        assert status == 504
        assert "timeout" in message.lower()
        
        # Connection error
        error = Exception("Connection failed")
        status, message = map_error_to_http_status(error)
        assert status == 503
        assert "connect" in message.lower()
    
    def test_map_calculation_errors(self):
        """Test mapping of calculation specific errors."""
        # Orbital calculation error
        error = Exception("Orbital calculation failed")
        status, message = map_error_to_http_status(error)
        assert status == 422
        assert "orbital" in message.lower() or "trajectory" in message.lower()
        
        # Impact calculation error
        error = Exception("Impact calculation error")
        status, message = map_error_to_http_status(error)
        assert status == 422
        assert "impact" in message.lower() or "calculate" in message.lower()
    
    def test_map_validation_errors(self):
        """Test mapping of validation errors."""
        error = Exception("Invalid input parameters")
        status, message = map_error_to_http_status(error)
        assert status == 400
        assert "invalid" in message.lower()
    
    def test_map_generic_errors(self):
        """Test mapping of generic errors."""
        error = Exception("Something unexpected happened")
        status, message = map_error_to_http_status(error)
        assert status == 500
        assert "unexpected" in message.lower()


class TestErrorResponse:
    """Test suite for error response creation."""
    
    def test_create_basic_error_response(self):
        """Test creating basic error response."""
        response = create_error_response(404, "Not found")
        
        assert response["error"] is True
        assert response["status_code"] == 404
        assert response["message"] == "Not found"
        assert "timestamp" in response
        assert isinstance(response["timestamp"], float)
    
    def test_create_error_response_with_details(self):
        """Test creating error response with details."""
        response = create_error_response(
            500, 
            "Server error", 
            details="Stack trace here",
            error_code="INTERNAL_ERROR"
        )
        
        assert response["error"] is True
        assert response["status_code"] == 500
        assert response["message"] == "Server error"
        assert response["details"] == "Stack trace here"
        assert response["error_code"] == "INTERNAL_ERROR"


class TestCircuitBreaker:
    """Test suite for circuit breaker functionality."""
    
    def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in closed state."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1.0)
        
        # Should execute successfully
        @cb
        def successful_function():
            return "success"
        
        result = successful_function()
        assert result == "success"
        assert cb.state == "CLOSED"
    
    def test_circuit_breaker_opens_after_failures(self):
        """Test that circuit breaker opens after threshold failures."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1.0)
        
        @cb
        def failing_function():
            raise Exception("Test failure")
        
        # Fail 3 times to reach threshold
        for _ in range(3):
            with pytest.raises(Exception):
                failing_function()
        
        assert cb.state == "OPEN"
        
        # Next call should be blocked
        with pytest.raises(Exception, match="Circuit breaker is OPEN"):
            failing_function()
    
    def test_circuit_breaker_half_open_recovery(self):
        """Test circuit breaker recovery to half-open state."""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        
        @cb
        def test_function():
            if cb.state == "HALF_OPEN":
                return "recovered"
            raise Exception("Test failure")
        
        # Trigger failures to open circuit
        for _ in range(2):
            with pytest.raises(Exception):
                test_function()
        
        assert cb.state == "OPEN"
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Next call should succeed and close circuit
        result = test_function()
        assert result == "recovered"
        assert cb.state == "CLOSED"
    
    def test_circuit_breaker_success_resets_failures(self):
        """Test that successful calls reset failure count."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1.0)
        
        @cb
        def mixed_function(should_fail=True):
            if should_fail:
                raise Exception("Test failure")
            return "success"
        
        # Fail twice (below threshold)
        for _ in range(2):
            with pytest.raises(Exception):
                mixed_function(should_fail=True)
        
        assert cb.failure_count == 2
        assert cb.state == "CLOSED"
        
        # Succeed once
        result = mixed_function(should_fail=False)
        assert result == "success"
        assert cb.failure_count == 0
        assert cb.state == "CLOSED"


class TestAPIErrorHandler:
    """Test suite for API error handler decorator."""
    
    @pytest.mark.asyncio
    async def test_handle_api_errors_success(self):
        """Test that successful API calls pass through unchanged."""
        @handle_api_errors
        async def successful_api_call():
            return {"data": "success"}
        
        result = await successful_api_call()
        assert result == {"data": "success"}
    
    @pytest.mark.asyncio
    async def test_handle_api_errors_converts_exceptions(self):
        """Test that exceptions are converted to HTTP exceptions."""
        from fastapi import HTTPException
        
        @handle_api_errors
        async def failing_api_call():
            raise Exception("Test error")
        
        with pytest.raises(HTTPException) as exc_info:
            await failing_api_call()
        
        assert exc_info.value.status_code == 500
        assert isinstance(exc_info.value.detail, dict)
        assert "error" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_handle_api_errors_preserves_http_exceptions(self):
        """Test that HTTP exceptions are passed through unchanged."""
        from fastapi import HTTPException
        
        @handle_api_errors
        async def http_error_call():
            raise HTTPException(status_code=404, detail="Not found")
        
        with pytest.raises(HTTPException) as exc_info:
            await http_error_call()
        
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Not found"


class TestNASAAPICircuitBreaker:
    """Test suite for NASA API circuit breaker integration."""
    
    def test_nasa_circuit_breaker_exists(self):
        """Test that NASA API circuit breaker is properly configured."""
        assert nasa_api_circuit_breaker is not None
        assert nasa_api_circuit_breaker.failure_threshold == 3
        assert nasa_api_circuit_breaker.recovery_timeout == 30.0
        assert nasa_api_circuit_breaker.state == "CLOSED"
    
    def test_nasa_circuit_breaker_integration(self):
        """Test NASA circuit breaker with mock function."""
        # Reset circuit breaker state
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        
        @nasa_api_circuit_breaker
        def mock_nasa_call():
            raise Exception("NASA API failure")
        
        # Should fail 3 times before opening
        for i in range(3):
            with pytest.raises(Exception):
                mock_nasa_call()
            assert nasa_api_circuit_breaker.failure_count == i + 1
        
        assert nasa_api_circuit_breaker.state == "OPEN"
        
        # Next call should be blocked
        with pytest.raises(Exception, match="Circuit breaker is OPEN"):
            mock_nasa_call()


class TestErrorRecoveryScenarios:
    """Test suite for error recovery scenarios."""
    
    def test_transient_network_error_recovery(self):
        """Test recovery from transient network errors."""
        attempt_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def network_call():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count <= 2:
                raise ConnectionError("Network temporarily unavailable")
            return "success"
        
        result = network_call()
        assert result == "success"
        assert attempt_count == 3
    
    def test_rate_limit_error_handling(self):
        """Test handling of rate limit errors."""
        attempt_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def rate_limited_call():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count <= 1:
                raise RetryableError("Rate limit exceeded")
            return "success"
        
        result = rate_limited_call()
        assert result == "success"
        assert attempt_count == 2
    
    def test_permanent_error_no_retry(self):
        """Test that permanent errors don't trigger retries."""
        attempt_count = 0
        
        @retry_on_failure(max_attempts=3, delay=0.1)
        def permanent_error_call():
            nonlocal attempt_count
            attempt_count += 1
            raise NonRetryableError("Resource not found")
        
        with pytest.raises(NonRetryableError):
            permanent_error_call()
        
        assert attempt_count == 1