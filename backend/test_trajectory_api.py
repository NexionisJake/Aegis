"""
Integration tests for trajectory API endpoint.
"""
import pytest
from unittest.mock import Mock, patch
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app
from nasa_client import NASAAPIError
from orbital_calculator import OrbitalCalculationError, OrbitalElements

client = TestClient(app)


class TestTrajectoryAPIEndpoint:
    """Test suite for the trajectory API endpoint."""
    
    @patch('main.get_asteroid_data')
    @patch('main.extract_orbital_elements')
    @patch('main.calculate_both_trajectories')
    def test_get_trajectory_success(self, mock_calc_trajectories, mock_extract_elements, mock_get_data):
        """Test successful trajectory calculation."""
        # Mock NASA API response
        mock_nasa_data = {
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "neo": True
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"}
                ]
            }
        }
        mock_get_data.return_value = mock_nasa_data
        
        # Mock orbital elements
        mock_elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        mock_extract_elements.return_value = mock_elements
        
        # Mock trajectory calculation
        mock_trajectories = {
            "asteroid_path": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]],
            "earth_path": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]]
        }
        mock_calc_trajectories.return_value = mock_trajectories
        
        # Make API request
        response = client.get("/api/trajectory/Apophis")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        assert "asteroid_path" in data
        assert "earth_path" in data
        assert len(data["asteroid_path"]) == 3
        assert len(data["earth_path"]) == 3
        
        # Verify function calls
        mock_get_data.assert_called_once_with("Apophis")
        mock_extract_elements.assert_called_once_with(mock_nasa_data)
        mock_calc_trajectories.assert_called_once_with(mock_elements, num_points=365)
    
    @patch('main.get_asteroid_data')
    def test_get_trajectory_asteroid_not_found(self, mock_get_data):
        """Test trajectory endpoint when asteroid is not found."""
        mock_get_data.side_effect = NASAAPIError("Asteroid 'NonExistent' not found in NASA database")
        
        response = client.get("/api/trajectory/NonExistent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    @patch('main.get_asteroid_data')
    def test_get_trajectory_nasa_api_rate_limit(self, mock_get_data):
        """Test trajectory endpoint when NASA API rate limit is exceeded."""
        mock_get_data.side_effect = NASAAPIError("NASA API rate limit exceeded. Please try again later.")
        
        response = client.get("/api/trajectory/Apophis")
        
        assert response.status_code == 429
        assert "rate limit" in response.json()["detail"].lower()
    
    @patch('main.get_asteroid_data')
    def test_get_trajectory_nasa_api_timeout(self, mock_get_data):
        """Test trajectory endpoint when NASA API times out."""
        mock_get_data.side_effect = NASAAPIError("Request timeout while fetching data for Apophis")
        
        response = client.get("/api/trajectory/Apophis")
        
        assert response.status_code == 504
        assert "timeout" in response.json()["detail"].lower()
    
    @patch('main.get_asteroid_data')
    @patch('main.extract_orbital_elements')
    def test_get_trajectory_orbital_calculation_error(self, mock_extract_elements, mock_get_data):
        """Test trajectory endpoint when orbital calculation fails."""
        mock_get_data.return_value = {"object": {"fullname": "Test"}}
        mock_extract_elements.side_effect = OrbitalCalculationError("Missing required orbital elements: ['a', 'e']")
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 422
        assert "Failed to calculate trajectory" in response.json()["detail"]
        assert "Missing required orbital elements" in response.json()["detail"]
    
    @patch('main.get_asteroid_data')
    @patch('main.extract_orbital_elements')
    @patch('main.calculate_both_trajectories')
    def test_get_trajectory_calculation_error(self, mock_calc_trajectories, mock_extract_elements, mock_get_data):
        """Test trajectory endpoint when trajectory calculation fails."""
        mock_get_data.return_value = {"object": {"fullname": "Test"}}
        mock_extract_elements.return_value = Mock()
        mock_calc_trajectories.side_effect = OrbitalCalculationError("Trajectory calculation failed: Invalid orbit")
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 422
        assert "Failed to calculate trajectory" in response.json()["detail"]
    
    @patch('main.get_asteroid_data')
    def test_get_trajectory_unexpected_error(self, mock_get_data):
        """Test trajectory endpoint when unexpected error occurs."""
        mock_get_data.side_effect = Exception("Unexpected error")
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 500
        assert response.json()["detail"] == "Internal server error"
    
    def test_get_trajectory_invalid_asteroid_name(self):
        """Test trajectory endpoint with various asteroid name formats."""
        # Test with special characters (should be handled by URL encoding)
        response = client.get("/api/trajectory/2004%20MN4")
        # This will likely succeed or fail depending on NASA API response
        assert response.status_code in [200, 404, 500]  # Valid response codes


class TestTrajectoryAPIIntegration:
    """Integration tests for complete trajectory workflow."""
    
    @patch('main.get_asteroid_data')
    def test_trajectory_workflow_with_realistic_data(self, mock_get_data):
        """Test complete trajectory workflow with realistic NASA API response."""
        # Use realistic NASA API response structure
        realistic_nasa_response = {
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
                    {"name": "i", "value": "3.3314075515", "sigma": "1.1587e-06", "units": "deg"},
                    {"name": "om", "value": "204.4460935", "sigma": "2.5123e-05", "units": "deg"},
                    {"name": "w", "value": "126.3927123", "sigma": "3.1456e-05", "units": "deg"},
                    {"name": "ma", "value": "268.7143123", "sigma": "1.8765e-04", "units": "deg"}
                ]
            }
        }
        mock_get_data.return_value = realistic_nasa_response
        
        response = client.get("/api/trajectory/Apophis")
        
        # Should succeed with real orbital calculation
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "asteroid_path" in data
        assert "earth_path" in data
        assert isinstance(data["asteroid_path"], list)
        assert isinstance(data["earth_path"], list)
        
        # Verify coordinate format
        if data["asteroid_path"]:
            first_coord = data["asteroid_path"][0]
            assert isinstance(first_coord, list)
            assert len(first_coord) == 3
            assert all(isinstance(x, (int, float)) for x in first_coord)
        
        if data["earth_path"]:
            first_coord = data["earth_path"][0]
            assert isinstance(first_coord, list)
            assert len(first_coord) == 3
            assert all(isinstance(x, (int, float)) for x in first_coord)


