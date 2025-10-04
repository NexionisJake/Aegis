# Design Document

## Overview

This design document outlines the implementation of three major enhancements to the asteroid impact simulation application: dynamic impact parameters using real asteroid data, user-selectable impact locations through 3D Earth interaction, and scientifically accurate Earth orbit synchronization. The design maintains the existing React/FastAPI architecture while adding new state management, 3D interaction capabilities, and backend orbital calculation improvements.

## Architecture

### Frontend Architecture Changes

The frontend will be enhanced with new state management for asteroid data and impact coordinates, plus 3D interaction capabilities:

```
App.jsx (Enhanced)
├── asteroidData state (new)
├── impactCoords state (new)
├── Enhanced data fetching flow
└── Updated impact simulation logic

Scene3D.jsx (Enhanced)
├── Click handler integration
└── Impact location feedback

SolarSystem.jsx (Enhanced)
├── Earth click detection
├── Raycasting implementation
└── Coordinate conversion

ImpactMap.jsx (Enhanced)
└── Dynamic coordinate support
```

### Backend Architecture Changes

The backend will be enhanced with synchronized trajectory calculations and improved data extraction:

```
orbital_calculator.py (Enhanced)
├── get_earth_trajectory() - accepts time array
├── calculate_both_trajectories() - synchronized epochs
└── Enhanced time range management

main.py (Enhanced)
└── Enhanced asteroid data endpoint response
```

## Components and Interfaces

### Frontend Components

#### App.jsx Enhancements
- **New State Variables:**
  - `asteroidData`: Complete asteroid dataset from NASA API
  - `impactCoords`: User-selected impact coordinates [lat, lng]
- **Enhanced Methods:**
  - `fetchInitialData()`: Fetch complete asteroid data first, then trajectory
  - `handleSimulateImpact()`: Extract real parameters from asteroidData
  - `handleImpactSelect()`: Update impact coordinates from 3D interaction

#### SolarSystem.jsx Enhancements
- **New Props:**
  - `onImpactSelect`: Callback for impact location selection
- **New Methods:**
  - `handleEarthClick()`: Process 3D Earth clicks using raycasting
  - `convertToLatLng()`: Convert 3D coordinates to geographic coordinates
- **3D Interaction:**
  - Raycaster integration for precise click detection
  - Visual feedback for selected impact location

#### ImpactMap.jsx Enhancements
- **New Props:**
  - `impactCoordinates`: Dynamic coordinates from parent state
- **Removed:**
  - Hardcoded New York coordinates

### Backend Components

#### orbital_calculator.py Enhancements
- **Modified Functions:**
  - `get_earth_trajectory(times: List[Time])`: Accept time array parameter
  - `calculate_both_trajectories()`: Use shared epoch and time intervals
- **New Functions:**
  - `create_shared_time_range()`: Generate synchronized time intervals

#### main.py Enhancements
- **Enhanced Endpoints:**
  - `/api/asteroid/{name}`: Return complete NASA dataset for parameter extraction

## Data Models

### Frontend Data Models

#### AsteroidData Interface
```typescript
interface AsteroidData {
  phys_par: Array<{
    name: string;
    value: string;
    unit?: string;
  }>;
  orbit: {
    close_approach_data: Array<{
      v_rel: string; // velocity
      // other approach data
    }>;
    elements: Array<{
      name: string;
      value: string;
    }>;
    epoch: string;
  };
}
```

#### ImpactCoordinates Type
```typescript
type ImpactCoordinates = [number, number]; // [latitude, longitude]
```

### Backend Data Models

#### Enhanced Time Management
```python
@dataclass
class SynchronizedTrajectoryParams:
    epoch_time: Time
    time_range: List[Time]
    num_points: int
```

## Error Handling

### Frontend Error Handling

#### New Error Types
- **Missing Asteroid Data Error**: When asteroid data is unavailable for impact simulation
- **Invalid Impact Location Error**: When 3D click doesn't intersect with Earth
- **Parameter Extraction Error**: When asteroid data structure is unexpected

