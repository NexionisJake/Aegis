# Implementation Plan

- [x] 1. Set up dynamic asteroid data state management





  - Add asteroidData state variable to App.jsx to store complete NASA API response
  - Add error handling state for missing asteroid data scenarios
  - Create helper functions for extracting diameter and velocity from asteroid data structure
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement enhanced data fetching workflow





  - Modify useEffect in App.jsx to fetch complete asteroid data before trajectory data
  - Update fetchInitialData function to store full asteroid dataset in state
  - Add error handling for asteroid data unavailability with user-friendly messages
  - _Requirements: 1.1, 1.3_
-

- [x] 3. Update impact simulation to use real asteroid parameters




  - Modify handleSimulateImpact function to extract diameter from asteroidData.phys_par array
  - Extract velocity from asteroidData.orbit.close_approach_data array
  - Add parameter validation and fallback handling for missing data
  - Replace hardcoded Apophis values with dynamic parameter extraction
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 4. Add impact location state management





  - Add impactCoords state variable to App.jsx with default India coordinates [20.5937, 78.9629]
  - Create handleImpactSelect callback function to update impact coordinates
  - Pass impact location state down to ImpactMap component
  - _Requirements: 2.6_
-

- [x] 5. Implement 3D Earth click detection in SolarSystem component




  - Add onImpactSelect prop to SolarSystem component interface
  - Import useThree hook and THREE.Raycaster for 3D interaction
  - Create handleEarthClick function with raycaster implementation for precise click detection
  - Add click event handler to Earth mesh with event.stopPropagation()
  - _Requirements: 2.1, 2.4_
-

- [x] 6. Implement 3D to geographic coordinate conversion




  - Create convertToLatLng function to convert 3D intersection points to latitude/longitude
  - Calculate latitude using Math.asin(point.y / radius) * (180 / Math.PI)
  - Calculate longitude using Math.atan2(point.z, point.x) * (180 / Math.PI)
  - Add validation to ensure coordinates are within valid Earth surface bounds
  - _Requirements: 2.1, 2.2_

- [x] 7. Connect 3D interaction to impact location state





  - Pass onImpactSelect callback from App.jsx through Scene3D to SolarSystem
  - Call onImpactSelect with calculated coordinates when valid Earth click is detected
  - Add visual feedback or console logging to confirm impact location selection
  - _Requirements: 2.2, 2.5_

- [x] 8. Update ImpactMap to use dynamic coordinates





  - Modify ImpactMap component to accept impactCoordinates as a prop
  - Remove hardcoded New York coordinates [40.7128, -74.0060]
  - Update MapContainer center prop to use dynamic impactCoordinates
  - Update Circle component center to use dynamic coordinates
  - _Requirements: 2.3_

- [x] 9. Enhance backend Earth trajectory calculation





  - Modify get_earth_trajectory function signature to accept times parameter: get_earth_trajectory(times: List[Time])
  - Replace internal time generation with provided times array for Earth position calculation
  - Use poliastro's Orbit.from_body_ephem(Earth, time) for each time point instead of simplified orbit
  - Update function to iterate through provided times array for accurate Earth ephemeris data
  - _Requirements: 3.1, 3.3_

- [x] 10. Implement synchronized trajectory calculation





  - Modify calculate_both_trajectories to create shared time array from asteroid's epoch
  - Extract epoch_time from orbital_elements.epoch and create time range over 2 years
  - Pass shared times array to both calculate_trajectory and get_earth_trajectory functions
  - Ensure both Earth and asteroid trajectories use identical time intervals and epoch reference
  - _Requirements: 3.1, 3.2, 3.5_
-

- [x] 11. Update calculate_trajectory to accept times parameter









  - Modify calculate_trajectory function signature to accept optional times parameter
  - When times parameter is provided, use it instead of generating internal time range
  - Maintain backward compatibility by generating time range when times parameter is None
  - Update trajectory propagation loop to use provided time array
  - _Requirements: 3.2, 3.5_

- [x] 12. Add enhanced error handling for orbital synchronization






  - Add try-catch blocks around epoch time extraction and validation
  - Create specific error messages for invalid epoch times with ImpactCalculationError
  - Add validation for time array generation and handle empty or invalid time ranges
  - Implement graceful error handling when poliastro ephemeris data is unavailable
  - _Requirements: 3.4, 3.6_

- [x] 13. Create comprehensive unit tests for dynamic parameters





  - Write tests for asteroid data parameter extraction with various NASA API response formats
  - Test error handling when diameter or velocity data is missing from asteroid response
  - Create mock asteroid data structures to test parameter validation and fallback logic
  - Test handleSimulateImpact with both valid and invalid asteroid data scenarios
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 14. Create unit tests for 3D interaction functionality





  - Write tests for 3D to geographic coordinate conversion accuracy
  - Mock raycaster interactions and test Earth click detection logic
  - Test coordinate validation and bounds checking for valid Earth surface points
  - Create tests for impact location state updates and callback functionality
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 15. Create unit tests for synchronized orbital calculations





  - Write tests to verify Earth and asteroid trajectories use identical time intervals
  - Test epoch synchronization with various asteroid orbital elements
  - Create tests for shared time range generation and validation
  - Test error handling for invalid epochs and synchronization failures
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

- [x] 16. Integration testing and final validation





  - Test complete workflow from asteroid selection through impact simulation with real coordinates
  - Verify scientific accuracy of synchronized trajectories against known orbital data
  - Test performance impact of enhanced calculations and 3D interactions
  - Validate error handling and user experience across all three enhancement features
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_