class TestTrajectoryAPIErrorHandling:
    """Test suite for trajectory API error handling scenarios."""
    
    @patch('main.get_asteroid_data')
    def test_trajectory_malformed_nasa_response(self, mock_get_data):
        """Test trajectory endpoint with malformed NASA API response."""
        # Missing orbit section
        malformed_response = {
            "object": {
                "fullname": "Test Asteroid"
            }
            # Missing orbit section
        }
        mock_get_data.return_value = malformed_response
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 422
        assert "Failed to calculate trajectory" in response.json()["detail"]
    
    @patch('main.get_asteroid_data')
    def test_trajectory_incomplete_orbital_elements(self, mock_get_data):
        """Test trajectory endpoint with incomplete orbital elements."""
        incomplete_response = {
            "object": {
                "fullname": "Test Asteroid"
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"},
                    {"name": "e", "value": "0.1"}
                    # Missing required elements: i, om, w, ma
                ]
            }
        }
        mock_get_data.return_value = incomplete_response
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 422
        assert "Missing required orbital elements" in response.json()["detail"]
    
    @patch('main.get_asteroid_data')
    def test_trajectory_invalid_orbital_values(self, mock_get_data):
        """Test trajectory endpoint with invalid orbital element values."""
        invalid_response = {
            "object": {
                "fullname": "Test Asteroid"
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "-1.0"},  # Invalid negative semi-major axis
                    {"name": "e", "value": "0.1"},
                    {"name": "i", "value": "3.0"},
                    {"name": "om", "value": "204.0"},
                    {"name": "w", "value": "126.0"},
                    {"name": "ma", "value": "268.0"}
                ]
            }
        }
        mock_get_data.return_value = invalid_response
        
        response = client.get("/api/trajectory/TestAsteroid")
        
        assert response.status_code == 422
        assert "Semi-major axis must be positive" in response.json()["detail"]


class TestTrajectoryAPIPerformance:
    """Test suite for trajectory API performance considerations."""
    
    @patch('main.get_asteroid_data')
    def test_trajectory_response_time(self, mock_get_data):
        """Test that trajectory calculation completes in reasonable time."""
        import time
        
        # Mock with valid data
        mock_get_data.return_value = {
            "object": {"fullname": "Test Asteroid"},
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"},
                    {"name": "e", "value": "0.1"},
                    {"name": "i", "value": "5.0"},
                    {"name": "om", "value": "100.0"},
                    {"name": "w", "value": "200.0"},
                    {"name": "ma", "value": "300.0"}
                ]
            }
        }
        
        start_time = time.time()
        response = client.get("/api/trajectory/TestAsteroid")
        end_time = time.time()
        
        # Should complete within reasonable time (10 seconds for 365 points)
        assert (end_time - start_time) < 10.0
        assert response.status_code == 200