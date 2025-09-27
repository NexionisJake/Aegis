import pytest
from unittest.mock import Mock, patch, MagicMock
import requests
import json
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from nasa_client import NASAClient, NASAAPIError, get_asteroid_data


class TestNASAClient:
    """Test suite for NASA API client functionality."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.client = NASAClient()
    
    @patch.dict('os.environ', {'NASA_API_KEY': 'test_api_key'})
    def test_client_initialization_with_api_key(self):
        """Test that client initializes correctly with API key."""
        client = NASAClient()
        assert client.api_key == 'test_api_key'
        assert client.base_url == "https://ssd-api.jpl.nasa.gov/sbdb.api"
        assert 'X-API-Key' in client.session.headers
        assert client.session.headers['X-API-Key'] == 'test_api_key'
    
    @patch.dict('os.environ', {'NASA_API_KEY': 'your_nasa_api_key_here'})
    def test_client_initialization_with_placeholder_key(self):
        """Test that client doesn't set API key header with placeholder value."""
        client = NASAClient()
        assert client.api_key == 'your_nasa_api_key_here'
        assert 'X-API-Key' not in client.session.headers
    
    @patch.dict('os.environ', {}, clear=True)
    def test_client_initialization_without_api_key(self):
        """Test that client initializes correctly without API key."""
        client = NASAClient()
        assert client.api_key is None
        assert 'X-API-Key' not in client.session.headers
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_success(self, mock_get):
        """Test successful asteroid data fetch."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "shortname": "99942 Apophis",
                "neo": True,
                "pha": True
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224"},
                    {"name": "e", "value": "0.1914"},
                    {"name": "i", "value": "3.3314"}
                ]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        result = self.client.fetch_asteroid_data("Apophis")
        
        # Verify request parameters
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[0][0] == "https://ssd-api.jpl.nasa.gov/sbdb.api"
        assert call_args[1]['params'] == {
            "sstr": "Apophis",
            "full-prec": "true"
        }
        assert call_args[1]['timeout'] == 30
        
        # Verify response
        assert result["object"]["fullname"] == "99942 Apophis (2004 MN4)"
        assert result["object"]["neo"] == True
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_not_found(self, mock_get):
        """Test asteroid not found scenario."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": {}  # Empty object indicates not found
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("NonExistentAsteroid")
        
        assert "not found in NASA database" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_invalid_response(self, mock_get):
        """Test handling of invalid response structure."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"invalid": "response"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "Invalid response structure" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_timeout(self, mock_get):
        """Test handling of request timeout."""
        mock_get.side_effect = requests.exceptions.Timeout()
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "Request timeout" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_connection_error(self, mock_get):
        """Test handling of connection error."""
        mock_get.side_effect = requests.exceptions.ConnectionError()
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "Connection error" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_http_404(self, mock_get):
        """Test handling of HTTP 404 error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"
        http_error = requests.exceptions.HTTPError(response=mock_response)
        mock_get.side_effect = http_error
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "not found" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_http_429(self, mock_get):
        """Test handling of HTTP 429 rate limit error."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        http_error = requests.exceptions.HTTPError(response=mock_response)
        mock_get.side_effect = http_error
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "rate limit exceeded" in str(exc_info.value)
    
    @patch('nasa_client.requests.Session.get')
    def test_fetch_asteroid_data_json_error(self, mock_get):
        """Test handling of invalid JSON response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        with pytest.raises(NASAAPIError) as exc_info:
            self.client.fetch_asteroid_data("Apophis")
        
        assert "Invalid JSON response" in str(exc_info.value)


class TestConvenienceFunction:
    """Test suite for the convenience function."""
    
    @patch('nasa_client.nasa_client.fetch_asteroid_data')
    def test_get_asteroid_data_function(self, mock_fetch):
        """Test the convenience function calls the client correctly."""
        mock_data = {"object": {"fullname": "Test Asteroid", "neo": True}}
        mock_fetch.return_value = mock_data
        
        result = get_asteroid_data("TestAsteroid")
        
        mock_fetch.assert_called_once_with("TestAsteroid")
        assert result == mock_data


class TestAPIEndpointIntegration:
    """Integration tests for the API endpoint."""
    
    @patch('nasa_client.requests.Session.get')
    def test_real_api_response_structure(self, mock_get):
        """Test with a realistic NASA API response structure."""
        # This is based on actual NASA API response format
        realistic_response = {
            "signature": {
                "source": "NASA/JPL Small-Body Database (SBDB) API",
                "version": "1.3"
            },
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "shortname": "99942 Apophis",
                "neo": True,
                "pha": True,
                "orbit_class": {
                    "code": "ATE",
                    "name": "Aten"
                }
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263", "sigma": "4.0280e-09", "units": "au"},
                    {"name": "e", "value": "0.1914276290", "sigma": "1.2037e-09", "units": ""},
                    {"name": "i", "value": "3.3314075515", "sigma": "1.1587e-06", "units": "deg"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = realistic_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        client = NASAClient()
        result = client.fetch_asteroid_data("Apophis")
        
        # Verify the response structure is preserved
        assert result["object"]["fullname"] == "99942 Apophis (2004 MN4)"
        assert result["object"]["neo"] == True
        assert result["object"]["pha"] == True
        assert "orbit" in result
        assert "elements" in result["orbit"]
        
        # Verify orbital elements are present
        elements = result["orbit"]["elements"]
        element_names = [elem["name"] for elem in elements]
        assert "a" in element_names  # semi-major axis
        assert "e" in element_names  # eccentricity
        assert "i" in element_names  # inclination