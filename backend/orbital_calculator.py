"""
Orbital mechanics calculations using poliastro for asteroid trajectory computation.
"""
import logging
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
import math
import numpy as np
from astropy import units as u
from astropy.time import Time
from poliastro.bodies import Sun, Earth
from poliastro.twobody import Orbit

# Import ImpactCalculationError for orbital synchronization errors
from impact_calculator import ImpactCalculationError

logger = logging.getLogger(__name__)


class OrbitalCalculationError(Exception):
    """Custom exception for orbital calculation related errors."""
    pass


@dataclass
class OrbitalElements:
    """Data class for storing orbital elements."""
    semi_major_axis: float  # a (AU)
    eccentricity: float     # e (dimensionless)
    inclination: float      # i (degrees)
    longitude_ascending_node: float  # Ω (degrees)
    argument_periapsis: float        # ω (degrees)
    mean_anomaly: float     # M (degrees)
    epoch: float           # Julian date


def extract_orbital_elements(nasa_response: Dict[str, Any]) -> OrbitalElements:
    """
    Extract orbital elements from NASA API response.
    
    Args:
        nasa_response: Complete NASA API response dictionary
        
    Returns:
        OrbitalElements object with extracted parameters
        
    Raises:
        OrbitalCalculationError: If required orbital elements are missing or invalid
    """
    try:
        # Validate response structure
        if "orbit" not in nasa_response:
            raise OrbitalCalculationError("Missing 'orbit' section in NASA response")
        
        orbit_data = nasa_response["orbit"]
        
        if "elements" not in orbit_data:
            raise OrbitalCalculationError("Missing 'elements' section in orbit data")
        
        if "epoch" not in orbit_data:
            raise OrbitalCalculationError("Missing 'epoch' in orbit data")
        
        # Extract epoch with enhanced validation
        try:
            epoch = float(orbit_data["epoch"])
            
            # Validate epoch is finite
            if not math.isfinite(epoch):
                raise ImpactCalculationError(f"Invalid epoch time: {epoch}. Must be a finite Julian date number")
            
            # Validate epoch is within reasonable range (1900-2100 AD approximately)
            if epoch < 2415020.5 or epoch > 2488070.5:
                raise ImpactCalculationError(
                    f"Epoch {epoch} is outside reasonable range (1900-2100 AD). "
                    f"Expected Julian date between 2415020.5 and 2488070.5"
                )
                
        except (ValueError, TypeError) as e:
            raise ImpactCalculationError(f"Invalid epoch value '{orbit_data['epoch']}': {str(e)}. Must be a numeric Julian date")
        except ImpactCalculationError:
            # Re-raise our custom exceptions
            raise
        
        # Create dictionary of orbital elements for easy lookup
        elements_dict = {}
        for element in orbit_data["elements"]:
            if "name" not in element or "value" not in element:
                logger.warning(f"Skipping malformed element: {element}")
                continue
            
            try:
                elements_dict[element["name"]] = float(element["value"])
            except (ValueError, TypeError):
                logger.warning(f"Invalid value for element {element['name']}: {element['value']}")
                continue
        
        # Required orbital elements mapping
        required_elements = {
            "a": "semi_major_axis",
            "e": "eccentricity", 
            "i": "inclination",
            "om": "longitude_ascending_node",  # Longitude of ascending node (Ω)
            "w": "argument_periapsis",         # Argument of periapsis (ω)
            "ma": "mean_anomaly"               # Mean anomaly (M)
        }
        
        # Check for missing required elements
        missing_elements = []
        for nasa_name in required_elements.keys():
            if nasa_name not in elements_dict:
                missing_elements.append(nasa_name)
        
        if missing_elements:
            raise OrbitalCalculationError(
                f"Missing required orbital elements: {missing_elements}"
            )
        
        # Validate orbital element ranges
        a = elements_dict["a"]
        e = elements_dict["e"]
        i = elements_dict["i"]
        om = elements_dict["om"]
        w = elements_dict["w"]
        ma = elements_dict["ma"]
        
        # Validation checks
        if a <= 0:
            raise OrbitalCalculationError(f"Semi-major axis must be positive: {a}")
        
        if e < 0 or e >= 1:
            raise OrbitalCalculationError(f"Eccentricity must be in range [0, 1): {e}")
        
        if i < 0 or i > 180:
            raise OrbitalCalculationError(f"Inclination must be in range [0, 180]: {i}")
        
        # Normalize angles to [0, 360) range
        om = om % 360
        w = w % 360
        ma = ma % 360
        
        logger.info(f"Successfully extracted orbital elements: a={a}, e={e}, i={i}")
        
        return OrbitalElements(
            semi_major_axis=a,
            eccentricity=e,
            inclination=i,
            longitude_ascending_node=om,
            argument_periapsis=w,
            mean_anomaly=ma,
            epoch=epoch
        )
        
    except OrbitalCalculationError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        raise OrbitalCalculationError(f"Unexpected error extracting orbital elements: {str(e)}")


