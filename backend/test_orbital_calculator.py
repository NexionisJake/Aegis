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
    create_time_range,
    OrbitalElements,
    OrbitalCalculationError
)
from impact_calculator import ImpactCalculationError
from astropy.time import Time
from astropy import units as u


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
    
    def test_calculate_trajectory_with_times_parameter(self):
        """Test trajectory calculation with provided times parameter."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        # Create custom time array
        epoch_time = Time(elements.epoch, format='jd')
        end_time = epoch_time + 1 * u.year
        custom_times = create_time_range(epoch_time, end_time, 20)
        
        # Test with provided times parameter
        trajectory_with_times = calculate_trajectory(elements, times=custom_times)
        
        # Verify trajectory uses provided times (should have 20 points)
        assert len(trajectory_with_times) == 20
        
        # Test backward compatibility - without times parameter
        trajectory_without_times = calculate_trajectory(elements, num_points=20)
        
        # Should also have 20 points but calculated differently
        assert len(trajectory_without_times) == 20
        
        # Verify both are valid trajectories
        for coord in trajectory_with_times:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
        
        for coord in trajectory_without_times:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
    
    def test_calculate_trajectory_times_parameter_overrides_num_points(self):
        """Test that times parameter overrides num_points when both are provided."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        # Create custom time array with 15 points
        epoch_time = Time(elements.epoch, format='jd')
        end_time = epoch_time + 180 * u.day  # Approximately 6 months
        custom_times = create_time_range(epoch_time, end_time, 15)
        
        # Call with both times and num_points - times should take precedence
        trajectory = calculate_trajectory(elements, num_points=100, times=custom_times)
        
        # Should have 15 points (from times array), not 100 (from num_points)
        assert len(trajectory) == 15
    
    def test_calculate_trajectory_empty_times_parameter(self):
        """Test trajectory calculation with empty times parameter raises error."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        # Test with empty times array
        with pytest.raises(OrbitalCalculationError, match="Provided times array is empty"):
            calculate_trajectory(elements, times=[])


class TestEarthTrajectoryCalculation:
    """Test suite for Earth trajectory calculation."""
    
    def test_get_earth_trajectory_success(self):
        """Test successful Earth trajectory calculation."""
        # Create a time array for testing
        epoch_time = Time.now()
        end_time = epoch_time + 2 * u.year
        times = create_time_range(epoch_time, end_time, 12)
        
        trajectory = get_earth_trajectory(times)
        
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
        # Create a time array for testing
        epoch_time = Time.now()
        end_time = epoch_time + 2 * u.year
        times = create_time_range(epoch_time, end_time, 8)
        
        trajectory = get_earth_trajectory(times)
        
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
        # Create time arrays for testing
        epoch_time = Time.now()
        end_time = epoch_time + 2 * u.year
        
        times_24 = create_time_range(epoch_time, end_time, 24)
        trajectory = get_earth_trajectory(times_24)
        assert len(trajectory) == 24
        
        times_100 = create_time_range(epoch_time, end_time, 100)
        trajectory = get_earth_trajectory(times_100)
        assert len(trajectory) == 100
    
    def test_get_earth_trajectory_empty_times(self):
        """Test Earth trajectory calculation with empty times array."""
        with pytest.raises(ImpactCalculationError, match="Empty times array provided"):
            get_earth_trajectory([])


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
        
        with pytest.raises(ImpactCalculationError):
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


class TestSynchronizedOrbitalCalculations:
    """Test suite for synchronized orbital calculations."""
    
    def test_identical_time_intervals_asteroid_earth(self):
        """Test that Earth and asteroid trajectories use identical time intervals."""
        elements = OrbitalElements(
            semi_major_axis=0.9224065263,
            eccentricity=0.1914276290,
            inclination=3.3314075515,
            longitude_ascending_node=204.4460935,
            argument_periapsis=126.3927123,
            mean_anomaly=268.7143123,
            epoch=2461000.5
        )
        
        # Calculate both trajectories
        result = calculate_both_trajectories(elements, num_points=20)
        
        # Verify both trajectories have identical number of points
        assert len(result["asteroid_path"]) == len(result["earth_path"])
        assert len(result["asteroid_path"]) == 20
        assert len(result["earth_path"]) == 20
        
        # Verify trajectories are not empty
        assert result["asteroid_path"]
        assert result["earth_path"]
        
        # Verify each coordinate is a valid 3D point
        for coord in result["asteroid_path"]:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
            assert all(math.isfinite(x) for x in coord)
        
        for coord in result["earth_path"]:
            assert isinstance(coord, list)
            assert len(coord) == 3
            assert all(isinstance(x, float) for x in coord)
            assert all(math.isfinite(x) for x in coord)
    
    def test_epoch_synchronization_various_asteroids(self):
        """Test epoch synchronization with various asteroid orbital elements."""
        # Test with different asteroid configurations
        test_asteroids = [
            # Apophis-like asteroid
            OrbitalElements(
                semi_major_axis=0.9224065263,
                eccentricity=0.1914276290,
                inclination=3.3314075515,
                longitude_ascending_node=204.4460935,
                argument_periapsis=126.3927123,
                mean_anomaly=268.7143123,
                epoch=2461000.5
            ),
            # Circular orbit asteroid
            OrbitalElements(
                semi_major_axis=1.2,
                eccentricity=0.05,
                inclination=5.0,
                longitude_ascending_node=100.0,
                argument_periapsis=200.0,
                mean_anomaly=45.0,
                epoch=2460000.0
            ),
            # Highly elliptical asteroid
            OrbitalElements(
                semi_major_axis=2.5,
                eccentricity=0.8,
                inclination=25.0,
                longitude_ascending_node=300.0,
                argument_periapsis=150.0,
                mean_anomaly=180.0,
                epoch=2462000.0
            ),
            # High inclination asteroid
            OrbitalElements(
                semi_major_axis=1.5,
                eccentricity=0.3,
                inclination=45.0,
                longitude_ascending_node=45.0,
                argument_periapsis=90.0,
                mean_anomaly=270.0,
                epoch=2459000.0
            )
        ]
        
        for i, elements in enumerate(test_asteroids):
            # Each asteroid should successfully calculate synchronized trajectories
            result = calculate_both_trajectories(elements, num_points=12)
            
            # Verify synchronization
            assert len(result["asteroid_path"]) == len(result["earth_path"])
            assert len(result["asteroid_path"]) == 12
            
            # Verify trajectories are valid
            assert result["asteroid_path"]
            assert result["earth_path"]
            
            # Successfully synchronized trajectories for this asteroid configuration
            print(f"Successfully synchronized trajectories for asteroid {i+1}: epoch={elements.epoch}")
    
    def test_shared_time_range_generation(self):
        """Test shared time range generation and validation."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        # Test different numbers of points
        test_points = [10, 24, 50, 100]
        
        for num_points in test_points:
            result = calculate_both_trajectories(elements, num_points=num_points)
            
            # Verify correct number of points
            assert len(result["asteroid_path"]) == num_points
            assert len(result["earth_path"]) == num_points
            
            # Verify trajectories are synchronized (same length)
            assert len(result["asteroid_path"]) == len(result["earth_path"])
    
    def test_time_range_validation(self):
        """Test validation of time range parameters."""
        # Test create_time_range function directly
        epoch_time = Time(2461000.5, format='jd')
        end_time = epoch_time + 2 * u.year
        
        # Test valid time range
        times = create_time_range(epoch_time, end_time, 10)
        assert len(times) == 10
        assert all(isinstance(t, Time) for t in times)
        assert times[0] == epoch_time
        assert times[-1] == end_time
        
        # Test invalid parameters
        with pytest.raises(ImpactCalculationError, match="num_points must be at least 2"):
            create_time_range(epoch_time, end_time, 1)
        
        with pytest.raises(ImpactCalculationError, match="num_points too large"):
            create_time_range(epoch_time, end_time, 20000)
        
        with pytest.raises(ImpactCalculationError, match="end_time.*must be after start_time"):
            create_time_range(end_time, epoch_time, 10)  # Reversed times
        
        with pytest.raises(ImpactCalculationError, match="Invalid num_points"):
            create_time_range(epoch_time, end_time, -5)
        
        with pytest.raises(ImpactCalculationError, match="Invalid num_points"):
            create_time_range(epoch_time, end_time, 0)
    
    def test_invalid_epoch_error_handling(self):
        """Test error handling for invalid epochs and synchronization failures."""
        # Test with invalid epoch (NaN)
        elements_nan_epoch = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=float('nan')
        )
        
        with pytest.raises(ImpactCalculationError, match="Invalid epoch value.*Must be a finite Julian date"):
            calculate_both_trajectories(elements_nan_epoch)
        
        # Test with invalid epoch (infinity)
        elements_inf_epoch = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=float('inf')
        )
        
        with pytest.raises(ImpactCalculationError, match="Invalid epoch value.*Must be a finite Julian date"):
            calculate_both_trajectories(elements_inf_epoch)
        
        # Test with epoch outside reasonable range (too old)
        elements_old_epoch = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2000000.0  # Too old (before 1900 AD)
        )
        
        with pytest.raises(ImpactCalculationError, match="Epoch.*is outside reasonable range"):
            calculate_both_trajectories(elements_old_epoch)
        
        # Test with epoch outside reasonable range (too new)
        elements_future_epoch = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2600000.0  # Too new (after 2100 AD)
        )
        
        with pytest.raises(ImpactCalculationError, match="Epoch.*is outside reasonable range"):
            calculate_both_trajectories(elements_future_epoch)
    
    def test_synchronization_failure_scenarios(self):
        """Test error handling for synchronization failures."""
        # Test with invalid orbital elements type
        with pytest.raises(ImpactCalculationError, match="Invalid orbital_elements type"):
            calculate_both_trajectories("invalid_elements")
        
        with pytest.raises(ImpactCalculationError, match="Invalid orbital_elements type"):
            calculate_both_trajectories(None)
        
        with pytest.raises(ImpactCalculationError, match="Invalid orbital_elements type"):
            calculate_both_trajectories({"not": "orbital_elements"})
        
        # Test with invalid num_points
        valid_elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        with pytest.raises(ImpactCalculationError, match="Invalid num_points"):
            calculate_both_trajectories(valid_elements, num_points=0)
        
        with pytest.raises(ImpactCalculationError, match="Invalid num_points"):
            calculate_both_trajectories(valid_elements, num_points=-10)
        
        with pytest.raises(ImpactCalculationError, match="Invalid num_points"):
            calculate_both_trajectories(valid_elements, num_points="invalid")
    
    def test_earth_trajectory_with_custom_times(self):
        """Test Earth trajectory calculation with custom time arrays."""
        # Create custom time array
        epoch_time = Time(2461000.5, format='jd')
        end_time = epoch_time + 1 * u.year
        custom_times = create_time_range(epoch_time, end_time, 15)
        
        # Test Earth trajectory with custom times
        earth_trajectory = get_earth_trajectory(custom_times)
        
        # Verify trajectory properties
        assert len(earth_trajectory) == 15
        assert all(isinstance(coord, list) for coord in earth_trajectory)
        assert all(len(coord) == 3 for coord in earth_trajectory)
        assert all(all(isinstance(x, float) for x in coord) for coord in earth_trajectory)
        assert all(all(math.isfinite(x) for x in coord) for coord in earth_trajectory)
        
        # Verify Earth's orbit is approximately 1 AU from Sun
        for coord in earth_trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            assert distance == pytest.approx(1.0, abs=0.3)  # Allow variation for elliptical orbit
    
    def test_asteroid_trajectory_with_custom_times(self):
        """Test asteroid trajectory calculation with custom time arrays."""
        elements = OrbitalElements(
            semi_major_axis=1.5,
            eccentricity=0.2,
            inclination=10.0,
            longitude_ascending_node=150.0,
            argument_periapsis=250.0,
            mean_anomaly=100.0,
            epoch=2461000.5
        )
        
        # Create custom time array
        epoch_time = Time(elements.epoch, format='jd')
        end_time = epoch_time + 180 * u.day  # Approximately 6 months
        custom_times = create_time_range(epoch_time, end_time, 25)
        
        # Test asteroid trajectory with custom times
        asteroid_trajectory = calculate_trajectory(elements, times=custom_times)
        
        # Verify trajectory properties
        assert len(asteroid_trajectory) == 25
        assert all(isinstance(coord, list) for coord in asteroid_trajectory)
        assert all(len(coord) == 3 for coord in asteroid_trajectory)
        assert all(all(isinstance(x, float) for x in coord) for coord in asteroid_trajectory)
        assert all(all(math.isfinite(x) for x in coord) for coord in asteroid_trajectory)
        
        # Verify asteroid positions are within reasonable bounds
        for coord in asteroid_trajectory:
            distance = math.sqrt(sum(x**2 for x in coord))
            assert distance < 5.0  # Should be within 5 AU of Sun
    
    def test_time_synchronization_consistency(self):
        """Test that synchronized trajectories maintain time consistency."""
        elements = OrbitalElements(
            semi_major_axis=1.2,
            eccentricity=0.15,
            inclination=8.0,
            longitude_ascending_node=120.0,
            argument_periapsis=240.0,
            mean_anomaly=60.0,
            epoch=2461000.5
        )
        
        # Calculate synchronized trajectories multiple times
        results = []
        for _ in range(3):
            result = calculate_both_trajectories(elements, num_points=20)
            results.append(result)
        
        # Verify all results have consistent structure
        for result in results:
            assert len(result["asteroid_path"]) == 20
            assert len(result["earth_path"]) == 20
            assert len(result["asteroid_path"]) == len(result["earth_path"])
        
        # Verify trajectories are deterministic (same inputs produce same outputs)
        for i in range(1, len(results)):
            for j in range(20):
                # Asteroid trajectories should be identical
                for k in range(3):
                    assert results[0]["asteroid_path"][j][k] == pytest.approx(
                        results[i]["asteroid_path"][j][k], abs=1e-10
                    )
                
                # Earth trajectories should be identical
                for k in range(3):
                    assert results[0]["earth_path"][j][k] == pytest.approx(
                        results[i]["earth_path"][j][k], abs=1e-10
                    )
    
    def test_empty_times_array_error_handling(self):
        """Test error handling for empty times arrays."""
        # Test get_earth_trajectory with empty times
        with pytest.raises(ImpactCalculationError, match="Empty times array provided"):
            get_earth_trajectory([])
        
        # Test calculate_trajectory with empty times
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        with pytest.raises(OrbitalCalculationError, match="Provided times array is empty"):
            calculate_trajectory(elements, times=[])
    
    def test_invalid_times_array_error_handling(self):
        """Test error handling for invalid times arrays."""
        # Test get_earth_trajectory with invalid times array type
        with pytest.raises(ImpactCalculationError, match="Invalid times type"):
            get_earth_trajectory("not_a_list")
        
        with pytest.raises(ImpactCalculationError, match="Empty times array provided"):
            get_earth_trajectory(None)
        
        # Test get_earth_trajectory with invalid time objects in array
        with pytest.raises(ImpactCalculationError, match="Invalid time object"):
            get_earth_trajectory(["not_a_time", "also_not_a_time"])
        
        with pytest.raises(ImpactCalculationError, match="Invalid time object"):
            get_earth_trajectory([Time.now(), "invalid_time", Time.now()])
    
    def test_trajectory_coordinate_validation(self):
        """Test validation of trajectory coordinate outputs."""
        elements = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2461000.5
        )
        
        result = calculate_both_trajectories(elements, num_points=10)
        
        # Validate asteroid trajectory coordinates
        for i, coord in enumerate(result["asteroid_path"]):
            assert isinstance(coord, list), f"Asteroid coordinate {i} is not a list: {type(coord)}"
            assert len(coord) == 3, f"Asteroid coordinate {i} does not have 3 elements: {len(coord)}"
            
            for j, value in enumerate(coord):
                assert isinstance(value, float), f"Asteroid coordinate {i}[{j}] is not float: {type(value)}"
                assert math.isfinite(value), f"Asteroid coordinate {i}[{j}] is not finite: {value}"
        
        # Validate Earth trajectory coordinates
        for i, coord in enumerate(result["earth_path"]):
            assert isinstance(coord, list), f"Earth coordinate {i} is not a list: {type(coord)}"
            assert len(coord) == 3, f"Earth coordinate {i} does not have 3 elements: {len(coord)}"
            
            for j, value in enumerate(coord):
                assert isinstance(value, float), f"Earth coordinate {i}[{j}] is not float: {type(value)}"
                assert math.isfinite(value), f"Earth coordinate {i}[{j}] is not finite: {value}"
    
    def test_epoch_time_validation_edge_cases(self):
        """Test epoch time validation with edge cases."""
        # Test with epoch at boundary of reasonable range (1900 AD)
        elements_1900 = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2415020.5  # January 1, 1900
        )
        
        # Should succeed
        result = calculate_both_trajectories(elements_1900, num_points=5)
        assert len(result["asteroid_path"]) == 5
        assert len(result["earth_path"]) == 5
        
        # Test with epoch at boundary of reasonable range (2100 AD)
        elements_2100 = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2488070.5  # January 1, 2100
        )
        
        # Should succeed
        result = calculate_both_trajectories(elements_2100, num_points=5)
        assert len(result["asteroid_path"]) == 5
        assert len(result["earth_path"]) == 5
        
        # Test with epoch just outside reasonable range (before 1900)
        elements_too_old = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2415020.4  # Just before 1900
        )
        
        with pytest.raises(ImpactCalculationError, match="Epoch.*is outside reasonable range"):
            calculate_both_trajectories(elements_too_old)
        
        # Test with epoch just outside reasonable range (after 2100)
        elements_too_new = OrbitalElements(
            semi_major_axis=1.0,
            eccentricity=0.1,
            inclination=5.0,
            longitude_ascending_node=100.0,
            argument_periapsis=200.0,
            mean_anomaly=300.0,
            epoch=2488070.6  # Just after 2100
        )
        
        with pytest.raises(ImpactCalculationError, match="Epoch.*is outside reasonable range"):
            calculate_both_trajectories(elements_too_new)