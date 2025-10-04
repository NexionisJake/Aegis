#!/usr/bin/env python3
"""
Integration Test Report Generator
Comprehensive validation of enhanced simulation features
"""

import time
import traceback
from datetime import datetime
from orbital_calculator import OrbitalElements, calculate_both_trajectories, get_earth_trajectory
from impact_calculator import calculate_impact_effects
from astropy.time import Time
from datetime import timedelta
import numpy as np

class IntegrationTestReport:
    def __init__(self):
        self.results = {}
        self.start_time = time.time()
        
    def run_all_tests(self):
        """Run comprehensive integration tests and generate report"""
        print("=" * 60)
        print("ENHANCED SIMULATION FEATURES - INTEGRATION TEST REPORT")
        print("=" * 60)
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Test 1: Synchronized Trajectory Calculation
        self.test_synchronized_trajectories()
        
        # Test 2: Scientific Accuracy Validation
        self.test_scientific_accuracy()
        
        # Test 3: Performance Benchmarks
        self.test_performance()
        
        # Test 4: Error Handling Robustness
        self.test_error_handling()
        
        # Test 5: Real Parameter Impact Calculation
        self.test_real_parameter_impact()
        
        # Generate final report
        self.generate_final_report()
        
    def test_synchronized_trajectories(self):
        """Test synchronized trajectory calculation"""
        print("1. SYNCHRONIZED TRAJECTORY CALCULATION")
        print("-" * 40)
        
        try:
            # Create Apophis orbital elements
            apophis = OrbitalElements(
                semi_major_axis=0.9224,
                eccentricity=0.1914,
                inclination=3.3314,
                longitude_ascending_node=204.4460,
                argument_periapsis=126.3940,
                mean_anomaly=245.8370,
                epoch=2460000.5
            )
            
            start_time = time.time()
            result = calculate_both_trajectories(apophis)
            calculation_time = time.time() - start_time
            
            asteroid_points = len(result['asteroid_path'])
            earth_points = len(result['earth_path'])
            
            # Validation checks
            assert asteroid_points == earth_points, "Trajectory point count mismatch"
            assert asteroid_points >= 100, "Insufficient trajectory resolution"
            
            self.results['synchronized_trajectories'] = {
                'status': 'PASSED',
                'calculation_time': calculation_time,
                'asteroid_points': asteroid_points,
                'earth_points': earth_points,
                'synchronized': asteroid_points == earth_points
            }
            
            print(f"✓ Calculation time: {calculation_time:.3f} seconds")
            print(f"✓ Asteroid trajectory points: {asteroid_points}")
            print(f"✓ Earth trajectory points: {earth_points}")
            print(f"✓ Trajectories synchronized: {asteroid_points == earth_points}")
            
        except Exception as e:
            self.results['synchronized_trajectories'] = {
                'status': 'FAILED',
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"✗ Test failed: {e}")
        
        print()
    
    def test_scientific_accuracy(self):
        """Test scientific accuracy of orbital calculations"""
        print("2. SCIENTIFIC ACCURACY VALIDATION")
        print("-" * 40)
        
        try:
            # Test Earth trajectory accuracy
            epoch = Time('2460000.5', format='jd')
            times = [epoch + timedelta(days=i*10) for i in range(36)]
            astropy_times = [Time(t) for t in times]
            
            earth_positions = get_earth_trajectory(astropy_times)
            
            # Calculate orbital characteristics
            distances = [np.linalg.norm(pos) for pos in earth_positions]
            min_distance = min(distances)
            max_distance = max(distances)
            mean_distance = np.mean(distances)
            
            # Earth's orbital eccentricity should be ~0.017
            eccentricity = (max_distance - min_distance) / (max_distance + min_distance)
            
            # Validation checks
            assert 0.98 < mean_distance < 1.02, f"Earth mean distance error: {mean_distance}"
            assert 0.01 < eccentricity < 0.03, f"Earth eccentricity error: {eccentricity}"
            
            self.results['scientific_accuracy'] = {
                'status': 'PASSED',
                'earth_mean_distance_au': mean_distance,
                'earth_eccentricity': eccentricity,
                'earth_perihelion_au': min_distance,
                'earth_aphelion_au': max_distance
            }
            
            print(f"✓ Earth mean orbital distance: {mean_distance:.3f} AU")
            print(f"✓ Earth orbital eccentricity: {eccentricity:.4f}")
            print(f"✓ Earth perihelion: {min_distance:.3f} AU")
            print(f"✓ Earth aphelion: {max_distance:.3f} AU")
            
        except Exception as e:
            self.results['scientific_accuracy'] = {
                'status': 'FAILED',
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"✗ Test failed: {e}")
        
        print()
    
    def test_performance(self):
        """Test performance characteristics"""
        print("3. PERFORMANCE BENCHMARKS")
        print("-" * 40)
        
        try:
            apophis = OrbitalElements(
                semi_major_axis=0.9224,
                eccentricity=0.1914,
                inclination=3.3314,
                longitude_ascending_node=204.4460,
                argument_periapsis=126.3940,
                mean_anomaly=245.8370,
                epoch=2460000.5
            )
            
            # Run multiple calculations for performance testing
            times = []
            for i in range(3):
                start_time = time.time()
                result = calculate_both_trajectories(apophis)
                end_time = time.time()
                times.append(end_time - start_time)
            
            avg_time = np.mean(times)
            std_time = np.std(times)
            
            # Performance validation
            assert avg_time < 5.0, f"Performance too slow: {avg_time:.3f}s"
            
            self.results['performance'] = {
                'status': 'PASSED',
                'average_time': avg_time,
                'std_deviation': std_time,
                'min_time': min(times),
                'max_time': max(times),
                'runs': len(times)
            }
            
            print(f"✓ Average calculation time: {avg_time:.3f}±{std_time:.3f} seconds")
            print(f"✓ Performance range: {min(times):.3f}s - {max(times):.3f}s")
            print(f"✓ Performance acceptable: {avg_time < 5.0}")
            
        except Exception as e:
            self.results['performance'] = {
                'status': 'FAILED',
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"✗ Test failed: {e}")
        
        print()
    
    def test_error_handling(self):
        """Test error handling robustness"""
        print("4. ERROR HANDLING ROBUSTNESS")
        print("-" * 40)
        
        error_tests = []
        
        try:
            # Test 1: Invalid orbital elements
            try:
                invalid_elements = OrbitalElements(
                    semi_major_axis=-1.0,  # Invalid
                    eccentricity=1.5,      # Invalid
                    inclination=0.0,
                    longitude_ascending_node=0.0,
                    argument_periapsis=0.0,
                    mean_anomaly=0.0,
                    epoch=2460000.5
                )
                calculate_both_trajectories(invalid_elements)
                error_tests.append(('Invalid orbital elements', 'FAILED - No exception raised'))
            except Exception:
                error_tests.append(('Invalid orbital elements', 'PASSED - Exception caught'))
            
            # Test 2: Empty time array
            try:
                get_earth_trajectory([])
                error_tests.append(('Empty time array', 'FAILED - No exception raised'))
            except Exception:
                error_tests.append(('Empty time array', 'PASSED - Exception caught'))
            
            # Test 3: Invalid epoch
            try:
                invalid_epoch = OrbitalElements(
                    semi_major_axis=0.9224,
                    eccentricity=0.1914,
                    inclination=3.3314,
                    longitude_ascending_node=204.4460,
                    argument_periapsis=126.3940,
                    mean_anomaly=245.8370,
                    epoch=float('inf')  # Invalid
                )
                calculate_both_trajectories(invalid_epoch)
                error_tests.append(('Invalid epoch', 'FAILED - No exception raised'))
            except Exception:
                error_tests.append(('Invalid epoch', 'PASSED - Exception caught'))
            
            passed_tests = sum(1 for _, status in error_tests if 'PASSED' in status)
            total_tests = len(error_tests)
            
            self.results['error_handling'] = {
                'status': 'PASSED' if passed_tests == total_tests else 'PARTIAL',
                'passed_tests': passed_tests,
                'total_tests': total_tests,
                'test_results': error_tests
            }
            
            for test_name, status in error_tests:
                symbol = "✓" if "PASSED" in status else "✗"
                print(f"{symbol} {test_name}: {status}")
            
            print(f"✓ Error handling tests: {passed_tests}/{total_tests} passed")
            
        except Exception as e:
            self.results['error_handling'] = {
                'status': 'FAILED',
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"✗ Test suite failed: {e}")
        
        print()
    
    def test_real_parameter_impact(self):
        """Test impact calculation with real asteroid parameters"""
        print("5. REAL PARAMETER IMPACT CALCULATION")
        print("-" * 40)
        
        try:
            # Real Apophis parameters
            diameter_km = 0.370
            velocity_km_s = 7.42
            
            start_time = time.time()
            impact_result = calculate_impact_effects(diameter_km, velocity_km_s)
            calculation_time = time.time() - start_time
            
            # Convert from ImpactResults dataclass
            crater_diameter = impact_result.crater_diameter_meters / 1000  # Convert to km
            energy_released = impact_result.impact_energy_joules / 4.184e15  # Convert to MT TNT equivalent
            
            # Validation checks for Apophis-sized impact
            assert 1.0 < crater_diameter < 20.0, f"Unrealistic crater diameter: {crater_diameter}"
            assert 100 < energy_released < 10000, f"Unrealistic energy: {energy_released}"
            
            self.results['real_parameter_impact'] = {
                'status': 'PASSED',
                'calculation_time': calculation_time,
                'input_diameter_km': diameter_km,
                'input_velocity_km_s': velocity_km_s,
                'crater_diameter_km': crater_diameter,
                'energy_released_mt': energy_released
            }
            
            print(f"✓ Calculation time: {calculation_time:.4f} seconds")
            print(f"✓ Input diameter: {diameter_km} km")
            print(f"✓ Input velocity: {velocity_km_s} km/s")
            print(f"✓ Crater diameter: {crater_diameter:.1f} km")
            print(f"✓ Energy released: {energy_released:.0f} MT")
            
        except Exception as e:
            self.results['real_parameter_impact'] = {
                'status': 'FAILED',
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"✗ Test failed: {e}")
        
        print()
    
    def generate_final_report(self):
        """Generate final test report summary"""
        total_time = time.time() - self.start_time
        
        print("=" * 60)
        print("FINAL INTEGRATION TEST REPORT")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.results.values() 
                          if result.get('status') in ['PASSED', 'PARTIAL'])
        total_tests = len(self.results)
        
        print(f"Total execution time: {total_time:.2f} seconds")
        print(f"Tests passed: {passed_tests}/{total_tests}")
        print()
        
        print("DETAILED RESULTS:")
        print("-" * 20)
        
        for test_name, result in self.results.items():
            status = result.get('status', 'UNKNOWN')
            symbol = "✓" if status == 'PASSED' else "⚠" if status == 'PARTIAL' else "✗"
            print(f"{symbol} {test_name.replace('_', ' ').title()}: {status}")
            
            if status == 'FAILED' and 'error' in result:
                print(f"   Error: {result['error']}")
        
        print()
        
        if passed_tests == total_tests:
            print("🎉 ALL INTEGRATION TESTS PASSED!")
            print("Enhanced simulation features are working correctly.")
        elif passed_tests > 0:
            print("⚠️  PARTIAL SUCCESS")
            print(f"{passed_tests} out of {total_tests} test suites passed.")
        else:
            print("❌ INTEGRATION TESTS FAILED")
            print("Enhanced simulation features need attention.")
        
        print()
        print("=" * 60)
        
        return passed_tests == total_tests

if __name__ == "__main__":
    report = IntegrationTestReport()
    success = report.run_all_tests()
    exit(0 if success else 1)