def validate_orbital_elements(elements: OrbitalElements) -> bool:
    """
    Validate orbital elements for physical consistency.
    
    Args:
        elements: OrbitalElements object to validate
        
    Returns:
        True if elements are valid
        
    Raises:
        OrbitalCalculationError: If elements are invalid
    """
    try:
        # Check for NaN or infinite values
        values = [
            elements.semi_major_axis,
            elements.eccentricity,
            elements.inclination,
            elements.longitude_ascending_node,
            elements.argument_periapsis,
            elements.mean_anomaly,
            elements.epoch
        ]
        
        for value in values:
            if not math.isfinite(value):
                raise OrbitalCalculationError(f"Non-finite orbital element value: {value}")
        
        # Physical constraints
        if elements.semi_major_axis <= 0:
            raise OrbitalCalculationError("Semi-major axis must be positive")
        
        if elements.eccentricity < 0 or elements.eccentricity >= 1:
            raise OrbitalCalculationError("Eccentricity must be in range [0, 1)")
        
        if elements.inclination < 0 or elements.inclination > 180:
            raise OrbitalCalculationError("Inclination must be in range [0, 180] degrees")
        
        # Check epoch is reasonable (should be a Julian date)
        if elements.epoch < 2400000 or elements.epoch > 2500000:
            logger.warning(f"Epoch {elements.epoch} seems outside reasonable range")
        
        return True
        
    except Exception as e:
        raise OrbitalCalculationError(f"Validation error: {str(e)}")


def create_time_range(start_time: Time, end_time: Time, num_points: int) -> List[Time]:
    """
    Create a range of Time objects between start and end times.
    
    Args:
        start_time: Starting time
        end_time: Ending time
        num_points: Number of time points to generate
        
    Returns:
        List of Time objects
        
    Raises:
        ImpactCalculationError: If time range generation fails or parameters are invalid
    """
    try:
        # Validate input parameters
        if not isinstance(start_time, Time):
            raise ImpactCalculationError(f"Invalid start_time type: {type(start_time)}. Must be astropy.time.Time")
        
        if not isinstance(end_time, Time):
            raise ImpactCalculationError(f"Invalid end_time type: {type(end_time)}. Must be astropy.time.Time")
        
        if not isinstance(num_points, int) or num_points <= 0:
            raise ImpactCalculationError(f"Invalid num_points: {num_points}. Must be a positive integer")
        
        if num_points < 2:
            raise ImpactCalculationError(f"num_points must be at least 2, got: {num_points}")
        
        if num_points > 10000:  # Sanity check to prevent memory issues
            raise ImpactCalculationError(f"num_points too large: {num_points}. Maximum allowed is 10000")
        
        # Validate time ordering
        if end_time <= start_time:
            raise ImpactCalculationError(f"end_time ({end_time}) must be after start_time ({start_time})")
        
        # Calculate time step
        total_duration = (end_time - start_time).to(u.day).value
        
        if not math.isfinite(total_duration) or total_duration <= 0:
            raise ImpactCalculationError(f"Invalid time duration: {total_duration} days")
        
        time_step = total_duration / (num_points - 1)
        
        # Generate time array
        times = []
        for i in range(num_points):
            try:
                time_offset = i * time_step * u.day
                new_time = start_time + time_offset
                times.append(new_time)
            except Exception as e:
                raise ImpactCalculationError(f"Failed to generate time point {i}: {str(e)}")
        
        # Validate generated time array
        if len(times) != num_points:
            raise ImpactCalculationError(f"Generated {len(times)} time points, expected {num_points}")
        
        if not times:
            raise ImpactCalculationError("Generated empty time array")
        
        logger.info(f"Successfully created time range with {len(times)} points from {start_time} to {end_time}")
        return times
        
    except ImpactCalculationError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Unexpected error creating time range: {str(e)}")


