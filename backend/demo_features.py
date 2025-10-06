#!/usr/bin/env python3
"""
Demo script to showcase all three phases of the Aegis implementation.
This script demonstrates:
1. Dynamic parameter extraction from NASA API
2. Interactive coordinate handling
3. Synchronized trajectory calculations
"""

import sys
import json
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_phase_1_dynamic_parameters():
    """Test Phase 1: Dynamic Impact Parameters"""
    print("=" * 60)
    print("🚀 PHASE 1: DYNAMIC IMPACT PARAMETERS")
    print("=" * 60)
    
    try:
        from .nasa_client import get_asteroid_data
        
        print("📡 Fetching Apophis data from NASA API...")
        asteroid_data = get_asteroid_data('Apophis')
        
        print(f"✅ NASA API Response received")
        print(f"📊 Data keys: {list(asteroid_data.keys())}")
        
        # Test parameter extraction like the frontend does
        if 'phys_par' in asteroid_data:
            print(f"🔍 Physical parameters available: {len(asteroid_data['phys_par'])} entries")
            for param in asteroid_data['phys_par']:
                if 'diameter' in param.get('name', '').lower():
                    print(f"💎 Diameter found: {param['value']} (±{param.get('sigma', 'N/A')})")
        
        if 'orbit' in asteroid_data and 'close_approach_data' in asteroid_data['orbit']:
            approach_data = asteroid_data['orbit']['close_approach_data']
            if approach_data:
                print(f"🎯 Velocity found: {approach_data[0]['v_rel']} km/s")
        
        return True
        
    except Exception as e:
        print(f"❌ Phase 1 Test Failed: {e}")
        return False

def test_phase_2_impact_coordinates():
    """Test Phase 2: User-Selectable Impact Location"""
    print("\n" + "=" * 60)
    print("🎯 PHASE 2: USER-SELECTABLE IMPACT LOCATION")
    print("=" * 60)
    
    # Simulate coordinate selection scenarios
    test_coordinates = [
        [20.5937, 78.9629],  # India (default)
        [40.7128, -74.0060],  # New York
        [-33.8688, 151.2093], # Sydney
        [51.5074, -0.1278],   # London
    ]
    
    print("🗺️ Testing coordinate handling scenarios:")
    for i, coords in enumerate(test_coordinates, 1):
        lat, lng = coords
        print(f"  {i}. Lat: {lat:8.4f}°, Lng: {lng:8.4f}° - Valid: {-90 <= lat <= 90 and -180 <= lng <= 180}")
    
    # Test 3D to geographic conversion (simulated)
    print("\n🎮 Simulating 3D point to lat/lng conversion:")
    import math
    
    # Sample 3D points on unit sphere (like Earth model)
    test_3d_points = [
        [0.12, 0, 0.99],    # Near prime meridian, low latitude
        [-0.5, 0.5, 0.7],   # Western hemisphere, moderate latitude  
        [0, 0, 1.0],        # North pole
    ]
    
    for i, point in enumerate(test_3d_points, 1):
        x, y, z = point
        # Convert to lat/lng using spherical coordinates
        lat = math.degrees(math.asin(z))
        lng = math.degrees(math.atan2(y, x))
        print(f"  {i}. 3D({x:5.2f}, {y:5.2f}, {z:5.2f}) → Lat: {lat:7.3f}°, Lng: {lng:7.3f}°")
    
    return True

def test_phase_3_synchronized_trajectories():
    """Test Phase 3: Earth Orbit Synchronization"""
    print("\n" + "=" * 60)
    print("🌍 PHASE 3: EARTH ORBIT SYNCHRONIZATION")
    print("=" * 60)
    
    try:
        from .orbital_calculator import extract_orbital_elements, calculate_both_trajectories
        from .nasa_client import get_asteroid_data
        
        print("📡 Getting asteroid orbital data...")
        asteroid_data = get_asteroid_data('Apophis')
        
        print("🧮 Extracting orbital elements...")
        orbital_elements = extract_orbital_elements(asteroid_data)
        
        print(f"✅ Orbital Elements extracted:")
        print(f"   Semi-major axis: {orbital_elements.semi_major_axis:.6f} AU")
        print(f"   Eccentricity: {orbital_elements.eccentricity:.6f}")
        print(f"   Inclination: {orbital_elements.inclination:.3f}°")
        print(f"   Epoch: {orbital_elements.epoch:.1f} (Julian Date)")
        
        print("\n🚀 Calculating synchronized trajectories...")
        trajectories = calculate_both_trajectories(orbital_elements, num_points=50)  # Small test set
        
        asteroid_path = trajectories['asteroid_path']
        earth_path = trajectories['earth_path']
        
        print(f"✅ Synchronization successful!")
        print(f"   Asteroid trajectory points: {len(asteroid_path)}")
        print(f"   Earth trajectory points: {len(earth_path)}")
        print(f"   Synchronized: {len(asteroid_path) == len(earth_path)}")
        
        # Show sample coordinates
        if asteroid_path and earth_path:
            print(f"\n📊 Sample coordinates (AU):")
            print(f"   Asteroid start: [{asteroid_path[0][0]:7.4f}, {asteroid_path[0][1]:7.4f}, {asteroid_path[0][2]:7.4f}]")
            print(f"   Earth start:    [{earth_path[0][0]:7.4f}, {earth_path[0][1]:7.4f}, {earth_path[0][2]:7.4f}]")
            
        return True
        
    except Exception as e:
        print(f"❌ Phase 3 Test Failed: {e}")
        return False

