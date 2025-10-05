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
        exceptions=(RetryableError,)
    )
    def fetch_neo_browse(self, page: int = 0, size: int = 20) -> Dict[str, Any]:
        """
        Fetch a list of Near-Earth Objects using NASA's NEO Browse API.
        
        Args:
            page: Page number (default: 0)
            size: Number of objects per page (default: 20, max: 20)
            
        Returns:
            Dictionary containing NEO data with pagination info
            
        Raises:
            RetryableError: For recoverable errors
            NonRetryableError: For permanent errors
        """
        try:
            # NASA NEO Browse API endpoint
            url = "https://api.nasa.gov/neo/rest/v1/neo/browse"
            
            params = {
                'page': page,
                'size': min(size, 20),  # NASA API limits to max 20 per page
            }
            
            # Add API key if available
            if self.api_key and self.api_key != "your_nasa_api_key_here":
                params['api_key'] = self.api_key
            
            logger.info(f"Fetching NEO browse data: page={page}, size={size}")
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Validate response structure
            if "near_earth_objects" not in data:
                raise RetryableError("Invalid NEO browse response: missing 'near_earth_objects' field")
            
            logger.info(f"Successfully fetched {len(data.get('near_earth_objects', []))} NEOs")
            return data
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                raise NonRetryableError(f"Invalid NEO browse request parameters")
            else:
                raise RetryableError(f"HTTP error {e.response.status_code}: {e.response.text}") from e
        
        except requests.exceptions.RequestException as e:
            raise RetryableError(f"NEO browse request failed: {str(e)}") from e
        
        except Exception as e:
            raise RetryableError(f"Unexpected error in NEO browse: {str(e)}") from e

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
                raise NonRetryableError(f"Invalid JSON response: {response.text}") from e
            
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
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise NonRetryableError(f"Asteroid '{asteroid_name}' not found")
            elif e.response.status_code == 400:
                raise NonRetryableError(f"Invalid request for asteroid '{asteroid_name}'")
            else:
                # Let other HTTP errors be handled by the retry decorator
                raise RetryableError(f"HTTP error {e.response.status_code}: {e.response.text}") from e
        
        except requests.exceptions.RequestException as e:
            # Catch other request-related errors (e.g., DNS, connection)
            raise RetryableError(f"Request failed for {asteroid_name}: {str(e)}") from e
        
        except Exception as e:
            # Unexpected errors should be retryable in case they're transient
            raise RetryableError(f"An unexpected error occurred: {str(e)}") from e


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


def get_neo_browse_data(page: int = 0, size: int = 20) -> Dict[str, Any]:
    """
    Convenience function to fetch NEO browse data.
    
    Args:
        page: Page number
        size: Number of objects per page
        
    Returns:
        Dict containing the NASA NEO browse response
        
    Raises:
        NASAAPIError: If the request fails
    """
    try:
        return nasa_client.fetch_neo_browse(page, size)
    except (RetryableError, NonRetryableError) as e:
        raise NASAAPIError(str(e)) from e


def get_close_approach_data(start_date: str = None, end_date: str = None) -> Dict[str, Any]:
    """
    Convenience function to fetch close approach data.
    
    Args:
        start_date: Start date in YYYY-MM-DD format (default: today)
        end_date: End date in YYYY-MM-DD format (default: 7 days from start)
        
    Returns:
        Dict containing close approach data
        
    Raises:
        NASAAPIError: If the request fails
    """
    from datetime import datetime, timedelta
    
    if not start_date:
        start_date = datetime.now().strftime('%Y-%m-%d')
    
    if not end_date:
        end_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    try:
        # NASA Close Approach API endpoint
        url = "https://api.nasa.gov/neo/rest/v1/feed"
        
        params = {
            'start_date': start_date,
            'end_date': end_date,
        }
        
        # Add API key if available
        if nasa_client.api_key and nasa_client.api_key != "your_nasa_api_key_here":
            params['api_key'] = nasa_client.api_key
        
        response = nasa_client.session.get(url, params=params)
        response.raise_for_status()
        
        return response.json()
        
    except Exception as e:
        raise NASAAPIError(f"Failed to fetch close approach data: {str(e)}") from e