def calculate_trajectory(orbital_elements: OrbitalElements, num_points: int = 365, times: Optional[List[Time]] = None) -> List[List[float]]:
    """
    Calculate trajectory coordinates using poliastro orbital mechanics.
    
    Args:
        orbital_elements: OrbitalElements object with orbital parameters
        num_points: Number of coordinate points to generate (default: 365, ignored if times provided)
        times: Optional list of Time objects for trajectory calculation. If provided, overrides num_points
        
    Returns:
        List of [x, y, z] coordinate arrays in AU units
        
    Raises:
        OrbitalCalculationError: If trajectory calculation fails
    """
    try:
        # Validate orbital elements first
        validate_orbital_elements(orbital_elements)
        
        # Convert epoch from Julian date to astropy Time
        epoch_time = Time(orbital_elements.epoch, format='jd')
        
        # Create orbit object using classical orbital elements
        orbit = Orbit.from_classical(
            attractor=Sun,
            a=orbital_elements.semi_major_axis * u.au,
            ecc=orbital_elements.eccentricity * u.one,
            inc=orbital_elements.inclination * u.deg,
            raan=orbital_elements.longitude_ascending_node * u.deg,
            argp=orbital_elements.argument_periapsis * u.deg,
            nu=orbital_elements.mean_anomaly * u.deg,  # Using mean anomaly as true anomaly approximation
            epoch=epoch_time
        )
        
        # Calculate orbital period
        period = orbit.period
        
        # Use provided times array or generate time range
        if times is not None:
            # Use provided time array
            if not times:
                raise OrbitalCalculationError("Provided times array is empty")
            trajectory_times = times
            logger.info(f"Using provided time array with {len(times)} points")
        else:
            # Generate time range over 2 years for backward compatibility
            time_span = 2 * u.year
            end_time = epoch_time + time_span
            trajectory_times = create_time_range(epoch_time, end_time, num_points)
            logger.info(f"Generated internal time range with {num_points} points over 2 years")
        
        # Propagate orbit to get positions at each time
        coordinates = []
        for time in trajectory_times:
            try:
                # Propagate orbit to the specific time
                propagated_orbit = orbit.propagate(time - epoch_time)
                
                # Get position vector in AU
                position = propagated_orbit.r.to(u.au).value
                
                # Convert to list format [x, y, z]
                coordinates.append([float(position[0]), float(position[1]), float(position[2])])
                
            except Exception as e:
                logger.warning(f"Failed to propagate orbit at time {time}: {str(e)}")
                # Use previous coordinate if available, otherwise skip
                if coordinates:
                    coordinates.append(coordinates[-1])
                else:
                    coordinates.append([0.0, 0.0, 0.0])
        
        logger.info(f"Successfully calculated {len(coordinates)} trajectory points")
        return coordinates
        
    except Exception as e:
        raise OrbitalCalculationError(f"Trajectory calculation failed: {str(e)}")


