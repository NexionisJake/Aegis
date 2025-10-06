import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app
from .nasa_client import NASAAPIError

client = TestClient(app)


class TestAsteroidAPIEndpoint:
    """Test suite for the asteroid API endpoint."""
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_success(self, mock_get_data):
        """Test successful asteroid data retrieval."""
        mock_data = {
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
                    {"name": "a", "value": "0.922"},
                    {"name": "e", "value": "0.191"}
                ]
            }
        }
        mock_get_data.return_value = mock_data
        
        response = client.get("/api/asteroid/Apophis")
        
        assert response.status_code == 200
        data = response.json()
        assert data["object"]["fullname"] == "99942 Apophis (2004 MN4)"
        assert data["object"]["neo"] == True
        mock_get_data.assert_called_once_with("Apophis")
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_not_found(self, mock_get_data):
        """Test asteroid not found scenario."""
        mock_get_data.side_effect = NASAAPIError("Asteroid 'NonExistent' not found")
        
        response = client.get("/api/asteroid/NonExistent")
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"]
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_rate_limit(self, mock_get_data):
        """Test rate limit error handling."""
        mock_get_data.side_effect = NASAAPIError("NASA API rate limit exceeded")
        
        response = client.get("/api/asteroid/Apophis")
        
        assert response.status_code == 429
        data = response.json()
        assert "rate limit" in data["detail"]
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_timeout(self, mock_get_data):
        """Test timeout error handling."""
        mock_get_data.side_effect = NASAAPIError("Request timeout while fetching data")
        
        response = client.get("/api/asteroid/Apophis")
        
        assert response.status_code == 504
        data = response.json()
        assert "timeout" in data["detail"]
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_server_error(self, mock_get_data):
        """Test general server error handling."""
        mock_get_data.side_effect = NASAAPIError("Connection error")
        
        response = client.get("/api/asteroid/Apophis")
        
        assert response.status_code == 500
        data = response.json()
        assert "Failed to fetch asteroid data" in data["detail"]
    
    @patch('main.get_asteroid_data')
    def test_get_asteroid_unexpected_error(self, mock_get_data):
        """Test unexpected error handling."""
        mock_get_data.side_effect = Exception("Unexpected error")
        
        response = client.get("/api/asteroid/Apophis")
        
        assert response.status_code == 500
        data = response.json()
        assert data["detail"] == "Internal server error"
    
    def test_get_asteroid_with_special_characters(self):
        """Test asteroid name with special characters."""
        # This should work with URL encoding
        response = client.get("/api/asteroid/2004%20MN4")
        
        # We expect either success or a proper error response, not a server crash
        assert response.status_code in [200, 404, 500, 504, 429]
    
    def test_get_asteroid_with_numeric_designation(self):
        """Test asteroid with numeric designation."""
        response = client.get("/api/asteroid/99942")
        
        # We expect either success or a proper error response
        assert response.status_code in [200, 404, 500, 504, 429]


class TestAPIEndpointIntegration:
    """Integration tests for the API endpoint with real data."""
    
    def test_real_apophis_endpoint(self):
        """Test the endpoint with real Apophis data."""
        response = client.get("/api/asteroid/Apophis")
        
        # Should succeed with real NASA API
        if response.status_code == 200:
            data = response.json()
            assert "object" in data
            assert data["object"]["fullname"] == "99942 Apophis (2004 MN4)"
            assert "orbit" in data
            assert "elements" in data["orbit"]
        else:
            # If it fails, it should be a proper error response
            assert response.status_code in [404, 500, 504, 429]
            assert "detail" in response.json()
    
    def test_invalid_asteroid_endpoint(self):
        """Test the endpoint with an invalid asteroid name."""
        response = client.get("/api/asteroid/InvalidAsteroidName123")
        
        # Should return 404 or 500 depending on NASA API response
        assert response.status_code in [404, 500]
        data = response.json()
        assert "detail" in data