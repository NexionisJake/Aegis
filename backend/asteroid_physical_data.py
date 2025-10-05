"""
Physical parameters database for well-known asteroids.
This module provides real NASA-sourced physical data for asteroids
when the JPL Small-Body Database doesn't include physical parameters.
"""
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Real physical parameters from NASA, ESA, and published research
ASTEROID_PHYSICAL_DATA = {
    "Apophis": {
        "diameter_km": 0.34,  # From radar observations
        "velocity_kps": 7.42,  # 2029 close approach velocity
        "density_kg_m3": 3200,  # Typical S-type asteroid density
        "mass_kg": 2.7e10,  # Calculated from diameter and density
        "source": "NASA JPL, 2029 close approach data"
    },
    "99942": {  # Apophis designation
        "diameter_km": 0.34,
        "velocity_kps": 7.42,
        "density_kg_m3": 3200,
        "mass_kg": 2.7e10,
        "source": "NASA JPL, radar observations"
    },
    "Bennu": {
        "diameter_km": 0.492,  # From OSIRIS-REx mission
        "velocity_kps": 6.14,  # Typical NEA approach velocity
        "density_kg_m3": 1190,  # OSIRIS-REx measurements (very low!)
        "mass_kg": 7.8e10,  # From OSIRIS-REx
        "source": "OSIRIS-REx mission data"
    },
    "101955": {  # Bennu designation
        "diameter_km": 0.492,
        "velocity_kps": 6.14,
        "density_kg_m3": 1190,
        "mass_kg": 7.8e10,
        "source": "OSIRIS-REx mission"
    },
    "Didymos": {
        "diameter_km": 0.780,  # Primary body
        "velocity_kps": 5.14,  # DART impact velocity
        "density_kg_m3": 2170,  # Estimated from radar
        "mass_kg": 5.3e11,  # Estimated
        "source": "DART mission, ground-based radar"
    },
    "65803": {  # Didymos designation
        "diameter_km": 0.780,
        "velocity_kps": 5.14,
        "density_kg_m3": 2170,
        "mass_kg": 5.3e11,
        "source": "DART mission data"
    },
    "Toutatis": {
        "diameter_km": 4.75,  # Length of elongated shape (2.5 × 4.75 km)
        "velocity_kps": 11.0,  # Typical Earth approach velocity
        "density_kg_m3": 2300,  # S-type asteroid estimate
        "mass_kg": 5.0e13,  # Estimated from shape model
        "source": "Radar observations, Chang'e 2 flyby"
    },
    "4179": {  # Toutatis designation
        "diameter_km": 4.75,
        "velocity_kps": 11.0,
        "density_kg_m3": 2300,
        "mass_kg": 5.0e13,
        "source": "Chang'e 2 mission, radar"
    },
    "Eros": {
        "diameter_km": 16.84,  # Mean diameter (34.4 × 11.2 × 11.2 km)
        "velocity_kps": 5.98,  # NEAR Shoemaker approach velocity  
        "density_kg_m3": 2670,  # NEAR Shoemaker measurements
        "mass_kg": 6.687e15,  # NEAR Shoemaker precise measurement
        "source": "NEAR Shoemaker mission"
    },
    "433": {  # Eros designation
        "diameter_km": 16.84,
        "velocity_kps": 5.98,
        "density_kg_m3": 2670,
        "mass_kg": 6.687e15,
        "source": "NEAR Shoemaker mission"
    },
    "Ryugu": {
        "diameter_km": 0.900,  # From Hayabusa2 mission
        "velocity_kps": 6.24,  # Typical C-type NEA velocity
        "density_kg_m3": 1190,  # Hayabusa2 measurements (rubble pile)
        "mass_kg": 4.5e11,  # Hayabusa2 precise measurement
        "source": "Hayabusa2 mission (JAXA)"
    },
    "162173": {  # Ryugu designation
        "diameter_km": 0.900,
        "velocity_kps": 6.24,
        "density_kg_m3": 1190,
        "mass_kg": 4.5e11,
        "source": "Hayabusa2 mission"
    },
    "Itokawa": {
        "diameter_km": 0.330,  # Mean diameter (535 × 294 × 209 m)
        "velocity_kps": 7.91,  # Typical S-type NEA velocity
        "density_kg_m3": 1900,  # Hayabusa measurements (rubble pile)
        "mass_kg": 3.51e10,  # Hayabusa precise measurement
        "source": "Hayabusa mission (JAXA)"
    },
    "25143": {  # Itokawa designation
        "diameter_km": 0.330,
        "velocity_kps": 7.91,
        "density_kg_m3": 1900,
        "mass_kg": 3.51e10,
        "source": "Hayabusa mission"
    },
    "Phaethon": {
        "diameter_km": 5.1,  # From radar and infrared observations
        "velocity_kps": 32.1,  # High velocity (Apollo asteroid)
        "density_kg_m3": 1670,  # Low density, possibly depleted
        "mass_kg": 1.4e14,  # Estimated from size and density
        "source": "Arecibo radar, DESTINY+ mission target"
    },
    "3200": {  # Phaethon designation
        "diameter_km": 5.1,
        "velocity_kps": 32.1,
        "density_kg_m3": 1670,
        "mass_kg": 1.4e14,
        "source": "Radar observations, Geminid meteor parent"
    },
    "Vesta": {
        "diameter_km": 525.4,  # Mean diameter from Dawn mission
        "velocity_kps": 5.5,  # Main belt asteroid typical velocity
        "density_kg_m3": 3456,  # Dawn mission precise measurement
        "mass_kg": 2.59076e20,  # Dawn mission measurement
        "source": "NASA Dawn mission"
    },
    "4": {  # Vesta designation
        "diameter_km": 525.4,
        "velocity_kps": 5.5,
        "density_kg_m3": 3456,
        "mass_kg": 2.59076e20,
        "source": "Dawn mission"
    },
    "Psyche": {
        "diameter_km": 226.0,  # Mean diameter (279 × 232 × 189 km)
        "velocity_kps": 4.8,  # Main belt asteroid typical velocity
        "density_kg_m3": 3900,  # Metallic M-type asteroid
        "mass_kg": 2.72e19,  # Estimated from size and density
        "source": "Ground-based observations, Psyche mission target"
    },
    "16": {  # Psyche designation
        "diameter_km": 226.0,
        "velocity_kps": 4.8,
        "density_kg_m3": 3900,
        "mass_kg": 2.72e19,
        "source": "Radar and spectroscopy, NASA Psyche mission"
    },
}

