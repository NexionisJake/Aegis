import pytest
import time
import psutil
import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from astropy.time import Time

from orbital_calculator import (
    calculate_both_trajectories,
    get_earth_trajectory,
    calculate_trajectory
)
from impact_calculator import calculate_impact_effects

class TestPerformanceBenchmarks:
    """Performance benchmarks for enhanced simulation features"""
    
    def setup_method(self):
        """Setup test data and performance monitoring"""
        self.apophis_elements = {
            'semi_major_axis': 0.9224,
            'eccentricity': 0.1914,
            'inclination': 3.3314,
            'longitude_of_ascending_node': 204.4460,
            'argument_of_periapsis': 126.3940,
            'mean_anomaly': 245.8370,
            'epoch': '2460000.5'
        }
        
        self.process = psutil.Process(os.getpid())
        self.baseline_memory = self.process.memory_info().rss / 1024 / 1024  # MB

    def test_synchronized_trajectory_performance(self):
        """Benchmark synchronized trajectory calculation performance"""
        print("\n=== Synchronized Trajectory Performance Test ===")
        
        # Warm-up run
        calculate_both_trajectories(self.apophis_elements)
        
        # Benchmark multiple runs
        times = []
        memory_usage = []
        
        for i in range(5):
            start_time = time.perf_counter()
            start_memory = self.process.memory_info().rss / 1024 / 1024
            
            result = calculate_both_trajectories(self.apophis_elements)
            
            end_time = time.perf_counter()
            end_memory = self.process.memory_info().rss / 1024 / 1024
            
            calculation_time = end_time - start_time
            memory_delta = end_memory - start_memory
            
            times.append(calculation_time)
            memory_usage.append(memory_delta)
            
            print(f"Run {i+1}: {calculation_time:.3f}s, Memory: +{memory_delta:.1f}MB, Points: {len(result['asteroid_trajectory'])}")
        
        avg_time = np.mean(times)
        std_time = np.std(times)
        avg_memory = np.mean(memory_usage)
        
        print(f"Average time: {avg_time:.3f}±{std_time:.3f}s")
        print(f"Average memory: +{avg_memory:.1f}MB")
        
        # Performance assertions
        assert avg_time < 3.0, f"Synchronized trajectory calculation too slow: {avg_time:.3f}s"
        assert avg_memory < 50, f"Excessive memory usage: {avg_memory:.1f}MB"
        
        return {
            'avg_time': avg_time,
            'std_time': std_time,
            'avg_memory': avg_memory
        }

    def test_earth_trajectory_scaling(self):
        """Test Earth trajectory calculation with different time resolutions"""
        print("\n=== Earth Trajectory Scaling Test ===")
        
        epoch = Time('2460000.5', format='jd')
        
        # Test different resolutions
        resolutions = [50, 100, 200, 500, 1000]
        results = []
        
        for num_points in resolutions:
            times = [epoch + timedelta(days=i*2) for i in range(num_points)]
            astropy_times = [Time(t) for t in times]
            
            start_time = time.perf_counter()
            start_memory = self.process.memory_info().rss / 1024 / 1024
            
            earth_positions = get_earth_trajectory(astropy_times)
            
            end_time = time.perf_counter()
            end_memory = self.process.memory_info().rss / 1024 / 1024
            
            calculation_time = end_time - start_time
            memory_delta = end_memory - start_memory
            
            results.append({
                'points': num_points,
                'time': calculation_time,
                'memory': memory_delta,
                'time_per_point': calculation_time / num_points * 1000  # ms per point
            })
            
            print(f"{num_points} points: {calculation_time:.3f}s ({calculation_time/num_points*1000:.2f}ms/point), +{memory_delta:.1f}MB")
        
        # Check scaling characteristics
        for result in results:
            assert result['time_per_point'] < 10, f"Earth trajectory calculation too slow: {result['time_per_point']:.2f}ms per point"
        
        return results

    def test_concurrent_calculation_performance(self):
        """Test performance under concurrent calculation load"""
        print("\n=== Concurrent Calculation Performance Test ===")
        
        def calculate_trajectory_task(elements):
            """Task for concurrent execution"""
            return calculate_both_trajectories(elements)
        
        # Test with different numbers of concurrent calculations
        concurrent_levels = [1, 2, 4, 8]
        results = []
        
        for num_concurrent in concurrent_levels:
            start_time = time.perf_counter()
            start_memory = self.process.memory_info().rss / 1024 / 1024
            
            with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
                futures = [
                    executor.submit(calculate_trajectory_task, self.apophis_elements)
                    for _ in range(num_concurrent)
                ]
                
                # Wait for all calculations to complete
                trajectory_results = [future.result() for future in futures]
            
            end_time = time.perf_counter()
            end_memory = self.process.memory_info().rss / 1024 / 1024
            
            total_time = end_time - start_time
            memory_delta = end_memory - start_memory
            
            results.append({
                'concurrent': num_concurrent,
                'total_time': total_time,
                'avg_time_per_calc': total_time / num_concurrent,
                'memory_delta': memory_delta
            })
            
            print(f"{num_concurrent} concurrent: {total_time:.3f}s total, {total_time/num_concurrent:.3f}s avg, +{memory_delta:.1f}MB")
        
        # Verify concurrent performance doesn't degrade significantly
        single_time = results[0]['avg_time_per_calc']
        for result in results[1:]:
            degradation = result['avg_time_per_calc'] / single_time
            assert degradation < 2.0, f"Concurrent performance degradation too high: {degradation:.2f}x"
        
        return results

    def test_impact_calculation_performance(self):
        """Benchmark impact calculation with various parameters"""
        print("\n=== Impact Calculation Performance Test ===")
        
        # Test different asteroid sizes
        test_cases = [
            {'diameter': 0.1, 'velocity': 15.0, 'name': 'Small asteroid'},
            {'diameter': 0.37, 'velocity': 7.42, 'name': 'Apophis-size'},
            {'diameter': 1.0, 'velocity': 20.0, 'name': 'Large asteroid'},
            {'diameter': 10.0, 'velocity': 25.0, 'name': 'Very large asteroid'}
        ]
        
        impact_coords = [20.5937, 78.9629]  # India coordinates
        results = []
        
        for case in test_cases:
            times = []
            
            # Multiple runs for each case
            for _ in range(10):
                start_time = time.perf_counter()
                
                impact_result = calculate_impact_effects(
                    case['diameter'], 
                    case['velocity'], 
                    impact_coords
                )
                
                end_time = time.perf_counter()
                times.append(end_time - start_time)
            
            avg_time = np.mean(times)
            std_time = np.std(times)
            
            results.append({
                'name': case['name'],
                'diameter': case['diameter'],
                'avg_time': avg_time,
                'std_time': std_time
            })
            
            print(f"{case['name']}: {avg_time:.4f}±{std_time:.4f}s")
        
        # All impact calculations should be very fast
        for result in results:
            assert result['avg_time'] < 0.1, f"Impact calculation too slow for {result['name']}: {result['avg_time']:.4f}s"
        
        return results

    def test_memory_leak_detection(self):
        """Test for memory leaks in repeated calculations"""
        print("\n=== Memory Leak Detection Test ===")
        
        initial_memory = self.process.memory_info().rss / 1024 / 1024
        memory_samples = [initial_memory]
        
        # Perform many calculations
        for i in range(20):
            calculate_both_trajectories(self.apophis_elements)
            
            if i % 5 == 0:  # Sample memory every 5 iterations
                current_memory = self.process.memory_info().rss / 1024 / 1024
                memory_samples.append(current_memory)
                print(f"Iteration {i}: {current_memory:.1f}MB")
        
        final_memory = self.process.memory_info().rss / 1024 / 1024
        memory_samples.append(final_memory)
        
        # Check for memory leaks
        memory_growth = final_memory - initial_memory
        print(f"Total memory growth: {memory_growth:.1f}MB")
        
        # Memory growth should be reasonable (< 100MB for 20 calculations)
        assert memory_growth < 100, f"Possible memory leak detected: {memory_growth:.1f}MB growth"
        
        # Check that memory doesn't continuously increase
        memory_trend = np.polyfit(range(len(memory_samples)), memory_samples, 1)[0]
        print(f"Memory trend: {memory_trend:.2f}MB per sample")
        
        assert memory_trend < 5, f"Continuous memory growth detected: {memory_trend:.2f}MB per sample"
        
        return {
            'initial_memory': initial_memory,
            'final_memory': final_memory,
            'memory_growth': memory_growth,
            'memory_trend': memory_trend
        }

    def test_api_response_time_simulation(self):
        """Simulate API response times under load"""
        print("\n=== API Response Time Simulation ===")
        
        def simulate_api_call():
            """Simulate a complete API workflow"""
            # Simulate asteroid data fetch + trajectory calculation + impact calculation
            start_time = time.perf_counter()
            
            # Step 1: Trajectory calculation (most expensive)
            trajectory_result = calculate_both_trajectories(self.apophis_elements)
            
            # Step 2: Impact calculation
            impact_result = calculate_impact_effects(0.37, 7.42, [20.5937, 78.9629])
            
            end_time = time.perf_counter()
            return end_time - start_time
        
        # Test sequential API calls
        sequential_times = []
        for i in range(5):
            response_time = simulate_api_call()
            sequential_times.append(response_time)
            print(f"Sequential call {i+1}: {response_time:.3f}s")
        
        avg_sequential = np.mean(sequential_times)
        print(f"Average sequential response time: {avg_sequential:.3f}s")
        
        # Test concurrent API calls
        with ThreadPoolExecutor(max_workers=3) as executor:
            start_time = time.perf_counter()
            futures = [executor.submit(simulate_api_call) for _ in range(3)]
            concurrent_times = [future.result() for future in futures]
            total_concurrent_time = time.perf_counter() - start_time
        
        avg_concurrent = np.mean(concurrent_times)
        print(f"Concurrent calls (3): {total_concurrent_time:.3f}s total, {avg_concurrent:.3f}s avg")
        
        # API response times should be reasonable
        assert avg_sequential < 5.0, f"API response too slow: {avg_sequential:.3f}s"
        assert total_concurrent_time < 8.0, f"Concurrent API response too slow: {total_concurrent_time:.3f}s"
        
        return {
            'avg_sequential': avg_sequential,
            'avg_concurrent': avg_concurrent,
            'total_concurrent_time': total_concurrent_time
        }

