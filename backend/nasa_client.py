"""
NASA API client for fetching asteroid data from JPL Small-Body Database.
"""
import requests
import os
from typing import Dict, Any, Optional
import logging
from error_handlers import (
    retry_on_failure,
    create_retry_session,
    nasa_api_circuit_breaker,
    RetryableError,
    NonRetryableError
)

logger = logging.getLogger(__name__)


class NASAAPIError(Exception):
    """Custom exception for NASA API related errors."""
    pass


class NASAClient:
    """Client for interacting with NASA JPL Small-Body Database API."""
    
    def __init__(self):
        self.base_url = "https://ssd-api.jpl.nasa.gov/sbdb.api"
        self.api_key = os.getenv("NASA_API_KEY")
        
        # Use retry session with exponential backoff
        self.session = create_retry_session(
            retries=3,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504)
        )
        
        # Set up session headers
        if self.api_key and self.api_key != "your_nasa_api_key_here":
            self.session.headers.update({"X-API-Key": self.api_key})
        
        # Set default timeout and user agent
        self.session.headers.update({
            "User-Agent": "Project-Aegis/1.0.0 (Asteroid Impact Simulator)"
        })
    
    @nasa_api_circuit_breaker
    @retry_on_failure(
        max_attempts=3,
        delay=1.0,
        backoff=2.0,
        exceptions=(RetryableError, requests.exceptions.RequestException)
    )
    def fetch_asteroid_data(self, asteroid_name: str) -> Dict[str, Any]:
        """
        Fetch asteroid data from NASA JPL Small-Body Database.
        
        Args:
            asteroid_name: Name or designation of the asteroid (e.g., "Apophis", "99942")
            
        Returns:
            Dict containing the complete NASA API response
            
        Raises:
            NASAAPIError: If the API request fails or returns invalid data
        """
        try:
            # Validate input
            if not asteroid_name or not isinstance(asteroid_name, str):
                raise NonRetryableError(f"Invalid asteroid name: {asteroid_name}")
            
            # Format request parameters according to NASA API requirements
            params = {
                "sstr": asteroid_name.strip(),  # Small-body string identifier
                "full-prec": "true"             # Full precision for orbital elements
            }
            
            logger.info(f"Fetching asteroid data for: {asteroid_name}")
            
            response = self.session.get(
                self.base_url,
                params=params,
                timeout=30  # 30 second timeout
            )
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Parse JSON response
            try:
                data = response.json()
            except ValueError as e:
                raise RetryableError(f"Invalid JSON response: {str(e)}")
            
            # Validate response structure
            if not isinstance(data, dict):
                raise RetryableError(f"Invalid response format: expected dict, got {type(data)}")
            
            if "object" not in data:
                raise RetryableError(f"Invalid response structure: missing 'object' field")
            
            # Check if object has required fields (fullname indicates successful lookup)
            object_data = data.get("object", {})
            if not object_data.get("fullname"):
                # This is a definitive "not found" - don't retry
                raise NonRetryableError(f"Asteroid '{asteroid_name}' not found in NASA database")
            
            logger.info(f"Successfully fetched data for asteroid: {asteroid_name}")
            return data
            
        except requests.exceptions.Timeout as e:
            raise RetryableError(f"Request timeout while fetching data for {asteroid_name}")
        
        except requests.exceptions.ConnectionError as e:
            raise RetryableError(f"Connection error while fetching data for {asteroid_name}")
        
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise NonRetryableError(f"Asteroid '{asteroid_name}' not found")
            elif e.response.status_code == 400:
                raise NonRetryableError(f"Invalid request for asteroid '{asteroid_name}'")
            elif e.response.status_code == 429:
                raise RetryableError("NASA API rate limit exceeded. Please try again later.")
            elif e.response.status_code >= 500:
                raise RetryableError(f"NASA API server error {e.response.status_code}")
            else:
                raise NonRetryableError(f"HTTP error {e.response.status_code}: {e.response.text}")
        
        except requests.exceptions.RequestException as e:
            raise RetryableError(f"Request failed: {str(e)}")
        
        except NonRetryableError:
            # Re-raise non-retryable errors as NASAAPIError
            raise
        
        except RetryableError:
            # Re-raise retryable errors for retry logic
            raise
        
        except Exception as e:
            # Unexpected errors should be retryable in case they're transient
            raise RetryableError(f"Unexpected error: {str(e)}")
        
        finally:
            # Convert our custom exceptions to NASAAPIError for the API layer
            pass


# Global client instance
nasa_client = NASAClient()


def get_asteroid_data(asteroid_name: str) -> Dict[str, Any]:
    """
    Convenience function to fetch asteroid data.
    
    Args:
        asteroid_name: Name or designation of the asteroid
        
    Returns:
        Dict containing the NASA API response
        
    Raises:
        NASAAPIError: If the request fails
    """
    try:
        return nasa_client.fetch_asteroid_data(asteroid_name)
    except (RetryableError, NonRetryableError) as e:
        # Convert our internal error types to NASAAPIError for the API layer
        raise NASAAPIError(str(e)) from e