def get_earth_trajectory(times: List[Time]) -> List[List[float]]:
    """
    Calculate Earth's orbital trajectory using poliastro ephemeris data.
    
    Args:
        times: List of Time objects for which to calculate Earth's position
        
    Returns:
        List of [x, y, z] coordinate arrays in AU units
        
    Raises:
        ImpactCalculationError: If Earth trajectory calculation fails
    """
    try:
        # Validate input times array
        if not times:
            raise ImpactCalculationError("Empty times array provided for Earth trajectory calculation")
        
        if not isinstance(times, list):
            raise ImpactCalculationError(f"Invalid times type: {type(times)}. Must be a list of astropy.time.Time objects")
        
        # Validate each time object
        for i, time in enumerate(times):
            if not isinstance(time, Time):
                raise ImpactCalculationError(f"Invalid time object at index {i}: {type(time)}. Must be astropy.time.Time")
        
        logger.info(f"Calculating Earth trajectory for {len(times)} time points")
        
        # Calculate Earth's positions using accurate ephemeris data
        coordinates = []
        ephemeris_failures = 0
        
        for i, time in enumerate(times):
            try:
                # Use poliastro's built-in ephemeris data for Earth
                earth_orbit = Orbit.from_body_ephem(Earth, time)
                
                # Get position vector in AU
                position = earth_orbit.r.to(u.au).value
                
                # Validate position values
                if not all(math.isfinite(pos) for pos in position):
                    raise ValueError(f"Non-finite position values: {position}")
                
                # Convert to list format [x, y, z]
                coordinates.append([float(position[0]), float(position[1]), float(position[2])])
                
            except Exception as e:
                ephemeris_failures += 1
                logger.warning(f"Failed to get Earth ephemeris at time {time} (point {i+1}/{len(times)}): {str(e)}")
                
                # Use circular approximation as fallback
                try:
                    if len(times) > 1:
                        # Calculate approximate position based on time from first epoch
                        days_from_epoch = (time - times[0]).to(u.day).value
                        
                        if not math.isfinite(days_from_epoch):
                            raise ValueError(f"Invalid days_from_epoch: {days_from_epoch}")
                        
                        angle = 2 * math.pi * days_from_epoch / 365.25  # Earth's orbital period
                        x = math.cos(angle)
                        y = math.sin(angle)
                        z = 0.0
                        
                        # Validate fallback values
                        if not all(math.isfinite(val) for val in [x, y, z]):
                            raise ValueError(f"Non-finite fallback values: [{x}, {y}, {z}]")
                        
                        coordinates.append([x, y, z])
                    else:
                        # Single time point fallback
                        coordinates.append([1.0, 0.0, 0.0])
                        
                except Exception as fallback_error:
                    raise ImpactCalculationError(
                        f"Both ephemeris and fallback calculations failed at time {time}: "
                        f"ephemeris_error='{str(e)}', fallback_error='{str(fallback_error)}'"
                    )
        
        # Validate final results
        if not coordinates:
            raise ImpactCalculationError("No valid Earth trajectory points calculated")
        
        if len(coordinates) != len(times):
            raise ImpactCalculationError(
                f"Coordinate count mismatch: calculated {len(coordinates)} points, expected {len(times)}"
            )
        
        # Log ephemeris failure rate
        if ephemeris_failures > 0:
            failure_rate = (ephemeris_failures / len(times)) * 100
            logger.warning(f"Earth ephemeris failed for {ephemeris_failures}/{len(times)} points ({failure_rate:.1f}%)")
            
            # If too many ephemeris failures, raise an error
            if failure_rate > 50:
                raise ImpactCalculationError(
                    f"Earth ephemeris data unavailable for {failure_rate:.1f}% of time points. "
                    "This may indicate invalid time range or poliastro data issues."
                )
        
        logger.info(f"Successfully calculated {len(coordinates)} Earth trajectory points using ephemeris data")
        return coordinates
        
    except ImpactCalculationError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Earth trajectory calculation failed: {str(e)}")


