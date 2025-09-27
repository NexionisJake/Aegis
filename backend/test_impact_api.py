"""
Integration tests for impact calculation API endpoint.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestImpactCalculationAPI:
    """Test the impact calculation API endpoint."""
    
    def test_impact_calculation_basic(self):
        """Test basic impact calculation with valid parameters."""
        request_data = {
            "diameter_km": 1.0,
            "velocity_kps": 20.0,
            "asteroid_density_kg_m3": 3000.0,
            "target_density_kg_m3": 2500.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields are present
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
        
        # Check reasonable values for 1km asteroid at 20km/s
        assert 1e12 < data["massKg"] < 1e15  # Should be trillions of kg
        assert 1e19 < data["impactEnergyJoules"] < 1e22  # Should be in the 10^19-10^22 J range
        assert 1000 < data["craterDiameterMeters"] < 100000  # Should be km-scale crater
        assert abs(data["craterDiameterKm"] - data["craterDiameterMeters"] / 1000.0) < 0.01
    
    def test_impact_calculation_apophis_scenario(self):
        """Test impact calculation with Apophis-like parameters."""
        request_data = {
            "diameter_km": 0.37,  # 370 meters
            "velocity_kps": 19.0,
            "asteroid_density_kg_m3": 3000.0,
            "target_density_kg_m3": 2500.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify Apophis-scale impact
        assert 1e10 < data["massKg"] < 1e12  # Tens to hundreds of billions of kg
        assert 1e18 < data["impactEnergyJoules"] < 1e21  # Exajoule range
        assert 1000 < data["craterDiameterMeters"] < 20000  # Several km crater
        assert 100 < data["impactEnergyMegatons"] < 10000  # Hundreds to thousands of megatons
    
    def test_impact_calculation_small_asteroid(self):
        """Test impact calculation with small asteroid."""
        request_data = {
            "diameter_km": 0.01,  # 10 meters
            "velocity_kps": 15.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Small asteroid should produce smaller effects
        assert data["massKg"] < 1e8  # Less than 100 million kg
        assert data["craterDiameterMeters"] < 500  # Less than 500m crater
        assert data["impactEnergyMegatons"] < 100  # Less than 100 megatons
    
    def test_impact_calculation_large_asteroid(self):
        """Test impact calculation with large asteroid."""
        request_data = {
            "diameter_km": 10.0,  # 10 km (dinosaur killer size)
            "velocity_kps": 25.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Large asteroid should produce massive effects
        assert data["massKg"] > 1e15  # More than quadrillion kg
        assert data["craterDiameterMeters"] > 50000  # More than 50 km crater
        assert data["impactEnergyMegatons"] > 1e6  # More than 1 million megatons
    
    def test_impact_calculation_default_densities(self):
        """Test impact calculation with default density values."""
        request_data = {
            "diameter_km": 1.0,
            "velocity_kps": 20.0
            # Using default densities
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should work with default values
        assert all(field in data for field in ["craterDiameterMeters", "impactEnergyJoules", "massKg"])
        assert all(data[field] > 0 for field in ["craterDiameterMeters", "impactEnergyJoules", "massKg"])
    
    def test_impact_calculation_different_densities(self):
        """Test impact calculation with different density values."""
        base_request = {
            "diameter_km": 1.0,
            "velocity_kps": 20.0
        }
        
        # Low density asteroid (carbonaceous)
        low_density_request = {**base_request, "asteroid_density_kg_m3": 1500.0}
        response_low = client.post("/api/impact/calculate", json=low_density_request)
        
        # High density asteroid (metallic)
        high_density_request = {**base_request, "asteroid_density_kg_m3": 7800.0}
        response_high = client.post("/api/impact/calculate", json=high_density_request)
        
        assert response_low.status_code == 200
        assert response_high.status_code == 200
        
        data_low = response_low.json()
        data_high = response_high.json()
        
        # Higher density should produce more mass and energy
        assert data_high["massKg"] > data_low["massKg"]
        assert data_high["impactEnergyJoules"] > data_low["impactEnergyJoules"]
        assert data_high["craterDiameterMeters"] > data_low["craterDiameterMeters"]


class TestImpactCalculationAPIValidation:
    """Test API input validation and error handling."""
    
    def test_missing_required_fields(self):
        """Test API with missing required fields."""
        # Missing diameter
        response = client.post("/api/impact/calculate", json={"velocity_kps": 20.0})
        assert response.status_code == 422
        
        # Missing velocity
        response = client.post("/api/impact/calculate", json={"diameter_km": 1.0})
        assert response.status_code == 422
        
        # Empty request
        response = client.post("/api/impact/calculate", json={})
        assert response.status_code == 422
    
    def test_invalid_diameter_values(self):
        """Test API with invalid diameter values."""
        base_request = {"velocity_kps": 20.0}
        
        # Negative diameter
        response = client.post("/api/impact/calculate", json={**base_request, "diameter_km": -1.0})
        assert response.status_code == 422
        
        # Zero diameter
        response = client.post("/api/impact/calculate", json={**base_request, "diameter_km": 0.0})
        assert response.status_code == 422
        
        # Too large diameter
        response = client.post("/api/impact/calculate", json={**base_request, "diameter_km": 1500.0})
        assert response.status_code == 422
    
    def test_invalid_velocity_values(self):
        """Test API with invalid velocity values."""
        base_request = {"diameter_km": 1.0}
        
        # Negative velocity
        response = client.post("/api/impact/calculate", json={**base_request, "velocity_kps": -20.0})
        assert response.status_code == 422
        
        # Zero velocity
        response = client.post("/api/impact/calculate", json={**base_request, "velocity_kps": 0.0})
        assert response.status_code == 422
        
        # Too high velocity
        response = client.post("/api/impact/calculate", json={**base_request, "velocity_kps": 150.0})
        assert response.status_code == 422
    
    def test_invalid_density_values(self):
        """Test API with invalid density values."""
        base_request = {"diameter_km": 1.0, "velocity_kps": 20.0}
        
        # Negative asteroid density
        response = client.post("/api/impact/calculate", json={**base_request, "asteroid_density_kg_m3": -3000.0})
        assert response.status_code == 422
        
        # Zero asteroid density
        response = client.post("/api/impact/calculate", json={**base_request, "asteroid_density_kg_m3": 0.0})
        assert response.status_code == 422
        
        # Too high asteroid density
        response = client.post("/api/impact/calculate", json={**base_request, "asteroid_density_kg_m3": 25000.0})
        assert response.status_code == 422
        
        # Negative target density
        response = client.post("/api/impact/calculate", json={**base_request, "target_density_kg_m3": -2500.0})
        assert response.status_code == 422
    
    def test_invalid_data_types(self):
        """Test API with invalid data types."""
        # Non-numeric string (Pydantic will convert valid numeric strings)
        response = client.post("/api/impact/calculate", json={
            "diameter_km": "invalid",
            "velocity_kps": 20.0
        })
        assert response.status_code == 422
        
        # Null values
        response = client.post("/api/impact/calculate", json={
            "diameter_km": None,
            "velocity_kps": 20.0
        })
        assert response.status_code == 422
        
        # Array instead of number
        response = client.post("/api/impact/calculate", json={
            "diameter_km": [1.0],
            "velocity_kps": 20.0
        })
        assert response.status_code == 422
    
    def test_malformed_json(self):
        """Test API with malformed JSON."""
        response = client.post("/api/impact/calculate", data="invalid json")
        assert response.status_code == 422
    
    def test_empty_request_body(self):
        """Test API with empty request body."""
        response = client.post("/api/impact/calculate")
        assert response.status_code == 422


class TestImpactCalculationAPIIntegration:
    """Test complete integration scenarios."""
    
    def test_complete_workflow_apophis(self):
        """Test complete workflow with Apophis parameters."""
        # This simulates the frontend sending Apophis impact parameters
        apophis_request = {
            "diameter_km": 0.37,
            "velocity_kps": 19.0,
            "asteroid_density_kg_m3": 3000.0,
            "target_density_kg_m3": 2500.0
        }
        
        response = client.post("/api/impact/calculate", json=apophis_request)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present and valid
        assert isinstance(data["craterDiameterMeters"], (int, float))
        assert isinstance(data["craterDiameterKm"], (int, float))
        assert isinstance(data["impactEnergyJoules"], (int, float))
        assert isinstance(data["impactEnergyMegatons"], (int, float))
        assert isinstance(data["massKg"], (int, float))
        
        # Verify consistency between different units
        assert abs(data["craterDiameterKm"] - data["craterDiameterMeters"] / 1000.0) < 0.0001
        
        # Verify reasonable Apophis impact results
        assert 5000 < data["craterDiameterMeters"] < 20000  # 5-20 km crater
        assert 500 < data["impactEnergyMegatons"] < 5000  # Hundreds to thousands of megatons
    
    def test_api_response_format(self):
        """Test that API response format matches frontend expectations."""
        request_data = {
            "diameter_km": 1.0,
            "velocity_kps": 20.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        data = response.json()
        
        # Verify exact field names expected by frontend
        expected_fields = {
            "craterDiameterMeters": float,
            "impactEnergyJoules": float,
            "massKg": float,
            "craterDiameterKm": float,
            "impactEnergyMegatons": float
        }
        
        for field_name, field_type in expected_fields.items():
            assert field_name in data
            assert isinstance(data[field_name], field_type)
    
    def test_endpoint_accessibility(self):
        """Test that the endpoint is accessible and returns proper JSON."""
        request_data = {
            "diameter_km": 1.0,
            "velocity_kps": 20.0
        }
        
        response = client.post("/api/impact/calculate", json=request_data)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify the response can be parsed as JSON
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0


if __name__ == "__main__":
    pytest.main([__file__])