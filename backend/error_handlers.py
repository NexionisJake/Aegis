"""
Comprehensive error handling utilities for Project Aegis backend.

This module provides enhanced error handling, retry mechanisms, and
user-friendly error responses for the FastAPI application.
"""
import logging
import time
import functools
from typing import Callable, Any, Dict, Optional, Type, Union
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class RetryableError(Exception):
    """Base class for errors that should trigger retry logic."""
    pass


class NonRetryableError(Exception):
    """Base class for errors that should not trigger retry logic."""
    pass


def create_retry_session(
    retries: int = 3,
    backoff_factor: float = 0.3,
    status_forcelist: tuple = (500, 502, 504)
) -> requests.Session:
    """
    Create a requests session with retry configuration.
    
    Args:
        retries: Number of retry attempts
        backoff_factor: Backoff factor for exponential backoff
        status_forcelist: HTTP status codes that should trigger retries
        
    Returns:
        Configured requests session with retry adapter
    """
    session = requests.Session()
    
    retry_strategy = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session


def retry_on_failure(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator to retry function calls on failure with exponential backoff.
    
    Args:
        max_attempts: Maximum number of attempts
        delay: Initial delay between attempts in seconds
        backoff: Backoff multiplier for exponential backoff
        exceptions: Tuple of exception types to catch and retry
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    # Don't retry on the last attempt
                    if attempt == max_attempts - 1:
                        break
                    
                    # Check if this is a non-retryable error
                    if isinstance(e, NonRetryableError):
                        break
                    
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {str(e)}. "
                        f"Retrying in {current_delay:.1f} seconds..."
                    )
                    
                    time.sleep(current_delay)
                    current_delay *= backoff
            
            # If we get here, all attempts failed
            logger.error(f"All {max_attempts} attempts failed for {func.__name__}")
            raise last_exception
        
        return wrapper
    return decorator


def map_error_to_http_status(error: Exception) -> tuple[int, str]:
    """
    Map various error types to appropriate HTTP status codes and messages.
    
    Args:
        error: Exception to map
        
    Returns:
        Tuple of (status_code, user_friendly_message)
    """
    if isinstance(error, NonRetryableError):
        error_str = str(error).lower()
        if "not found" in error_str:
            return 404, "Asteroid not found in NASA database"
        if "invalid request" in error_str:
            return 400, "Invalid request to NASA API"
        if "invalid json" in error_str:
            return 502, "Received an invalid response from NASA API"

    if isinstance(error, requests.exceptions.HTTPError):
        if error.response.status_code == 404:
            return 404, "Asteroid not found in NASA database"
        if error.response.status_code == 429:
            return 429, "NASA API rate limit exceeded. Please try again later."

    if isinstance(error, requests.exceptions.Timeout):
        return 504, "Request timeout while fetching data from NASA API"
    if isinstance(error, requests.exceptions.ConnectionError):
        return 503, "Unable to connect to NASA API. Please try again later."
    
    # Validation errors
    elif "validation" in error_str or "invalid" in error_str:
        return 400, "Invalid input parameters provided"
    
    # Generic server errors
    else:
        return 500, "An unexpected error occurred. Please try again later."


def create_error_response(
    status_code: int,
    message: str,
    details: Optional[str] = None,
    error_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response format.
    
    Args:
        status_code: HTTP status code
        message: User-friendly error message
        details: Optional detailed error information
        error_code: Optional error code for client handling
        
    Returns:
        Standardized error response dictionary
    """
    response = {
        "error": True,
        "status_code": status_code,
        "message": message,
        "timestamp": time.time()
    }
    
    if details:
        response["details"] = details
    
    if error_code:
        response["error_code"] = error_code
    
    return response


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for FastAPI application.
    
    Args:
        request: FastAPI request object
        exc: Exception that was raised
        
    Returns:
        JSONResponse with standardized error format
    """
    logger.error(f"Unhandled exception in {request.url.path}: {str(exc)}", exc_info=True)
    
    status_code, message = map_error_to_http_status(exc)
    
    error_response = create_error_response(
        status_code=status_code,
        message=message,
        details=str(exc) if status_code >= 500 else None,
        error_code="INTERNAL_ERROR" if status_code >= 500 else "CLIENT_ERROR"
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )


def handle_api_errors(func: Callable) -> Callable:
    """
    Decorator to handle API errors and convert them to appropriate HTTP exceptions.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function with error handling
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            
            status_code, message = map_error_to_http_status(e)
            
            raise HTTPException(
                status_code=status_code,
                detail=create_error_response(
                    status_code=status_code,
                    message=message,
                    details=str(e) if status_code >= 500 else None
                )
            )
    
    return wrapper


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for external API calls.
    
    Prevents cascading failures by temporarily stopping calls to failing services.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise Exception("Circuit breaker is OPEN - service temporarily unavailable")
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise e
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt a reset."""
        return (
            self.last_failure_time is not None and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


# Global circuit breaker for NASA API calls
nasa_api_circuit_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=30.0,
    expected_exception=Exception
)