if __name__ == "__main__":
    # Run performance benchmarks
    test_suite = TestPerformanceBenchmarks()
    test_suite.setup_method()
    
    print("Running Performance Benchmarks...")
    print("=" * 50)
    
    try:
        results = {}
        results['trajectory'] = test_suite.test_synchronized_trajectory_performance()
        results['scaling'] = test_suite.test_earth_trajectory_scaling()
        results['concurrent'] = test_suite.test_concurrent_calculation_performance()
        results['impact'] = test_suite.test_impact_calculation_performance()
        results['memory'] = test_suite.test_memory_leak_detection()
        results['api'] = test_suite.test_api_response_time_simulation()
        
        print("\n" + "=" * 50)
        print("PERFORMANCE BENCHMARK SUMMARY")
        print("=" * 50)
        print(f"Trajectory calculation: {results['trajectory']['avg_time']:.3f}s avg")
        print(f"Memory usage: {results['trajectory']['avg_memory']:.1f}MB avg")
        print(f"API response time: {results['api']['avg_sequential']:.3f}s avg")
        print(f"Memory leak test: {results['memory']['memory_growth']:.1f}MB growth")
        print("All performance benchmarks PASSED ✓")
        
    except Exception as e:
        print(f"Performance benchmark FAILED: {e}")
        raise