def calculate_both_trajectories(orbital_elements: OrbitalElements, num_points: int = 365) -> Dict[str, List[List[float]]]:
    """
    Calculate both asteroid and Earth trajectories using synchronized time intervals.
    
    Args:
        orbital_elements: OrbitalElements object for the asteroid
        num_points: Number of coordinate points to generate (default: 365)
        
    Returns:
        Dictionary with 'asteroid_path' and 'earth_path' coordinate arrays
        
    Raises:
        ImpactCalculationError: If trajectory calculations fail due to orbital synchronization issues
        OrbitalCalculationError: If trajectory calculations fail due to other orbital mechanics issues
    """
    try:
        # Validate input parameters
        if not isinstance(orbital_elements, OrbitalElements):
            raise ImpactCalculationError(f"Invalid orbital_elements type: {type(orbital_elements)}. Must be OrbitalElements")
        
        if not isinstance(num_points, int) or num_points <= 0:
            raise ImpactCalculationError(f"Invalid num_points: {num_points}. Must be a positive integer")
        
        # Extract epoch_time from orbital_elements.epoch and validate with enhanced error handling
        try:
            # Validate epoch value before creating Time object
            if not isinstance(orbital_elements.epoch, (int, float)):
                raise ImpactCalculationError(
                    f"Invalid epoch type: {type(orbital_elements.epoch)}. Must be a numeric Julian date"
                )
            
            if not math.isfinite(orbital_elements.epoch):
                raise ImpactCalculationError(
                    f"Invalid epoch value: {orbital_elements.epoch}. Must be a finite Julian date"
                )
            
            # Validate epoch is within reasonable range (1900-2100 AD approximately)
            if orbital_elements.epoch < 2415020.5 or orbital_elements.epoch > 2488070.5:
                raise ImpactCalculationError(
                    f"Epoch {orbital_elements.epoch} is outside reasonable range (1900-2100 AD). "
                    f"Expected Julian date between 2415020.5 and 2488070.5"
                )
            
            # Create Time object with enhanced error handling
            epoch_time = Time(orbital_elements.epoch, format='jd')
            
            # Validate the created Time object
            if not math.isfinite(epoch_time.jd):
                raise ImpactCalculationError(f"Created Time object is not finite: {epoch_time}")
            
            logger.info(f"Successfully validated epoch time: {epoch_time} (JD {orbital_elements.epoch})")
            
        except ImpactCalculationError:
            # Re-raise our specific epoch validation errors
            raise
        except Exception as e:
            raise ImpactCalculationError(
                f"Failed to create valid epoch time from {orbital_elements.epoch}: {str(e)}. "
                f"Ensure epoch is a valid Julian date number"
            )
        
        # Create time range over 2 years from asteroid's epoch with enhanced validation
        try:
            time_span = 2 * u.year
            end_time = epoch_time + time_span
            
            # Validate end_time
            if not math.isfinite(end_time.jd):
                raise ImpactCalculationError(f"Calculated end_time is not finite: {end_time}")
            
            logger.info(f"Creating time range from {epoch_time} to {end_time} ({time_span})")
            
        except Exception as e:
            raise ImpactCalculationError(f"Failed to calculate time range parameters: {str(e)}")
        
        # Create shared time array that both trajectories will use with enhanced error handling
        try:
            shared_times = create_time_range(epoch_time, end_time, num_points)
            
            # Additional validation of shared_times array
            if not shared_times:
                raise ImpactCalculationError("Generated empty shared time array")
            
            if len(shared_times) != num_points:
                raise ImpactCalculationError(
                    f"Shared time array length mismatch: generated {len(shared_times)}, expected {num_points}"
                )
            
            # Validate time array integrity
            for i, time in enumerate(shared_times):
                if not isinstance(time, Time) or not math.isfinite(time.jd):
                    raise ImpactCalculationError(f"Invalid time object at index {i}: {time}")
            
            logger.info(f"Created shared time array with {len(shared_times)} points from epoch {epoch_time} over 2 years")
            
        except ImpactCalculationError:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            raise ImpactCalculationError(f"Failed to generate shared time array: {str(e)}")
        
        # Calculate asteroid trajectory using shared times array with enhanced error handling
        try:
            logger.info("Calculating asteroid trajectory with synchronized time array")
            asteroid_path = calculate_trajectory(orbital_elements, num_points, shared_times)
            
            if not asteroid_path:
                raise ImpactCalculationError("Asteroid trajectory calculation returned empty result")
            
            logger.info(f"Successfully calculated asteroid trajectory with {len(asteroid_path)} points")
            
        except ImpactCalculationError:
            # Re-raise our custom exceptions
            raise
        except OrbitalCalculationError as e:
            # Convert orbital calculation errors to impact calculation errors for synchronization context
            raise ImpactCalculationError(f"Asteroid trajectory calculation failed during synchronization: {str(e)}")
        except Exception as e:
            raise ImpactCalculationError(f"Unexpected error calculating asteroid trajectory: {str(e)}")
        
        # Calculate Earth trajectory using shared times array with enhanced error handling
        try:
            logger.info("Calculating Earth trajectory with synchronized time array")
            earth_path = get_earth_trajectory(shared_times)
            
            if not earth_path:
                raise ImpactCalculationError("Earth trajectory calculation returned empty result")
            
            logger.info(f"Successfully calculated Earth trajectory with {len(earth_path)} points")
            
        except ImpactCalculationError:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            raise ImpactCalculationError(f"Unexpected error calculating Earth trajectory: {str(e)}")
        
        # Verify both trajectories have same number of points with enhanced validation
        if len(asteroid_path) != len(earth_path):
            error_msg = (
                f"Trajectory synchronization failed: length mismatch between asteroid ({len(asteroid_path)} points) "
                f"and Earth ({len(earth_path)} points) trajectories"
            )
            logger.error(error_msg)
            raise ImpactCalculationError(error_msg)
        
        if len(asteroid_path) != num_points:
            error_msg = (
                f"Trajectory point count mismatch: calculated {len(asteroid_path)} points, expected {num_points}"
            )
            logger.error(error_msg)
            raise ImpactCalculationError(error_msg)
        
        logger.info(f"Successfully calculated synchronized trajectories: asteroid={len(asteroid_path)} points, earth={len(earth_path)} points")
        
        return {
            "asteroid_path": asteroid_path,
            "earth_path": earth_path
        }
        
    except ImpactCalculationError:
        # Re-raise our custom exceptions with context
        raise
    except OrbitalCalculationError:
        # Re-raise orbital calculation exceptions
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Unexpected error calculating synchronized trajectories: {str(e)}")

