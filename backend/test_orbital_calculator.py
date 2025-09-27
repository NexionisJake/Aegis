"""
Unit tests for orbital calculator functionality.
"""
import pytest
import math
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from orbital_calculator import (
    extract_orbital_elements,
    validate_orbital_elements,
    calculate_trajectory,
    get_earth_trajectory,
    calculate_both_trajectories,
    OrbitalElements,
    OrbitalCalculationError
)


class TestOrbitalElementsExtraction:
    """Test suite for orbital elements extraction from NASA API responses."""
    
    def test_extract_orbital_elements_success(self):
        """Test successful extraction of orbital elements from valid NASA response."""
        nasa_response = {
            "object": {
                "fullname": "99942 Apophis (2004 MN4)",
                "neo": True
            },
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263", "units": "au"},
                    {"name": "e", "value": "0.1914276290", "units": ""},
                    {"name": "i", "value": "3.3314075515", "units": "deg"},
                    {"name": "om", "value": "204.4460935", "units": "deg"},
                    {"name": "w", "value": "126.3927123", "units": "deg"},
                    {"name": "ma", "value": "268.7143123", "units": "deg"}
                ]
            }
        }
        
        elements = extract_orbital_elements(nasa_response)
        
        assert isinstance(elements, OrbitalElements)
        assert elements.semi_major_axis == pytest.approx(0.9224065263)
        assert elements.eccentricity == pytest.approx(0.1914276290)
        assert elements.inclination == pytest.approx(3.3314075515)
        assert elements.longitude_ascending_node == pytest.approx(204.4460935)
        assert elements.argument_periapsis == pytest.approx(126.3927123)
        assert elements.mean_anomaly == pytest.approx(268.7143123)
        assert elements.epoch == pytest.approx(2461000.5)
    
    def test_extract_orbital_elements_missing_orbit_section(self):
        """Test error handling when orbit section is missing."""
        nasa_response = {
            "object": {
                "fullname": "Test Asteroid"
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Missing 'orbit' section" in str(exc_info.value)
    
    def test_extract_orbital_elements_missing_elements_section(self):
        """Test error handling when elements section is missing."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5"
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Missing 'elements' section" in str(exc_info.value)
    
    def test_extract_orbital_elements_missing_epoch(self):
        """Test error handling when epoch is missing."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Missing 'epoch'" in str(exc_info.value)
    
    def test_extract_orbital_elements_invalid_epoch(self):
        """Test error handling when epoch is invalid."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "invalid_epoch",
                "elements": [
                    {"name": "a", "value": "0.9224065263"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Invalid epoch value" in str(exc_info.value)
    
    def test_extract_orbital_elements_missing_required_element(self):
        """Test error handling when required orbital elements are missing."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    # Missing inclination (i), om, w, ma
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Missing required orbital elements" in str(exc_info.value)
        assert "i" in str(exc_info.value)
        assert "om" in str(exc_info.value)
        assert "w" in str(exc_info.value)
        assert "ma" in str(exc_info.value)
    
    def test_extract_orbital_elements_invalid_element_value(self):
        """Test handling of invalid element values."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "invalid_value"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Missing required orbital elements" in str(exc_info.value)
        assert "a" in str(exc_info.value)
    
    def test_extract_orbital_elements_malformed_element(self):
        """Test handling of malformed element entries."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"},
                    {"malformed": "element"},  # Missing name or value
                    {"name": "extra", "no_value": "test"}  # Missing value field
                ]
            }
        }
        
        # Should succeed despite malformed elements
        elements = extract_orbital_elements(nasa_response)
        assert isinstance(elements, OrbitalElements)
    
    def test_extract_orbital_elements_validation_negative_semi_major_axis(self):
        """Test validation of negative semi-major axis."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "-0.9224065263"},  # Negative
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Semi-major axis must be positive" in str(exc_info.value)
    
    def test_extract_orbital_elements_validation_invalid_eccentricity(self):
        """Test validation of invalid eccentricity values."""
        # Test eccentricity >= 1 (hyperbolic orbit)
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "1.5"},  # Hyperbolic
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Eccentricity must be in range [0, 1)" in str(exc_info.value)
    
    def test_extract_orbital_elements_validation_invalid_inclination(self):
        """Test validation of invalid inclination values."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "200.0"},  # > 180 degrees
                    {"name": "om", "value": "204.4460935"},
                    {"name": "w", "value": "126.3927123"},
                    {"name": "ma", "value": "268.7143123"}
                ]
            }
        }
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            extract_orbital_elements(nasa_response)
        
        assert "Inclination must be in range [0, 180]" in str(exc_info.value)
    
    def test_extract_orbital_elements_angle_normalization(self):
        """Test that angles are normalized to [0, 360) range."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "0.9224065263"},
                    {"name": "e", "value": "0.1914276290"},
                    {"name": "i", "value": "3.3314075515"},
                    {"name": "om", "value": "404.4460935"},  # > 360
                    {"name": "w", "value": "-126.3927123"},  # Negative
                    {"name": "ma", "value": "628.7143123"}   # > 360
                ]
            }
        }
        
        elements = extract_orbital_elements(nasa_response)
        
        # Check angles are normalized
        assert 0 <= elements.longitude_ascending_node < 360
        assert 0 <= elements.argument_periapsis < 360
        assert 0 <= elements.mean_anomaly < 360
        
        # Check specific normalized values
        assert elements.longitude_ascending_node == pytest.approx(44.4460935)  # 404.4460935 - 360
        assert elements.argument_periapsis == pytest.approx(233.6072877)      # -126.3927123 + 360
        assert elements.mean_anomaly == pytest.approx(268.7143123)            # 628.7143123 - 360


class TestOrbitalElementsValidation:
    """Test suite for orbital elements validation."""
    
    def test_validate_orbital_elements_success(self):
        """Test successful validation of valid orbital elements."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        assert validate_orbital_elements(elements) == True
    
    def test_validate_orbital_elements_negative_semi_major_axis(self):
        """Test validation failure for negative semi-major axis."""
        elements = OrbitalElements(
            semi_major_axis=-0.5,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            validate_orbital_elements(elements)
        
        assert "Semi-major axis must be positive" in str(exc_info.value)
    
    def test_validate_orbital_elements_invalid_eccentricity(self):
        """Test validation failure for invalid eccentricity."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=1.5,  # Hyperbolic
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            validate_orbital_elements(elements)
        
        assert "Eccentricity must be in range [0, 1)" in str(exc_info.value)
    
    def test_validate_orbital_elements_invalid_inclination(self):
        """Test validation failure for invalid inclination."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=200.0,  # > 180 degrees
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            validate_orbital_elements(elements)
        
        assert "Inclination must be in range [0, 180]" in str(exc_info.value)
    
    def test_validate_orbital_elements_nan_values(self):
        """Test validation failure for NaN values."""
        elements = OrbitalElements(
            semi_major_axis=float('nan'),
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            validate_orbital_elements(elements)
        
        assert "Non-finite orbital element value" in str(exc_info.value)
    
    def test_validate_orbital_elements_infinite_values(self):
        """Test validation failure for infinite values."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=float('inf'),
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError) as exc_info:
            validate_orbital_elements(elements)
        
        assert "Non-finite orbital element value" in str(exc_info.value)
    
    def test_validate_orbital_elements_unreasonable_epoch(self):
        """Test validation warning for unreasonable epoch values."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=1000000.0  # Very old epoch
        )
        
        # Should still validate successfully but log a warning
        assert validate_orbital_elements(elements) == True


class TestOrbitalElementsDataClass:
    """Test suite for OrbitalElements data class."""
    
    def test_orbital_elements_creation(self):
        """Test creation of OrbitalElements object."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        assert elements.semi_major_axis == 1.0
        assert elements.eccentricity == 0.1
        assert elements.inclination == 5.0
        assert elements.longitude_ascending_node == 100.0
        assert elements.argument_periapsis == 200.0
        assert elements.mean_anomaly == 300.0
        assert elements.epoch == 2461000.5
    
    def test_orbital_elements_equality(self):
        """Test equality comparison of OrbitalElements objects."""
        elements1 = OrbitalElements(1.0, 0.1, 5.0, 100.0, 200.0, 300.0, 2461000.5)
        elements2 = OrbitalElements(1.0, 0.1, 5.0, 100.0, 200.0, 300.0, 2461000.5)
        elements3 = OrbitalElements(1.1, 0.1, 5.0, 100.0, 200.0, 300.0, 2461000.5)
        
        assert elements1 == elements2
        assert elements1 != elements3


class TestEdgeCases:
    """Test suite for edge cases and boundary conditions."""
    
    def test_extract_orbital_elements_boundary_eccentricity(self):
        """Test extraction with boundary eccentricity values."""
        # Test e = 0 (circular orbit)
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"},
                    {"name": "e", "value": "0.0"},  # Circular
                    {"name": "i", "value": "0.0"},
                    {"name": "om", "value": "0.0"},
                    {"name": "w", "value": "0.0"},
                    {"name": "ma", "value": "0.0"}
                ]
            }
        }
        
        elements = extract_orbital_elements(nasa_response)
        assert elements.eccentricity == 0.0
        
        # Test e very close to 1 (highly elliptical)
        nasa_response["orbit"]["elements"][1]["value"] = "0.9999"
        elements = extract_orbital_elements(nasa_response)
        assert elements.eccentricity == pytest.approx(0.9999)
    
    def test_extract_orbital_elements_boundary_inclination(self):
        """Test extraction with boundary inclination values."""
        nasa_response = {
            "orbit": {
                "source": "JPL",
                "epoch": "2461000.5",
                "elements": [
                    {"name": "a", "value": "1.0"},
                    {"name": "e", "value": "0.1"},
                    {"name": "i", "value": "0.0"},  # Equatorial orbit
                    {"name": "om", "value": "0.0"},
                    {"name": "w", "value": "0.0"},
                    {"name": "ma", "value": "0.0"}
                ]
            }
        }
        
        elements = extract_orbital_elements(nasa_response)
        assert elements.inclination == 0.0
        
        # Test i = 180 (retrograde polar orbit)
        nasa_response["orbit"]["elements"][2]["value"] = "180.0"
        elements = extract_orbital_elements(nasa_response)
        assert elements.inclination == 180.0


class TestTrajectoryCalculation:
    """Test suite for trajectory calculation using poliastro."""
    
    def test_calculate_trajectory_success(self):
        """Test successful trajectory calculation with valid orbital elements."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,  # Apophis-like orbit
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        trajectory = calculate_trajectory(elements, num_points=10)
        
        # Verify basic properties
        assert isinstance(trajectory, list)
        assert len(trajectory) == 10
        
        # Check each coordinate is a 3D point
        for coord in trajectory:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
        
        # Verify coordinates are reasonable (within solar system bounds)
        for coord in trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            assert distance < 10.0  # Should be within 10 AU of Sun
    
    def test_calculate_trajectory_circular_orbit(self):
        """Test trajectory calculation for circular orbit."""
        elements = OrbitalElements(
            semi_major_axis=1.0,  # 1 AU
            eccentricity=0.0,     # Circular
            inclination=0.0,      # Equatorial
            longitude_ascending_node=0.0,
            argument_periapsis=0.0,
            mean_anomaly=0.0,
            epoch=2461000.5
        )
        
        trajectory = calculate_trajectory(elements, num_points=4)
        
        # For circular orbit, all points should be approximately 1 AU from origin
        for coord in trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            assert distance == pytest.approx(1.0, abs=0.1)
    
    def test_calculate_trajectory_invalid_elements(self):
        """Test trajectory calculation with invalid orbital elements."""
        elements = OrbitalElements(
            semi_major_axis=-1.0,  # Invalid negative value
            eccentricity=0.1,
            inclination=3.0,
            longitude_ascending_node=204.0,
            argument_periapsis=126.0,
            mean_anomaly=268.0,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError):
            calculate_trajectory(elements)
    
    def test_calculate_trajectory_custom_num_points(self):
        """Test trajectory calculation with custom number of points."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        trajectory = calculate_trajectory(elements, num_points=50)
        assert len(trajectory) == 50
        
        trajectory = calculate_trajectory(elements, num_points=100)
        assert len(trajectory) == 100


class TestEarthTrajectoryCalculation:
    """Test suite for Earth trajectory calculation."""
    
    def test_get_earth_trajectory_success(self):
        """Test successful Earth trajectory calculation."""
        trajectory = get_earth_trajectory(num_points=12)
        
        # Verify basic properties
        assert isinstance(trajectory, list)
        assert len(trajectory) == 12
        
        # Check each coordinate is a 3D point
        for coord in trajectory:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
        
        # Earth's orbit should be approximately 1 AU from Sun
        for coord in trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            assert distance == pytest.approx(1.0, abs=0.2)  # Allow some variation
    
    def test_get_earth_trajectory_circular_properties(self):
        """Test that Earth's trajectory has approximately circular properties."""
        trajectory = get_earth_trajectory(num_points=8)
        
        # Calculate distances from origin
        distances = []
        for coord in trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            distances.append(distance)
        
        # For Earth's nearly circular orbit, distances should be similar
        avg_distance = sum(distances) / len(distances)
        for distance in distances:
            assert distance == pytest.approx(avg_distance, rel=0.1)
    
    def test_get_earth_trajectory_custom_num_points(self):
        """Test Earth trajectory calculation with custom number of points."""
        trajectory = get_earth_trajectory(num_points=24)
        assert len(trajectory) == 24
        
        trajectory = get_earth_trajectory(num_points=100)
        assert len(trajectory) == 100


class TestCombinedTrajectoryCalculation:
    """Test suite for combined trajectory calculations."""
    
    def test_calculate_both_trajectories_success(self):
        """Test successful calculation of both asteroid and Earth trajectories."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        result = calculate_both_trajectories(elements, num_points=10)
        
        # Verify structure
        assert isinstance(result, dict)
        assert "asteroid_path" in result
        assert "earth_path" in result
        
        # Verify both trajectories
        asteroid_path = result["asteroid_path"]
        earth_path = result["earth_path"]
        
        assert len(asteroid_path) == 10
        assert len(earth_path) == 10
        
        # Check coordinate format
        for coord in asteroid_path + earth_path:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
    
    def test_calculate_both_trajectories_invalid_elements(self):
        """Test combined calculation with invalid orbital elements."""
        elements = OrbitalElements(
            semi_major_axis=-1.0,  # Invalid
            eccentricity=0.1,
            inclination=3.0,
            longitude_ascending_node=204.0,
            argument_periapsis=126.0,
            mean_anomaly=268.0,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError):
            calculate_both_trajectories(elements)


class TestTrajectoryAccuracy:
    """Test suite for trajectory calculation accuracy."""
    
    def test_trajectory_known_orbit_properties(self):
        """Test trajectory calculation against known orbital properties."""
        # Use Earth-like orbit for validation
        elements = OrbitalElements(
            semi_major_axis=1.0,      # 1 AU
            eccentricity=0.0167,      # Earth's eccentricity
            inclination=0.0,          # Equatorial plane
            longitude_ascending_node=0.0,
            argument_periapsis=0.0,
            mean_anomaly=0.0,
            epoch=2461000.5
        )
        
        trajectory = calculate_trajectory(elements, num_points=365)
        
        # Calculate orbital properties from trajectory
        distances = []
        for coord in trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            distances.append(distance)
        
        # Check semi-major axis approximation
        avg_distance = sum(distances) / len(distances)
        assert avg_distance == pytest.approx(1.0, abs=0.1)
        
        # Check eccentricity approximation (max - min distance relationship)
        max_distance = max(distances)
        min_distance = min(distances)
        calculated_ecc = (max_distance - min_distance) / (max_distance + min_distance)
        assert calculated_ecc == pytest.approx(0.0167, abs=0.05)
    
    def test_trajectory_continuity(self):
        """Test that trajectory points form a continuous path."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        trajectory = calculate_trajectory(elements, num_points=50)
        
        # Check that consecutive points are not too far apart
        for i in range(1, len(trajectory)):
            prev_coord = trajectory[i-1]
            curr_coord = trajectory[i]
            
            # Calculate distance between consecutive points
            distance = math.sqrt(sum((curr_coord[j] - prev_coord[j])**2 for j in range(3)))
            
            # Distance should be reasonable for orbital motion
            assert distance < 0.5  # Less than 0.5 AU between consecutive points