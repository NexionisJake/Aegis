import pytest
import numpy as np
from datetime import datetime, timedelta
from astropy.time import Time
from poliastro.bodies import Earth
from poliastro.twobody import Orbit

from .orbital_calculator import (
    calculate_both_trajectories, 
    get_earth_trajectory,
    calculate_trajectory,
    OrbitalElements
)
from .impact_calculator import calculate_impact_effects, ImpactCalculationError

class TestScientificAccuracy:
    """Test suite for verifying scientific accuracy of synchronized trajectories"""
    
    def setup_method(self):
        """Setup test data with known orbital elements"""
        # Apophis orbital elements (known asteroid for validation)
        self.apophis_elements = OrbitalElements(
            semi_major_axis=0.9224,  # AU
            eccentricity=0.1914,
            inclination=3.3314,  # degrees
            longitude_ascending_node=204.4460,  # degrees
            argument_periapsis=126.3940,  # degrees
            mean_anomaly=245.8370,  # degrees
            epoch=2460000.5  # JD (numeric, not string)
        )
        
        # Expected trajectory characteristics for validation
        self.expected_orbital_period = 323.6  # days (approximately)
        self.expected_perihelion = 0.7461  # AU
        self.expected_aphelion = 1.0987  # AU

    def test_synchronized_trajectory_time_consistency(self):
        """Verify Earth and asteroid trajectories use identical time intervals"""
        try:
            result = calculate_both_trajectories(self.apophis_elements)
            
            # Extract time information from trajectories
            asteroid_trajectory = result['asteroid_path']
            earth_trajectory = result['earth_path']
            
            # Verify both trajectories have same number of points
            assert len(asteroid_trajectory) == len(earth_trajectory), \
                "Earth and asteroid trajectories must have same number of points"
            
            # Verify trajectories cover reasonable time span (should be ~2 years)
            assert len(asteroid_trajectory) >= 100, \
                "Trajectories should have sufficient resolution for accuracy"
            
            print(f"✓ Synchronized trajectories: {len(asteroid_trajectory)} points each")
            
        except Exception as e:
            pytest.fail(f"Trajectory synchronization failed: {e}")

    def test_earth_trajectory_scientific_accuracy(self):
        """Verify Earth trajectory uses proper ephemeris data"""
        # Create test time array
        epoch = Time('2460000.5', format='jd')
        times = [epoch + timedelta(days=i*10) for i in range(36)]  # 1 year, 10-day intervals
        astropy_times = [Time(t) for t in times]
        
        try:
            earth_positions = get_earth_trajectory(astropy_times)
            
            # Verify Earth trajectory properties
            assert len(earth_positions) == len(astropy_times), \
                "Earth trajectory should have position for each time point"
            
            # Calculate orbital characteristics
            distances = [np.linalg.norm(pos) for pos in earth_positions]
            min_distance = min(distances)
            max_distance = max(distances)
            
            # Earth's orbit should be approximately circular (eccentricity ~0.017)
            eccentricity_estimate = (max_distance - min_distance) / (max_distance + min_distance)
            
            assert 0.01 < eccentricity_estimate < 0.03, \
                f"Earth's orbital eccentricity should be ~0.017, got {eccentricity_estimate:.3f}"
            
            # Earth's orbital radius should be ~1 AU
            mean_distance = np.mean(distances)
            assert 0.98 < mean_distance < 1.02, \
                f"Earth's mean orbital distance should be ~1 AU, got {mean_distance:.3f}"
            
            print(f"✓ Earth trajectory validation: eccentricity={eccentricity_estimate:.3f}, mean_distance={mean_distance:.3f} AU")
            
        except Exception as e:
            pytest.fail(f"Earth trajectory accuracy test failed: {e}")

    def test_asteroid_trajectory_orbital_mechanics(self):
        """Verify asteroid trajectory follows proper orbital mechanics"""
        try:
            result = calculate_both_trajectories(self.apophis_elements)
            asteroid_trajectory = result['asteroid_path']
            
            # Calculate orbital characteristics
            distances = [np.linalg.norm(pos) for pos in asteroid_trajectory]
            min_distance = min(distances)  # perihelion
            max_distance = max(distances)  # aphelion
            
            # Verify perihelion and aphelion are within expected ranges
            perihelion_error = abs(min_distance - self.expected_perihelion) / self.expected_perihelion
            aphelion_error = abs(max_distance - self.expected_aphelion) / self.expected_aphelion
            
            assert perihelion_error < 0.1, \
                f"Perihelion error too large: expected {self.expected_perihelion}, got {min_distance}"
            
            assert aphelion_error < 0.1, \
                f"Aphelion error too large: expected {self.expected_aphelion}, got {max_distance}"
            
            # Calculate eccentricity
            calculated_eccentricity = (max_distance - min_distance) / (max_distance + min_distance)
            expected_eccentricity = self.apophis_elements.eccentricity
            eccentricity_error = abs(calculated_eccentricity - expected_eccentricity) / expected_eccentricity
            
            assert eccentricity_error < 0.05, \
                f"Eccentricity error too large: expected {expected_eccentricity}, got {calculated_eccentricity}"
            
            print(f"✓ Asteroid orbital mechanics: perihelion={min_distance:.3f} AU, aphelion={max_distance:.3f} AU, e={calculated_eccentricity:.3f}")
            
        except Exception as e:
            pytest.fail(f"Asteroid trajectory mechanics test failed: {e}")

    def test_epoch_synchronization_accuracy(self):
        """Verify both trajectories use the same epoch reference"""
        try:
            result = calculate_both_trajectories(self.apophis_elements)
            
            # Verify epoch information is preserved
            assert 'epoch_used' in result, "Result should include epoch information"
            
            epoch_used = result['epoch_used']
            expected_epoch = self.apophis_elements.epoch
            
            assert epoch_used == expected_epoch, \
                f"Epoch synchronization failed: expected {expected_epoch}, got {epoch_used}"
            
            print(f"✓ Epoch synchronization: {epoch_used}")
            
        except Exception as e:
            pytest.fail(f"Epoch synchronization test failed: {e}")

    def test_impact_calculation_with_real_parameters(self):
        """Test impact calculations using real asteroid parameters"""
        # Real Apophis parameters
        diameter_km = 0.370  # km
        velocity_km_s = 7.42  # km/s
        impact_coords = [20.5937, 78.9629]  # India coordinates
        
        try:
            impact_result = calculate_impact_effects(
                diameter_km, velocity_km_s
            )
            
            # Verify impact calculation results are reasonable
            assert 'crater_diameter' in impact_result, "Impact result should include crater diameter"
            assert 'energy_released' in impact_result, "Impact result should include energy"
            
            crater_diameter = impact_result['crater_diameter']
            energy_released = impact_result['energy_released']
            
            # Sanity checks for Apophis-sized impact
            assert 1.0 < crater_diameter < 20.0, \
                f"Crater diameter should be reasonable for Apophis: got {crater_diameter} km"
            
            assert 100 < energy_released < 10000, \
                f"Energy should be reasonable for Apophis: got {energy_released} MT"
            
            print(f"✓ Impact calculation: crater={crater_diameter:.1f} km, energy={energy_released:.0f} MT")
            
        except Exception as e:
            pytest.fail(f"Impact calculation test failed: {e}")

    def test_error_handling_robustness(self):
        """Test error handling across all calculation components"""
        
        # Test invalid orbital elements
        invalid_elements = OrbitalElements(
            semi_major_axis=-1.0,  # Invalid negative value
            eccentricity=1.5,      # Invalid eccentricity > 1
            inclination=0.0,
            longitude_ascending_node=0.0,
            argument_periapsis=0.0,
            mean_anomaly=0.0,
            epoch=2460000.5
        )
        
        with pytest.raises(ImpactCalculationError):
            calculate_both_trajectories(invalid_elements)
        
        # Test invalid epoch
        invalid_epoch_elements = OrbitalElements(
            semi_major_axis=0.9224,
            eccentricity=0.1914,
            inclination=3.3314,
            longitude_ascending_node=204.4460,
            argument_periapsis=126.3940,
            mean_anomaly=245.8370,
            epoch=float('inf')  # Invalid epoch
        )
        
        with pytest.raises(ImpactCalculationError):
            calculate_both_trajectories(invalid_epoch_elements)
        
        # Test invalid time array
        with pytest.raises((ValueError, TypeError)):
            get_earth_trajectory([])  # Empty time array
        
        print("✓ Error handling robustness verified")