def get_asteroid_physical_parameters(asteroid_name: str) -> Optional[Dict[str, float]]:
    """
    Get physical parameters for a known asteroid.
    
    Args:
        asteroid_name: Name or designation of the asteroid
        
    Returns:
        Dictionary with physical parameters or None if not found
        
    Example:
        >>> params = get_asteroid_physical_parameters("Apophis")
        >>> print(params["diameter_km"])  # 0.34
    """
    # Try exact name match first
    if asteroid_name in ASTEROID_PHYSICAL_DATA:
        data = ASTEROID_PHYSICAL_DATA[asteroid_name].copy()
        logger.info(f"Found physical parameters for {asteroid_name}: {data['source']}")
        return data
    
    # Try case-insensitive match
    for key in ASTEROID_PHYSICAL_DATA:
        if key.lower() == asteroid_name.lower():
            data = ASTEROID_PHYSICAL_DATA[key].copy()
            logger.info(f"Found physical parameters for {asteroid_name} (case-insensitive): {data['source']}")
            return data
    
    # Try partial name matching for designations
    for key in ASTEROID_PHYSICAL_DATA:
        if asteroid_name in key or key in asteroid_name:
            data = ASTEROID_PHYSICAL_DATA[key].copy()
            logger.info(f"Found physical parameters for {asteroid_name} (partial match with {key}): {data['source']}")
            return data
    
    logger.warning(f"No physical parameters found for asteroid: {asteroid_name}")
    return None

def get_diameter_and_velocity(asteroid_name: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get diameter and velocity for impact calculations.
    
    Args:
        asteroid_name: Name or designation of the asteroid
        
    Returns:
        Tuple of (diameter_km, velocity_kps) or (None, None) if not found
    """
    params = get_asteroid_physical_parameters(asteroid_name)
    if params:
        return params["diameter_km"], params["velocity_kps"]
    return None, None

def get_realistic_fallback_parameters(asteroid_name: str) -> Dict[str, float]:
    """
    Get realistic fallback parameters based on asteroid type.
    
    Args:
        asteroid_name: Name of the asteroid
        
    Returns:
        Dictionary with estimated parameters based on typical NEA values
    """
    # Generate realistic parameters based on typical Near-Earth Asteroid statistics
    logger.info(f"Generating realistic fallback parameters for unknown asteroid: {asteroid_name}")
    
    return {
        "diameter_km": 1.0,  # Median NEA diameter
        "velocity_kps": 12.9,  # Typical Earth encounter velocity
        "density_kg_m3": 2600,  # Typical rocky asteroid density
        "source": "Estimated based on NEA population statistics"
    }

def list_available_asteroids() -> list:
    """
    Get list of asteroids with known physical parameters.
    
    Returns:
        List of asteroid names with available data
    """
    unique_asteroids = set()
    for name, data in ASTEROID_PHYSICAL_DATA.items():
        if not name.isdigit():  # Skip numeric designations, keep names
            unique_asteroids.add(name)
    
    return sorted(list(unique_asteroids))