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
        
        # Extract epoch
        try:
            epoch = float(orbit_data["epoch"])
        except (ValueError, TypeError):
            raise OrbitalCalculationError(f"Invalid epoch value: {orbit_data['epoch']}")
        
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
    """
    # Calculate time step
    total_duration = (end_time - start_time).to(u.day).value
    time_step = total_duration / (num_points - 1)
    
    times = []
    for i in range(num_points):
        time_offset = i * time_step * u.day
        times.append(start_time + time_offset)
    
    return times


def calculate_trajectory(orbital_elements: OrbitalElements, num_points: int = 365) -> List[List[float]]:
    """
    Calculate trajectory coordinates using poliastro orbital mechanics.
    
    Args:
        orbital_elements: OrbitalElements object with orbital parameters
        num_points: Number of coordinate points to generate (default: 365)
        
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
        
        # Generate time range over 2 years
        time_span = 2 * u.year
        end_time = epoch_time + time_span
        times = create_time_range(epoch_time, end_time, num_points)
        
        # Propagate orbit to get positions at each time
        coordinates = []
        for time in times:
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


def get_earth_trajectory(num_points: int = 365) -> List[List[float]]:
    """
    Calculate Earth's orbital trajectory using poliastro.
    
    Args:
        num_points: Number of coordinate points to generate (default: 365)
        
    Returns:
        List of [x, y, z] coordinate arrays in AU units
        
    Raises:
        OrbitalCalculationError: If Earth trajectory calculation fails
    """
    try:
        # Use current time as epoch
        epoch_time = Time.now()
        
        # Create Earth's orbit using built-in orbital elements
        # Earth's approximate orbital elements (simplified)
        earth_orbit = Orbit.from_classical(
            attractor=Sun,
            a=1.0 * u.au,           # Earth's semi-major axis
            ecc=0.0167 * u.one,     # Earth's eccentricity
            inc=0.0 * u.deg,        # Earth's inclination (reference plane)
            raan=0.0 * u.deg,       # Longitude of ascending node
            argp=0.0 * u.deg,       # Argument of periapsis
            nu=0.0 * u.deg,         # True anomaly at epoch
            epoch=epoch_time
        )
        
        # Generate time range over 2 years
        time_span = 2 * u.year
        end_time = epoch_time + time_span
        times = create_time_range(epoch_time, end_time, num_points)
        
        # Calculate Earth's positions
        coordinates = []
        for time in times:
            try:
                # Propagate Earth's orbit
                propagated_orbit = earth_orbit.propagate(time - epoch_time)
                
                # Get position vector in AU
                position = propagated_orbit.r.to(u.au).value
                
                # Convert to list format [x, y, z]
                coordinates.append([float(position[0]), float(position[1]), float(position[2])])
                
            except Exception as e:
                logger.warning(f"Failed to propagate Earth orbit at time {time}: {str(e)}")
                # Use circular approximation as fallback
                days_from_epoch = (time - epoch_time).to(u.day).value
                angle = 2 * math.pi * days_from_epoch / 365.25  # Earth's orbital period
                x = math.cos(angle)
                y = math.sin(angle)
                z = 0.0
                coordinates.append([x, y, z])
        
        logger.info(f"Successfully calculated {len(coordinates)} Earth trajectory points")
        return coordinates
        
    except Exception as e:
        raise OrbitalCalculationError(f"Earth trajectory calculation failed: {str(e)}")


def calculate_both_trajectories(orbital_elements: OrbitalElements, num_points: int = 365) -> Dict[str, List[List[float]]]:
    """
    Calculate both asteroid and Earth trajectories.
    
    Args:
        orbital_elements: OrbitalElements object for the asteroid
        num_points: Number of coordinate points to generate (default: 365)
        
    Returns:
        Dictionary with 'asteroid_path' and 'earth_path' coordinate arrays
        
    Raises:
        OrbitalCalculationError: If trajectory calculations fail
    """
    try:
        asteroid_path = calculate_trajectory(orbital_elements, num_points)
        earth_path = get_earth_trajectory(num_points)
        
        return {
            "asteroid_path": asteroid_path,
            "earth_path": earth_path
        }
        
    except Exception as e:
        raise OrbitalCalculationError(f"Failed to calculate trajectories: {str(e)}")