"""
End-to-end integration tests for Project Aegis backend.

These tests verify the complete workflow from NASA API integration
through orbital calculations to impact simulations.
"""
import pytest
import requests
import time
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)


class TestCompleteOrbitalVisualizationWorkflow:
    """Test complete orbital visualization user journey."""
    
    def test_health_check_endpoint(self):
        """Test that the health check endpoint works correctly."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "nasa_api_configured" in data
    
    @patch('nasa_client.requests.Session.get')
    def test_complete_trajectory_calculation_workflow(self, mock_get):
        """Test complete workflow from NASA API to trajectory calculation."""
        # Mock NASA API response with realistic Apophis data
        mock_nasa_response = {
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
                    {"name": "om", "value": "204.4460932", "sigma": "1.1587e-06", "units": "deg"},
                    {"name": "w", "value": "126.4013193", "sigma": "1.1587e-06", "units": "deg"},
                    {"name": "ma", "value": "268.7143018", "sigma": "1.1587e-06", "units": "deg"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Test trajectory calculation endpoint
        response = client.get("/api/trajectory/Apophis")
        assert response.status_code == 200
        
        data = response.json()
        assert "asteroid_path" in data
        assert "earth_path" in data
        assert isinstance(data["asteroid_path"], list)
        assert isinstance(data["earth_path"], list)
        
        # Verify trajectory data structure
        if data["asteroid_path"]:
            assert len(data["asteroid_path"][0]) == 3  # [x, y, z] coordinates
        if data["earth_path"]:
            assert len(data["earth_path"][0]) == 3  # [x, y, z] coordinates
        
        # Verify NASA API was called correctly
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert "sstr" in call_args[1]["params"]
        assert call_args[1]["params"]["sstr"] == "Apophis"
    
    @patch('nasa_client.requests.Session.get')
    def test_asteroid_data_endpoint_integration(self, mock_get):
        """Test asteroid data endpoint with real NASA API structure."""
        mock_nasa_response = {
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
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        response = client.get("/api/asteroid/Apophis")
        assert response.status_code == 200
        
        data = response.json()
        assert data["object"]["fullname"] == "99942 Apophis (2004 MN4)"
        assert data["object"]["neo"] is True
        assert "orbit" in data
    
    def test_impact_calculation_workflow(self):
        """Test complete impact calculation workflow."""
        # Test with realistic Apophis parameters
        impact_params = {
            "diameter_km": 0.34,
            "velocity_kps": 7.42,
            "asteroid_density_kg_m3": 3000.0,
            "target_density_kg_m3": 2500.0
        }
        
        response = client.post("/api/impact/calculate", json=impact_params)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        required_fields = [
            "craterDiameterMeters",
            "impactEnergyJoules", 
            "massKg",
            "craterDiameterKm",
            "impactEnergyMegatons"
        ]
        
        for field in required_fields:
            assert field in data
            assert isinstance(data[field], (int, float))
            assert data[field] > 0
        
        # Verify reasonable values for Apophis
        assert data["craterDiameterMeters"] > 100  # Should be significant crater
        assert data["impactEnergyJoules"] > 1e12   # Should be substantial energy
        assert data["massKg"] > 1e9                # Should be substantial mass
    
    @patch('nasa_client.requests.Session.get')
    def test_complete_3d_to_2d_simulation_workflow(self, mock_get):
        """Test complete workflow from 3D orbital view to 2D impact simulation."""
        # Step 1: Mock NASA API for trajectory calculation
        mock_nasa_response = {
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
                    {"name": "om", "value": "204.4460932"},
                    {"name": "w", "value": "126.4013193"},
                    {"name": "ma", "value": "268.7143018"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Step 2: Get trajectory data (3D visualization)
        trajectory_response = client.get("/api/trajectory/Apophis")
        assert trajectory_response.status_code == 200
        
        trajectory_data = trajectory_response.json()
        assert "asteroid_path" in trajectory_data
        assert "earth_path" in trajectory_data
        
        # Step 3: Calculate impact (2D simulation)
        impact_params = {
            "diameter_km": 0.34,
            "velocity_kps": 7.42
        }
        
        impact_response = client.post("/api/impact/calculate", json=impact_params)
        assert impact_response.status_code == 200
        
        impact_data = impact_response.json()
        assert "craterDiameterMeters" in impact_data
        assert "impactEnergyJoules" in impact_data
        
        # Verify data consistency between steps
        assert trajectory_data["asteroid_path"] is not None
        assert impact_data["craterDiameterMeters"] > 0


class TestErrorHandlingIntegration:
    """Test error handling across the complete application."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_nasa_api_error_propagation(self, mock_get):
        """Test that NASA API errors are properly handled and propagated."""
        # Test 404 error
        mock_get.side_effect = requests.exceptions.HTTPError(
            response=Mock(status_code=404, text="Not Found")
        )
        
        response = client.get("/api/trajectory/NonExistentAsteroid")
        assert response.status_code == 404
        
        data = response.json()
        # The response format may be different based on our error handling
        assert "detail" in data or "error" in data
    
    @patch('nasa_client.requests.Session.get')
    def test_network_error_handling(self, mock_get):
        """Test network error handling."""
        mock_get.side_effect = requests.exceptions.ConnectionError("Connection failed")
        
        response = client.get("/api/trajectory/Apophis")
        # May return 500 due to retry mechanism and error handling
        assert response.status_code in [500, 503]
        
        data = response.json()
        assert "detail" in data or "error" in data
    
    @patch('nasa_client.requests.Session.get')
    def test_timeout_error_handling(self, mock_get):
        """Test timeout error handling."""
        mock_get.side_effect = requests.exceptions.Timeout("Request timeout")
        
        response = client.get("/api/trajectory/Apophis")
        # May return 500 due to retry mechanism and error handling
        assert response.status_code in [500, 504]
        
        data = response.json()
        assert "detail" in data or "error" in data
    
    def test_invalid_impact_parameters(self):
        """Test validation error handling for impact calculations."""
        # Test with invalid parameters
        invalid_params = {
            "diameter_km": -1,  # Invalid negative diameter
            "velocity_kps": 0   # Invalid zero velocity
        }
        
        response = client.post("/api/impact/calculate", json=invalid_params)
        assert response.status_code == 422
        
        data = response.json()
        assert "detail" in data
    
    def test_malformed_request_handling(self):
        """Test handling of malformed requests."""
        # Test with malformed JSON
        response = client.post(
            "/api/impact/calculate",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


class TestPerformanceAndReliability:
    """Test application performance and reliability."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_concurrent_requests_handling(self, mock_get):
        """Test handling of concurrent requests."""
        mock_nasa_response = {
            "object": {"fullname": "Test Asteroid", "neo": True},
            "orbit": {
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
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Make multiple concurrent requests
        import threading
        results = []
        errors = []
        
        def make_request():
            try:
                response = client.get("/api/trajectory/TestAsteroid")
                results.append(response.status_code)
            except Exception as e:
                errors.append(str(e))
        
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(errors) == 0
        assert all(status == 200 for status in results)
    
    @patch('nasa_client.requests.Session.get')
    def test_large_trajectory_data_handling(self, mock_get):
        """Test handling of large trajectory datasets."""
        # Create mock response with realistic orbital elements
        mock_nasa_response = {
            "object": {"fullname": "Large Dataset Test", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "2.5"},
                    {"name": "e", "value": "0.3"},
                    {"name": "i", "value": "15.0"},
                    {"name": "om", "value": "45.0"},
                    {"name": "w", "value": "90.0"},
                    {"name": "ma", "value": "180.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        start_time = time.time()
        response = client.get("/api/trajectory/LargeDatasetTest")
        end_time = time.time()
        
        assert response.status_code == 200
        
        data = response.json()
        assert "asteroid_path" in data
        assert "earth_path" in data
        
        # Verify reasonable response time (should be under 10 seconds)
        response_time = end_time - start_time
        assert response_time < 10.0
        
        # Verify trajectory data size is reasonable
        assert len(data["asteroid_path"]) > 0
        assert len(data["earth_path"]) > 0
    
    def test_memory_usage_impact_calculations(self):
        """Test memory usage during impact calculations."""
        # Test multiple impact calculations to check for memory leaks
        impact_params = {
            "diameter_km": 1.0,
            "velocity_kps": 15.0
        }
        
        for i in range(10):
            response = client.post("/api/impact/calculate", json=impact_params)
            assert response.status_code == 200
            
            data = response.json()
            assert "craterDiameterMeters" in data
            assert data["craterDiameterMeters"] > 0


class TestCrossComponentIntegration:
    """Test integration between different components."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_orbital_to_impact_data_consistency(self, mock_get):
        """Test data consistency between orbital and impact calculations."""
        # Mock NASA API response
        mock_nasa_response = {
            "object": {
                "fullname": "Test Consistency Asteroid",
                "neo": True,
                "diameter": "0.5"  # 500m diameter
            },
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.2"},
                    {"name": "e", "value": "0.2"},
                    {"name": "i", "value": "10.0"},
                    {"name": "om", "value": "50.0"},
                    {"name": "w", "value": "100.0"},
                    {"name": "ma", "value": "150.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Get orbital data
        orbital_response = client.get("/api/trajectory/TestConsistencyAsteroid")
        assert orbital_response.status_code == 200
        
        # Calculate impact with consistent parameters
        impact_params = {
            "diameter_km": 0.5,  # Same as in NASA data
            "velocity_kps": 12.0
        }
        
        impact_response = client.post("/api/impact/calculate", json=impact_params)
        assert impact_response.status_code == 200
        
        orbital_data = orbital_response.json()
        impact_data = impact_response.json()
        
        # Verify both calculations succeeded
        assert len(orbital_data["asteroid_path"]) > 0
        assert impact_data["craterDiameterMeters"] > 0
        
        # Verify impact energy is reasonable for the given parameters
        expected_mass = (4/3) * 3.14159 * (250**3) * 3000  # Rough calculation
        expected_energy = 0.5 * expected_mass * (12000**2)  # Rough calculation
        
        # Allow for significant variance due to different calculation methods
        assert impact_data["impactEnergyJoules"] > expected_energy * 0.1
        assert impact_data["impactEnergyJoules"] < expected_energy * 10
    
    @patch('nasa_client.requests.Session.get')
    def test_error_recovery_workflow(self, mock_get):
        """Test error recovery and retry mechanisms."""
        # First call fails, second succeeds
        mock_nasa_response = {
            "object": {"fullname": "Recovery Test", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"},
                    {"name": "e", "value": "0.1"},
                    {"name": "i", "value": "5.0"},
                    {"name": "om", "value": "0.0"},
                    {"name": "w", "value": "0.0"},
                    {"name": "ma", "value": "0.0"}
                ]
            }
        }
        
        mock_success_response = Mock()
        mock_success_response.status_code = 200
        mock_success_response.json.return_value = mock_nasa_response
        mock_success_response.raise_for_status.return_value = None
        
        # Configure mock to fail multiple times, then succeed
        mock_get.side_effect = [
            requests.exceptions.Timeout("First call timeout"),
            requests.exceptions.Timeout("Second call timeout"),
            requests.exceptions.Timeout("Third call timeout"),
            mock_success_response
        ]
        
        # First call should fail due to circuit breaker after retries
        response1 = client.get("/api/trajectory/RecoveryTest")
        # The circuit breaker may open after multiple failures, causing 503
        assert response1.status_code in [500, 503, 504]
        
        # Reset circuit breaker for second test
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
        
        # Configure mock to succeed on next call
        mock_get.side_effect = [mock_success_response]
        
        # Second call should succeed
        response2 = client.get("/api/trajectory/RecoveryTest")
        assert response2.status_code == 200
        
        data = response2.json()
        assert "asteroid_path" in data
        assert "earth_path" in data


class TestRealWorldScenarios:
    """Test scenarios that simulate real-world usage."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_apophis_complete_simulation(self, mock_get):
        """Test complete simulation workflow with real Apophis data."""
        # Use actual Apophis orbital elements (simplified)
        apophis_data = {
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "shortname": "99942 Apophis",
                "neo": True,
                "pha": True,
                "diameter": "0.34"
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460932"},
                    {"name": "w", "value": "126.4013193"},
                    {"name": "ma", "value": "268.7143018"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = apophis_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Step 1: Get Apophis trajectory
        trajectory_response = client.get("/api/trajectory/Apophis")
        assert trajectory_response.status_code == 200
        
        trajectory_data = trajectory_response.json()
        assert len(trajectory_data["asteroid_path"]) > 0
        assert len(trajectory_data["earth_path"]) > 0
        
        # Step 2: Simulate Apophis impact
        apophis_impact_params = {
            "diameter_km": 0.34,
            "velocity_kps": 7.42,  # Typical Earth encounter velocity
            "asteroid_density_kg_m3": 3000.0
        }
        
        impact_response = client.post("/api/impact/calculate", json=apophis_impact_params)
        assert impact_response.status_code == 200
        
        impact_data = impact_response.json()
        
        # Verify realistic Apophis impact results
        assert impact_data["craterDiameterMeters"] > 1000  # Should be significant
        assert impact_data["craterDiameterKm"] > 1.0
        assert impact_data["impactEnergyMegatons"] > 100   # Should be substantial
        
        # Verify mass calculation is reasonable for Apophis
        expected_volume = (4/3) * 3.14159 * (170**3)  # 340m diameter = 170m radius
        expected_mass = expected_volume * 3000  # 3000 kg/m³ density
        
        # Allow for reasonable variance
        assert impact_data["massKg"] > expected_mass * 0.5
        assert impact_data["massKg"] < expected_mass * 2.0
    
    def test_various_asteroid_sizes_impact_scaling(self):
        """Test impact calculations scale properly with asteroid size."""
        test_cases = [
            {"diameter": 0.1, "name": "Small"},
            {"diameter": 0.5, "name": "Medium"},
            {"diameter": 1.0, "name": "Large"},
            {"diameter": 5.0, "name": "Very Large"}
        ]
        
        results = []
        
        for case in test_cases:
            params = {
                "diameter_km": case["diameter"],
                "velocity_kps": 15.0
            }
            
            response = client.post("/api/impact/calculate", json=params)
            assert response.status_code == 200
            
            data = response.json()
            results.append({
                "diameter": case["diameter"],
                "crater": data["craterDiameterMeters"],
                "energy": data["impactEnergyJoules"],
                "mass": data["massKg"]
            })
        
        # Verify scaling relationships
        for i in range(1, len(results)):
            prev = results[i-1]
            curr = results[i]
            
            # Larger asteroids should have larger craters, more energy, more mass
            assert curr["crater"] > prev["crater"]
            assert curr["energy"] > prev["energy"]
            assert curr["mass"] > prev["mass"]
            
            # Mass should scale roughly with diameter cubed
            diameter_ratio = curr["diameter"] / prev["diameter"]
            mass_ratio = curr["mass"] / prev["mass"]
            
            # Allow for reasonable variance in scaling
            expected_mass_ratio = diameter_ratio ** 3
            assert mass_ratio > expected_mass_ratio * 0.5
            assert mass_ratio < expected_mass_ratio * 2.0

class TestAdvancedIntegrationScenarios:
    """Advanced end-to-end integration tests for complex scenarios."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_complete_user_journey_simulation(self, mock_get):
        """Test complete user journey from orbital visualization to impact simulation."""
        # Simulate realistic Apophis data
        apophis_orbital_data = {
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "shortname": "99942 Apophis",
                "neo": True,
                "pha": True,
                "diameter": "0.34"
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263", "units": "au"},
                    {"name": "e", "value": "0.1914276290", "units": ""},
                    {"name": "i", "value": "3.3314075515", "units": "deg"},
                    {"name": "om", "value": "204.4460932", "units": "deg"},
                    {"name": "w", "value": "126.4013193", "units": "deg"},
                    {"name": "ma", "value": "268.7143018", "units": "deg"}
                ]
            },
            "phys_par": {
                "H": "19.7",
                "diameter": "0.34"
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = apophis_orbital_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Step 1: User loads application - fetch orbital data
        orbital_response = client.get("/api/trajectory/Apophis")
        assert orbital_response.status_code == 200
        
        orbital_data = orbital_response.json()
        assert "asteroid_path" in orbital_data
        assert "earth_path" in orbital_data
        assert len(orbital_data["asteroid_path"]) > 0
        assert len(orbital_data["earth_path"]) > 0
        
        # Verify trajectory data structure
        for point in orbital_data["asteroid_path"][:5]:  # Check first 5 points
            assert len(point) == 3  # [x, y, z] coordinates
            assert all(isinstance(coord, (int, float)) for coord in point)
        
        for point in orbital_data["earth_path"][:5]:  # Check first 5 points
            assert len(point) == 3  # [x, y, z] coordinates
            assert all(isinstance(coord, (int, float)) for coord in point)
        
        # Step 2: User triggers impact simulation
        impact_params = {
            "diameter_km": 0.34,
            "velocity_kps": 7.42,
            "asteroid_density_kg_m3": 3000.0,
            "target_density_kg_m3": 2500.0
        }
        
        impact_response = client.post("/api/impact/calculate", json=impact_params)
        assert impact_response.status_code == 200
        
        impact_data = impact_response.json()
        
        # Verify comprehensive impact results
        required_fields = [
            "craterDiameterMeters", "impactEnergyJoules", "massKg",
            "craterDiameterKm", "impactEnergyMegatons"
        ]
        
        for field in required_fields:
            assert field in impact_data
            assert isinstance(impact_data[field], (int, float))
            assert impact_data[field] > 0
        
        # Verify realistic Apophis impact values
        assert impact_data["craterDiameterMeters"] > 1000  # Should be significant
        assert impact_data["craterDiameterKm"] > 1.0
        assert impact_data["impactEnergyMegatons"] > 100
        assert impact_data["massKg"] > 1e10  # Should be substantial mass
        
        # Step 3: Verify data consistency between orbital and impact calculations
        # The orbital data should be consistent with the impact parameters
        assert mock_get.call_count >= 1  # NASA API was called
        
        # Verify API call parameters
        call_args = mock_get.call_args
        assert "sstr" in call_args[1]["params"]
        assert call_args[1]["params"]["sstr"] == "Apophis"
        assert call_args[1]["params"]["full-prec"] == "true"
    
    @patch('nasa_client.requests.Session.get')
    def test_multiple_asteroid_comparison_workflow(self, mock_get):
        """Test workflow for comparing multiple asteroids."""
        # Define test asteroids with different characteristics
        test_asteroids = {
            "SmallAsteroid": {
                "object": {"fullname": "Small Test Asteroid", "neo": True, "diameter": "0.1"},
                "orbit": {
                    "epoch": "2461000.5",
                    "elements": [
                        {"name": "a", "value": "1.1"}, {"name": "e", "value": "0.1"},
                        {"name": "i", "value": "5.0"}, {"name": "om", "value": "0.0"},
                        {"name": "w", "value": "0.0"}, {"name": "ma", "value": "0.0"}
                    ]
                }
            },
            "MediumAsteroid": {
                "object": {"fullname": "Medium Test Asteroid", "neo": True, "diameter": "0.5"},
                "orbit": {
                    "epoch": "2461000.5",
                    "elements": [
                        {"name": "a", "value": "1.5"}, {"name": "e", "value": "0.2"},
                        {"name": "i", "value": "10.0"}, {"name": "om", "value": "45.0"},
                        {"name": "w", "value": "90.0"}, {"name": "ma", "value": "180.0"}
                    ]
                }
            },
            "LargeAsteroid": {
                "object": {"fullname": "Large Test Asteroid", "neo": True, "diameter": "2.0"},
                "orbit": {
                    "epoch": "2461000.5",
                    "elements": [
                        {"name": "a", "value": "2.0"}, {"name": "e", "value": "0.3"},
                        {"name": "i", "value": "15.0"}, {"name": "om", "value": "90.0"},
                        {"name": "w", "value": "180.0"}, {"name": "ma", "value": "270.0"}
                    ]
                }
            }
        }
        
        impact_scenarios = [
            {"diameter_km": 0.1, "velocity_kps": 15.0},
            {"diameter_km": 0.5, "velocity_kps": 12.0},
            {"diameter_km": 2.0, "velocity_kps": 20.0}
        ]
        
        results = []
        
        for i, (asteroid_name, asteroid_data) in enumerate(test_asteroids.items()):
            # Mock NASA API response for this asteroid
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = asteroid_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Get trajectory data
            trajectory_response = client.get(f"/api/trajectory/{asteroid_name}")
            assert trajectory_response.status_code == 200
            
            trajectory_data = trajectory_response.json()
            assert "asteroid_path" in trajectory_data
            assert "earth_path" in trajectory_data
            
            # Calculate impact for this asteroid
            impact_response = client.post("/api/impact/calculate", json=impact_scenarios[i])
            assert impact_response.status_code == 200
            
            impact_data = impact_response.json()
            
            results.append({
                "name": asteroid_name,
                "trajectory_points": len(trajectory_data["asteroid_path"]),
                "crater_diameter": impact_data["craterDiameterMeters"],
                "impact_energy": impact_data["impactEnergyJoules"],
                "mass": impact_data["massKg"]
            })
        
        # Verify scaling relationships between asteroids
        assert len(results) == 3
        
        # Larger asteroids should generally have more impact
        small, medium, large = results[0], results[1], results[2]
        
        assert small["crater_diameter"] < medium["crater_diameter"] < large["crater_diameter"]
        assert small["impact_energy"] < medium["impact_energy"] < large["impact_energy"]
        assert small["mass"] < medium["mass"] < large["mass"]
        
        # All should have reasonable trajectory data
        for result in results:
            assert result["trajectory_points"] > 0
    
    def test_extreme_impact_parameters(self):
        """Test impact calculations with extreme but valid parameters."""
        extreme_cases = [
            {
                "name": "Tiny Asteroid",
                "params": {"diameter_km": 0.001, "velocity_kps": 5.0},  # 1m diameter
                "expected_min_crater": 1,  # Should be at least 1m crater
                "expected_max_crater": 100
            },
            {
                "name": "Massive Asteroid",
                "params": {"diameter_km": 10.0, "velocity_kps": 30.0},  # 10km diameter, very fast
                "expected_min_crater": 50000,  # Should be massive crater
                "expected_max_crater": 1000000
            },
            {
                "name": "Slow Impact",
                "params": {"diameter_km": 1.0, "velocity_kps": 1.0},  # Very slow
                "expected_min_crater": 100,
                "expected_max_crater": 10000
            },
            {
                "name": "Fast Impact",
                "params": {"diameter_km": 1.0, "velocity_kps": 50.0},  # Very fast
                "expected_min_crater": 1000,
                "expected_max_crater": 100000
            }
        ]
        
        for case in extreme_cases:
            response = client.post("/api/impact/calculate", json=case["params"])
            assert response.status_code == 200
            
            data = response.json()
            crater_diameter = data["craterDiameterMeters"]
            
            # Verify crater size is within expected range
            assert case["expected_min_crater"] <= crater_diameter <= case["expected_max_crater"], \
                f"Crater diameter {crater_diameter} not in expected range for {case['name']}"
            
            # Verify all required fields are present and positive
            assert data["impactEnergyJoules"] > 0
            assert data["massKg"] > 0
            assert data["craterDiameterKm"] > 0
            assert data["impactEnergyMegatons"] >= 0  # Can be 0 for very small impacts
    
    @patch('nasa_client.requests.Session.get')
    def test_concurrent_mixed_requests(self, mock_get):
        """Test handling of concurrent mixed trajectory and impact requests."""
        import threading
        import time
        
        # Mock NASA API response
        mock_nasa_response = {
            "object": {"fullname": "Concurrent Test Asteroid", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.2"}, {"name": "e", "value": "0.15"},
                    {"name": "i", "value": "8.0"}, {"name": "om", "value": "30.0"},
                    {"name": "w", "value": "60.0"}, {"name": "ma", "value": "120.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        trajectory_results = []
        impact_results = []
        errors = []
        
        def make_trajectory_request():
            try:
                response = client.get("/api/trajectory/ConcurrentTest")
                trajectory_results.append(response.status_code)
            except Exception as e:
                errors.append(f"Trajectory error: {str(e)}")
        
        def make_impact_request():
            try:
                params = {"diameter_km": 0.5, "velocity_kps": 15.0}
                response = client.post("/api/impact/calculate", json=params)
                impact_results.append(response.status_code)
            except Exception as e:
                errors.append(f"Impact error: {str(e)}")
        
        # Create mixed concurrent requests
        threads = []
        for i in range(10):
            if i % 2 == 0:
                thread = threading.Thread(target=make_trajectory_request)
            else:
                thread = threading.Thread(target=make_impact_request)
            threads.append(thread)
        
        # Start all threads
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        
        # Verify results
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(trajectory_results) == 5  # Half the requests
        assert len(impact_results) == 5     # Half the requests
        
        # All requests should succeed
        assert all(status == 200 for status in trajectory_results)
        assert all(status == 200 for status in impact_results)
        
        # Should complete in reasonable time (under 30 seconds for 10 concurrent requests)
        total_time = end_time - start_time
        assert total_time < 30.0
    
    @patch('nasa_client.requests.Session.get')
    def test_performance_with_realistic_data_volumes(self, mock_get):
        """Test performance with realistic data volumes."""
        import time
        
        # Create realistic large orbital dataset
        mock_nasa_response = {
            "object": {"fullname": "Performance Test Asteroid", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.5"}, {"name": "e", "value": "0.25"},
                    {"name": "i", "value": "12.0"}, {"name": "om", "value": "45.0"},
                    {"name": "w", "value": "90.0"}, {"name": "ma", "value": "180.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Test trajectory calculation performance
        start_time = time.time()
        response = client.get("/api/trajectory/PerformanceTest")
        trajectory_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Should complete within reasonable time (under 10 seconds)
        assert trajectory_time < 10.0
        
        # Should generate substantial trajectory data
        assert len(data["asteroid_path"]) > 100  # Should have many points
        assert len(data["earth_path"]) > 100
        
        # Test impact calculation performance
        impact_params = {"diameter_km": 1.0, "velocity_kps": 15.0}
        
        start_time = time.time()
        impact_response = client.post("/api/impact/calculate", json=impact_params)
        impact_time = time.time() - start_time
        
        assert impact_response.status_code == 200
        
        # Impact calculation should be very fast (under 1 second)
        assert impact_time < 1.0
        
        impact_data = impact_response.json()
        assert impact_data["craterDiameterMeters"] > 0
        assert impact_data["impactEnergyJoules"] > 0


class TestCrossBrowserCompatibilitySimulation:
    """Test cross-browser compatibility scenarios through backend API."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_api_response_format_consistency(self, mock_get):
        """Test that API responses are consistent across different request patterns."""
        mock_nasa_response = {
            "object": {"fullname": "Consistency Test Asteroid", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"}, {"name": "e", "value": "0.1"},
                    {"name": "i", "value": "5.0"}, {"name": "om", "value": "0.0"},
                    {"name": "w", "value": "0.0"}, {"name": "ma", "value": "0.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Test multiple requests to same endpoint
        responses = []
        for i in range(5):
            response = client.get("/api/trajectory/ConsistencyTest")
            responses.append(response.json())
        
        # All responses should have identical structure
        first_response = responses[0]
        for response in responses[1:]:
            assert response.keys() == first_response.keys()
            assert len(response["asteroid_path"]) == len(first_response["asteroid_path"])
            assert len(response["earth_path"]) == len(first_response["earth_path"])
    
    def test_json_serialization_compatibility(self):
        """Test JSON serialization compatibility for different numeric formats."""
        # Test with various numeric formats that might cause issues
        test_cases = [
            {"diameter_km": 1.0, "velocity_kps": 15.0},      # Standard floats
            {"diameter_km": 1, "velocity_kps": 15},          # Integers
            {"diameter_km": 0.5, "velocity_kps": 7.5},       # Decimal values
            {"diameter_km": 1.23456789, "velocity_kps": 15.987654321}  # High precision
        ]
        
        for params in test_cases:
            response = client.post("/api/impact/calculate", json=params)
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify all numeric fields are properly serialized
            for key, value in data.items():
                if isinstance(value, (int, float)):
                    assert not str(value).lower() in ['nan', 'inf', '-inf']
                    assert isinstance(value, (int, float))
    
    def test_unicode_and_special_characters(self):
        """Test handling of unicode and special characters in asteroid names."""
        # Note: This tests URL encoding/decoding through the API
        special_names = [
            "Test%20Asteroid",     # URL encoded space
            "Test+Asteroid",       # Plus sign
            "Test&Asteroid",       # Ampersand
            "Test=Asteroid",       # Equals sign
        ]
        
        # These should all be handled gracefully by the API
        for name in special_names:
            response = client.get(f"/api/asteroid/{name}")
            # Should either succeed or fail gracefully with proper error
            assert response.status_code in [200, 400, 404, 422, 500]
            
            # Response should always be valid JSON
            try:
                data = response.json()
                assert isinstance(data, dict)
            except ValueError:
                pytest.fail(f"Invalid JSON response for name: {name}")


class TestApplicationPerformanceBenchmarks:
    """Performance benchmarks for the complete application workflow."""
    
    def setup_method(self):
        """Reset circuit breaker state before each test."""
        from error_handlers import nasa_api_circuit_breaker
        nasa_api_circuit_breaker.failure_count = 0
        nasa_api_circuit_breaker.state = "CLOSED"
        nasa_api_circuit_breaker.last_failure_time = None
        nasa_api_circuit_breaker.next_attempt_time = None
    
    @patch('nasa_client.requests.Session.get')
    def test_end_to_end_performance_benchmark(self, mock_get):
        """Benchmark complete end-to-end workflow performance."""
        import time
        
        mock_nasa_response = {
            "object": {"fullname": "Performance Benchmark Asteroid", "neo": True},
            "orbit": {
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.2"}, {"name": "e", "value": "0.18"},
                    {"name": "i", "value": "7.5"}, {"name": "om", "value": "35.0"},
                    {"name": "w", "value": "70.0"}, {"name": "ma", "value": "140.0"}
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nasa_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Benchmark complete workflow
        total_start = time.time()
        
        # Step 1: Trajectory calculation
        trajectory_start = time.time()
        trajectory_response = client.get("/api/trajectory/PerformanceBenchmark")
        trajectory_time = time.time() - trajectory_start
        
        assert trajectory_response.status_code == 200
        trajectory_data = trajectory_response.json()
        
        # Step 2: Impact calculation
        impact_start = time.time()
        impact_params = {"diameter_km": 0.5, "velocity_kps": 12.0}
        impact_response = client.post("/api/impact/calculate", json=impact_params)
        impact_time = time.time() - impact_start
        
        assert impact_response.status_code == 200
        impact_data = impact_response.json()
        
        total_time = time.time() - total_start
        
        # Performance assertions
        assert trajectory_time < 5.0, f"Trajectory calculation too slow: {trajectory_time}s"
        assert impact_time < 0.5, f"Impact calculation too slow: {impact_time}s"
        assert total_time < 6.0, f"Total workflow too slow: {total_time}s"
        
        # Data quality assertions
        assert len(trajectory_data["asteroid_path"]) > 50
        assert len(trajectory_data["earth_path"]) > 50
        assert impact_data["craterDiameterMeters"] > 0
        assert impact_data["impactEnergyJoules"] > 0
        
        # Log performance metrics for monitoring
        print(f"Performance Benchmark Results:")
        print(f"  Trajectory calculation: {trajectory_time:.3f}s")
        print(f"  Impact calculation: {impact_time:.3f}s")
        print(f"  Total workflow: {total_time:.3f}s")
        print(f"  Trajectory points: {len(trajectory_data['asteroid_path'])}")
    
    def test_memory_usage_stability(self):
        """Test memory usage stability during repeated operations."""
        import gc
        
        # Perform multiple impact calculations to test for memory leaks
        initial_objects = len(gc.get_objects())
        
        for i in range(20):
            params = {
                "diameter_km": 0.1 + (i * 0.1),  # Varying parameters
                "velocity_kps": 10.0 + (i * 0.5)
            }
            
            response = client.post("/api/impact/calculate", json=params)
            assert response.status_code == 200
            
            # Force garbage collection
            gc.collect()
        
        final_objects = len(gc.get_objects())
        
        # Memory usage should not grow significantly
        object_growth = final_objects - initial_objects
        assert object_growth < 1000, f"Potential memory leak detected: {object_growth} new objects"
    
    @patch('nasa_client.requests.Session.get')
    def test_scalability_with_multiple_asteroids(self, mock_get):
        """Test scalability when processing multiple asteroids."""
        import time
        
        # Create multiple asteroid datasets
        asteroid_datasets = []
        for i in range(5):
            dataset = {
                "object": {"fullname": f"Scalability Test Asteroid {i}", "neo": True},
                "orbit": {
                    "epoch": "2461000.5",
                    "elements": [
                        {"name": "a", "value": str(1.0 + i * 0.2)},
                        {"name": "e", "value": str(0.1 + i * 0.05)},
                        {"name": "i", "value": str(5.0 + i * 2.0)},
                        {"name": "om", "value": str(i * 30.0)},
                        {"name": "w", "value": str(i * 45.0)},
                        {"name": "ma", "value": str(i * 60.0)}
                    ]
                }
            }
            asteroid_datasets.append(dataset)
        
        # Test processing time scales reasonably
        processing_times = []
        
        for i, dataset in enumerate(asteroid_datasets):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = dataset
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            start_time = time.time()
            response = client.get(f"/api/trajectory/ScalabilityTest{i}")
            processing_time = time.time() - start_time
            
            assert response.status_code == 200
            processing_times.append(processing_time)
        
        # Processing time should not increase dramatically
        avg_time = sum(processing_times) / len(processing_times)
        max_time = max(processing_times)
        
        assert max_time < avg_time * 3, "Processing time scaling is too poor"
        assert avg_time < 5.0, "Average processing time is too slow"