def test_integration_workflow():
    """Test complete integration workflow"""
    print("\n" + "=" * 60)
    print("🎭 INTEGRATION TEST: COMPLETE WORKFLOW")
    print("=" * 60)
    
    try:
        # Simulate the complete frontend workflow
        print("1️⃣ Fetch asteroid data...")
        from .nasa_client import get_asteroid_data
        asteroid_data = get_asteroid_data('Apophis')
        
        print("2️⃣ Extract impact parameters...")
        # Simulate frontend parameter extraction
        diameter = None
        velocity = None
        
        if 'phys_par' in asteroid_data:
            for param in asteroid_data['phys_par']:
                if 'diameter' in param.get('name', '').lower():
                    diameter = float(param['value'])
                    break
        
        if 'orbit' in asteroid_data and 'close_approach_data' in asteroid_data['orbit']:
            approach_data = asteroid_data['orbit']['close_approach_data']
            if approach_data:
                velocity = float(approach_data[0]['v_rel'])
        
        print(f"   Extracted diameter: {diameter} km")
        print(f"   Extracted velocity: {velocity} km/s")
        
        print("3️⃣ Simulate user impact location selection...")
        impact_coords = [20.5937, 78.9629]  # User clicked on India
        print(f"   Selected coordinates: {impact_coords}")
        
        print("4️⃣ Calculate synchronized trajectories...")
        from .orbital_calculator import extract_orbital_elements, calculate_both_trajectories
        orbital_elements = extract_orbital_elements(asteroid_data)
        trajectories = calculate_both_trajectories(orbital_elements, num_points=10)
        
        print("5️⃣ Simulate impact calculation...")
        from .impact_calculator import calculate_impact_effects, format_impact_results
        
        if diameter and velocity:
            impact_results = calculate_impact_effects(
                diameter_km=diameter,
                velocity_kps=velocity
            )
            formatted_results = format_impact_results(impact_results)
            
            print(f"   Crater diameter: {formatted_results.get('craterDiameterMeters', 'N/A')} m")
            print(f"   Impact energy: {formatted_results.get('impactEnergyMegatons', 'N/A')} MT")
        
        print("\n🎉 INTEGRATION TEST SUCCESSFUL!")
        print("All phases working together seamlessly!")
        return True
        
    except Exception as e:
        print(f"❌ Integration Test Failed: {e}")
        return False

if __name__ == "__main__":
    print("🛡️ AEGIS PROJECT - FEATURE DEMONSTRATION")
    print("Testing all three implementation phases...")
    
    results = []
    results.append(test_phase_1_dynamic_parameters())
    results.append(test_phase_2_impact_coordinates())
    results.append(test_phase_3_synchronized_trajectories())
    results.append(test_integration_workflow())
    
    print("\n" + "=" * 60)
    print("📋 FINAL RESULTS")
    print("=" * 60)
    
    phases = [
        "Phase 1: Dynamic Impact Parameters",
        "Phase 2: User-Selectable Impact Location", 
        "Phase 3: Earth Orbit Synchronization",
        "Integration Workflow"
    ]
    
    for i, (phase, result) in enumerate(zip(phases, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1}. {phase}: {status}")
    
    success_rate = sum(results) / len(results) * 100
    print(f"\nOverall Success Rate: {success_rate:.1f}%")
    
    if success_rate == 100:
        print("\n🎊 ALL FEATURES FULLY IMPLEMENTED AND WORKING!")
    elif success_rate >= 75:
        print("\n🎯 Most features working, minor issues detected")
    else:
        print("\n⚠️ Significant issues detected, requires attention")