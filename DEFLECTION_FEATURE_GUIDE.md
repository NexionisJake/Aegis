# Deflection Preview Feature Guide

## Overview
The deflection preview feature allows you to calculate and visualize how applying a delta-v (velocity change) maneuver to an asteroid would alter its orbital trajectory. This is a key defensive capability for planetary protection scenarios.

## How to Use

### 1. Enter Defender Mode
- Click the **"Enter Defender Mode"** button in the Action Panel at the bottom of the screen
- The interface will switch to the HUD-themed Defender Mode view

### 2. Configure Deflection Parameters
In the Defender HUD panel, you'll see two input controls:

- **Delta-V (m/s)**: The velocity change to apply to the asteroid
  - Range: 1 to 10,000 m/s
  - Default: 100 m/s
  - Higher values = more dramatic orbit change
  
- **Days from Epoch**: When to apply the maneuver
  - Range: 1 to 1,000 days
  - Default: 30 days
  - Earlier application = more effective deflection

### 3. Calculate Deflection
- Click the **"Calculate Deflection"** button
- The backend will:
  1. Fetch the asteroid's current orbital parameters from NASA
  2. Propagate the orbit to the specified time
  3. Apply the delta-v maneuver
  4. Calculate the new trajectory
  5. Return the deflected orbital path

### 4. View Results
Once calculated:
- **Original trajectory**: Red/orange orbital path (threatening)
- **Deflected trajectory**: Bright green orbital path (safe)
- Both paths will be visible simultaneously for comparison
- The green path shows where the asteroid will go after the deflection maneuver

## Technical Details

### Backend Calculation
The deflection calculation uses the `poliastro` library for orbital mechanics:

```python
# Fetch asteroid orbital elements
orbit = Orbit.from_sbdb(asteroid_name)

# Propagate to maneuver time
future_time = Time(epoch) + TimeDelta(days_from_epoch * u.day)
propagated = orbit.propagate(future_time)

# Apply delta-v maneuver (prograde direction)
delta_v_vector = [delta_v_mps, 0, 0] * u.m / u.s
maneuver = Maneuver.impulse(delta_v_vector)
deflected_orbit = propagated.apply_maneuver(maneuver)

# Generate trajectory positions
positions = deflected_orbit.sample(100)
```

### API Endpoint
**POST** `/api/deflection/calculate`

**Request Body:**
```json
{
  "asteroid_name": "Apophis",
  "delta_v_mps": 100.0,
  "days_from_epoch": 30.0
}
```

**Response:**
```json
{
  "asteroid_name": "Apophis",
  "delta_v_applied_mps": 100.0,
  "maneuver_time_days_from_epoch": 30.0,
  "original_orbit": {
    "semi_major_axis_au": 0.922,
    "eccentricity": 0.191,
    "inclination_deg": 3.331
  },
  "deflected_orbit": {
    "semi_major_axis_au": 0.935,
    "eccentricity": 0.185,
    "inclination_deg": 3.331
  },
  "earth_path": [[x, y, z], ...],
  "asteroid_path": [[x, y, z], ...]
}
```

### Frontend Visualization
The 3D scene renders both trajectories:
- **Scene3D** passes `deflectedTrajectory` to **SolarSystem**
- **SolarSystem** creates BufferGeometry for the deflected path
- Green line material (`#00FF88`) distinguishes it from the original trajectory
- Both orbits are visible simultaneously for comparison

## Example Scenarios

### Conservative Deflection
- **Delta-V**: 50 m/s
- **Days from Epoch**: 100 days
- **Effect**: Minimal orbit change, gentle nudge

### Aggressive Deflection
- **Delta-V**: 1000 m/s
- **Days from Epoch**: 10 days
- **Effect**: Significant orbit change, dramatic deflection

### Early Warning Deflection
- **Delta-V**: 500 m/s
- **Days from Epoch**: 365 days (1 year early)
- **Effect**: Optimal - early intervention with moderate delta-v

## Physical Interpretation

### Delta-V Values
Real-world context:
- **10-100 m/s**: Kinetic impactor (like NASA's DART mission)
- **100-500 m/s**: Multiple impactors or gravity tractor
- **500-1000+ m/s**: Nuclear deflection or powerful propulsion

### Timing
- **Early (>365 days)**: Small delta-v can cause large deflection over time
- **Medium (30-365 days)**: Moderate delta-v needed
- **Late (<30 days)**: Very large delta-v required, may not be feasible

## Tips for Effective Deflection

1. **Start with conservative values** (50-100 m/s, 30-60 days)
2. **Observe the green trajectory** - does it avoid Earth?
3. **Experiment with timing** - earlier is usually better
4. **Try different asteroids** - each has unique orbital characteristics
5. **Compare original vs deflected** - both visible simultaneously

## Troubleshooting

### No green path appears
- Check browser console for errors
- Ensure asteroid trajectory is loaded first (red path visible)
- Verify delta-v and days are within valid ranges

### Calculation fails
- Backend may be unavailable (check if `http://127.0.0.1:8000` is running)
- Asteroid data may not be available from NASA
- Try a different asteroid (Apophis, Bennu work best)

### Performance issues
- Disable deflection preview if FPS drops
- Close other browser tabs
- Reduce quality settings in Scene3D

## Future Enhancements

Potential additions:
- Multiple deflection scenarios comparison
- Deflection success probability meter
- Cost estimation (fuel, mission duration)
- Real-time trajectory updates
- Save/load deflection scenarios
- Export deflection data as CSV/JSON

## References

- **NASA DART Mission**: https://www.nasa.gov/planetarydefense/dart
- **poliastro Documentation**: https://docs.poliastro.space/
- **Asteroid Deflection Strategies**: https://cneos.jpl.nasa.gov/pd/

---

**Note**: This is a simulation tool for educational purposes. Actual asteroid deflection missions require extensive planning, international coordination, and validation by mission experts.