def calculate_deflected_trajectory(
    asteroid_name: str,
    delta_v_mps: float,
    days_from_epoch: float,
    num_points: int = 365
) -> Dict[str, Any]:
    """
    Calculate the deflected trajectory of an asteroid after a velocity change maneuver.
    
    Args:
        asteroid_name: Name or designation of the asteroid
        delta_v_mps: Velocity change in meters per second
        days_from_epoch: Days from asteroid epoch when deflection occurs
        num_points: Number of trajectory points to calculate (default: 365)
        
    Returns:
        Dictionary containing deflected trajectory data with orbital path
        
    Raises:
        OrbitalCalculationError: If calculation fails
    """
    try:
        logger.info(f"Calculating deflected trajectory for {asteroid_name} with delta-v={delta_v_mps} m/s at t={days_from_epoch} days")
        
        # Import NASA client
        from nasa_client import get_asteroid_data
        
        # Fetch asteroid data
        asteroid_data = get_asteroid_data(asteroid_name)
        
        # Extract orbital elements
        orbital_elements = extract_orbital_elements(asteroid_data)
        
        # Create original orbit
        epoch = Time(orbital_elements.epoch, format='jd')
        
        original_orbit = Orbit.from_classical(
            Sun,
            orbital_elements.semi_major_axis * u.au,
            orbital_elements.eccentricity * u.one,
            orbital_elements.inclination * u.deg,
            orbital_elements.longitude_ascending_node * u.deg,
            orbital_elements.argument_periapsis * u.deg,
            orbital_elements.mean_anomaly * u.deg,
            epoch=epoch
        )
        
        # Propagate to deflection time
        deflection_time = days_from_epoch * u.day
        orbit_at_deflection = original_orbit.propagate(deflection_time)
        
        # Apply velocity change (convert m/s to km/s for poliastro)
        # We'll apply a prograde maneuver (in direction of motion)
        from poliastro.maneuver import Maneuver
        from astropy.coordinates import CartesianDifferential
        
        # Get current velocity vector and add delta-v in the same direction
        current_v = orbit_at_deflection.v.to(u.km / u.s)
        v_magnitude = np.linalg.norm(current_v.value)
        v_direction = current_v.value / v_magnitude
        
        # Add delta-v in velocity direction (prograde burn)
        delta_v_kms = delta_v_mps / 1000.0  # Convert m/s to km/s
        new_v = current_v + CartesianDifferential(
            d_x=delta_v_kms * v_direction[0] * u.km / u.s,
            d_y=delta_v_kms * v_direction[1] * u.km / u.s,
            d_z=delta_v_kms * v_direction[2] * u.km / u.s
        )
        
        # Create new orbit with modified velocity
        deflected_orbit = Orbit.from_vectors(
            Sun,
            orbit_at_deflection.r,
            new_v,
            epoch=orbit_at_deflection.epoch
        )
        
        # Calculate deflected trajectory points
        times = [deflected_orbit.epoch + i * (365 * u.day / num_points) for i in range(num_points)]
        deflected_path = []
        
        for t in times:
            try:
                propagated = deflected_orbit.propagate(t - deflected_orbit.epoch)
                r = propagated.r.to(u.au).value
                deflected_path.append({
                    "x": float(r[0]),
                    "y": float(r[1]),
                    "z": float(r[2])
                })
            except Exception as e:
                logger.warning(f"Failed to propagate deflected orbit at time {t}: {str(e)}")
                continue
        
        # Get new orbital elements
        new_elements = {
            "a": float(deflected_orbit.a.to(u.au).value),
            "e": float(deflected_orbit.ecc.value),
            "i": float(deflected_orbit.inc.to(u.deg).value),
            "raan": float(deflected_orbit.raan.to(u.deg).value),
            "argp": float(deflected_orbit.argp.to(u.deg).value),
            "nu": float(deflected_orbit.nu.to(u.deg).value)
        }
        
        logger.info(f"Deflected trajectory calculated: {len(deflected_path)} points, new a={new_elements['a']:.6f} AU")
        
        return {
            "success": True,
            "asteroid_name": asteroid_name,
            "delta_v_applied_mps": delta_v_mps,
            "deflection_time_days": days_from_epoch,
            "original_elements": {
                "a": orbital_elements.semi_major_axis,
                "e": orbital_elements.eccentricity,
                "i": orbital_elements.inclination
            },
            "deflected_elements": new_elements,
            "deflected_path": deflected_path,
            "path_points": len(deflected_path)
        }
        
    except Exception as e:
        logger.error(f"Deflection calculation failed for {asteroid_name}: {str(e)}")
        raise OrbitalCalculationError(f"Failed to calculate deflected trajectory: {str(e)}")