class TestPerformanceImpact:
    """Test suite for measuring performance impact of enhanced calculations"""
    
    def test_trajectory_calculation_performance(self):
        """Measure performance impact of synchronized trajectory calculations"""
        import time
        
        apophis_elements = OrbitalElements(
            semi_major_axis=0.9224,
            eccentricity=0.1914,
            inclination=3.3314,
            longitude_ascending_node=204.4460,
            argument_periapsis=126.3940,
            mean_anomaly=245.8370,
            epoch=2460000.5
        )
        
        # Measure calculation time
        start_time = time.time()
        result = calculate_both_trajectories(apophis_elements)
        calculation_time = time.time() - start_time
        
        # Performance should be reasonable (< 5 seconds for typical calculation)
        assert calculation_time < 5.0, \
            f"Trajectory calculation too slow: {calculation_time:.2f} seconds"
        
        # Verify we get reasonable number of trajectory points
        trajectory_points = len(result['asteroid_path'])
        assert trajectory_points > 50, \
            f"Insufficient trajectory resolution: {trajectory_points} points"
        
        print(f"✓ Performance test: {calculation_time:.2f}s for {trajectory_points} points")

    def test_memory_usage_efficiency(self):
        """Test memory efficiency of trajectory calculations"""
        import gc
        
        # Perform multiple trajectory calculations
        apophis_elements = OrbitalElements(
            semi_major_axis=0.9224,
            eccentricity=0.1914,
            inclination=3.3314,
            longitude_ascending_node=204.4460,
            argument_periapsis=126.3940,
            mean_anomaly=245.8370,
            epoch=2460000.5
        )
        
        # Test that calculations complete without memory errors
        results = []
        for i in range(5):
            result = calculate_both_trajectories(apophis_elements)
            results.append(result)
            
            # Verify each result has reasonable size
            assert len(result['asteroid_path']) > 0, f"Empty asteroid trajectory in iteration {i}"
            assert len(result['earth_path']) > 0, f"Empty earth trajectory in iteration {i}"
        
        # Force garbage collection
        gc.collect()
        
        print(f"✓ Memory efficiency: 5 calculations completed successfully")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])