#### Error Recovery Strategies
- Graceful fallback to default impact location (India coordinates)
- Clear user feedback for missing or invalid data
- Retry mechanisms for data fetching failures

### Backend Error Handling

#### Enhanced Error Types
- **Epoch Synchronization Error**: When asteroid and Earth epochs cannot be synchronized
- **Parameter Extraction Error**: When physical parameters are missing from NASA data
- **Time Range Generation Error**: When shared time intervals cannot be created

#### Error Recovery Strategies
- Fallback to approximate values when exact parameters are unavailable
- Detailed error messages indicating specific calculation failures
- Graceful degradation for missing orbital elements

## Testing Strategy

### Frontend Testing

#### Unit Tests
- **State Management Tests**: Verify asteroid data and impact coordinate state updates
- **Coordinate Conversion Tests**: Test 3D to geographic coordinate conversion accuracy
- **Parameter Extraction Tests**: Validate extraction of diameter and velocity from asteroid data

#### Integration Tests
- **3D Interaction Tests**: Verify Earth click detection and coordinate calculation
- **Data Flow Tests**: Test complete flow from asteroid selection to impact simulation
- **Error Handling Tests**: Verify graceful handling of missing or invalid data

#### Component Tests
- **SolarSystem Click Tests**: Mock raycaster interactions and verify coordinate output
- **ImpactMap Dynamic Tests**: Test map rendering with various coordinate inputs
- **App State Tests**: Verify state synchronization between components

### Backend Testing

#### Unit Tests
- **Synchronized Trajectory Tests**: Verify Earth and asteroid use same time intervals
- **Parameter Extraction Tests**: Test extraction from various NASA API response formats
- **Time Range Generation Tests**: Validate shared time interval creation

#### Integration Tests
- **End-to-End Trajectory Tests**: Verify complete synchronized trajectory calculation
- **API Response Tests**: Test enhanced asteroid endpoint with real NASA data
- **Error Propagation Tests**: Verify proper error handling through the calculation chain

#### Performance Tests
- **Memory Usage Tests**: Verify efficient handling of large trajectory datasets
- **Calculation Speed Tests**: Ensure synchronized calculations don't significantly impact performance

### Scientific Accuracy Tests

#### Orbital Mechanics Validation
- **Epoch Synchronization Tests**: Verify asteroid and Earth trajectories use identical time references
- **Poliastro Integration Tests**: Validate Earth ephemeris data usage
- **Coordinate System Tests**: Ensure consistent coordinate systems between calculations

#### Impact Physics Validation
- **Parameter Accuracy Tests**: Verify real asteroid parameters produce expected impact results
- **Cross-Reference Tests**: Compare results with known asteroid impact calculations

## Implementation Phases

### Phase 1: Dynamic Impact Parameters
1. Add asteroidData state to App.jsx
2. Modify data fetching to retrieve complete asteroid dataset
3. Update handleSimulateImpact to extract real parameters
4. Add error handling for missing parameter data
5. Test parameter extraction with various asteroids

### Phase 2: User-Selectable Impact Location
1. Add impactCoords state to App.jsx
2. Implement raycasting in SolarSystem.jsx for Earth click detection
3. Add coordinate conversion from 3D to geographic
4. Update ImpactMap.jsx to use dynamic coordinates
5. Add visual feedback for impact location selection
6. Test 3D interaction accuracy and user experience

### Phase 3: Accurate Earth Orbit Synchronization
1. Modify get_earth_trajectory to accept time array parameter
2. Update calculate_both_trajectories for epoch synchronization
3. Implement shared time range generation
4. Add error handling for synchronization failures
5. Test orbital accuracy and performance impact
6. Validate scientific accuracy of synchronized trajectories

### Phase 4: Integration and Testing
1. Integration testing of all three features
2. Performance optimization and testing
3. User acceptance testing
4. Documentation updates
5. Final validation and deployment preparation