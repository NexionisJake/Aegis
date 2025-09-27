"""
Impact physics calculations for asteroid collision simulations.

This module implements simplified impact physics calculations including:
- Mass calculation from diameter and density
- Kinetic energy calculation from mass and velocity
- Crater diameter estimation using simplified crater formation formulas
"""
import logging
import math
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class ImpactCalculationError(Exception):
    """Custom exception for impact calculation related errors."""
    pass


@dataclass
class ImpactParameters:
    """Data class for storing impact calculation input parameters."""
    diameter_km: float
    velocity_kps: float  # km/s
    density_kg_m3: float = 3000.0  # Default asteroid density in kg/m³


@dataclass
class ImpactResults:
    """Data class for storing impact calculation results."""
    crater_diameter_meters: float
    impact_energy_joules: float
    mass_kg: float


def validate_impact_parameters(diameter_km: float, velocity_kps: float, density_kg_m3: float = 3000.0) -> None:
    """
    Validate input parameters for impact calculations.
    
    Args:
        diameter_km: Asteroid diameter in kilometers
        velocity_kps: Impact velocity in km/s
        density_kg_m3: Asteroid density in kg/m³
        
    Raises:
        ImpactCalculationError: If parameters are invalid
    """
    if not isinstance(diameter_km, (int, float)) or not math.isfinite(diameter_km):
        raise ImpactCalculationError(f"Invalid diameter: {diameter_km}. Must be a finite number.")
    
    if diameter_km <= 0:
        raise ImpactCalculationError(f"Diameter must be positive: {diameter_km} km")
    
    if diameter_km > 1000:  # Sanity check - largest known asteroids are ~500km
        raise ImpactCalculationError(f"Diameter too large: {diameter_km} km. Maximum allowed is 1000 km.")
    
    if not isinstance(velocity_kps, (int, float)) or not math.isfinite(velocity_kps):
        raise ImpactCalculationError(f"Invalid velocity: {velocity_kps}. Must be a finite number.")
    
    if velocity_kps <= 0:
        raise ImpactCalculationError(f"Velocity must be positive: {velocity_kps} km/s")
    
    if velocity_kps > 100:  # Sanity check - typical asteroid velocities are 10-30 km/s
        raise ImpactCalculationError(f"Velocity too high: {velocity_kps} km/s. Maximum allowed is 100 km/s.")
    
    if not isinstance(density_kg_m3, (int, float)) or not math.isfinite(density_kg_m3):
        raise ImpactCalculationError(f"Invalid density: {density_kg_m3}. Must be a finite number.")
    
    if density_kg_m3 <= 0:
        raise ImpactCalculationError(f"Density must be positive: {density_kg_m3} kg/m³")
    
    if density_kg_m3 > 20000:  # Sanity check - iron meteorites are ~7800 kg/m³
        raise ImpactCalculationError(f"Density too high: {density_kg_m3} kg/m³. Maximum allowed is 20000 kg/m³.")


def calculate_mass(diameter_km: float, density_kg_m3: float = 3000.0) -> float:
    """
    Calculate asteroid mass from diameter and density assuming spherical shape.
    
    Args:
        diameter_km: Asteroid diameter in kilometers
        density_kg_m3: Asteroid density in kg/m³ (default: 3000 kg/m³)
        
    Returns:
        Mass in kilograms
        
    Raises:
        ImpactCalculationError: If calculation fails or parameters are invalid
    """
    try:
        validate_impact_parameters(diameter_km, 1.0, density_kg_m3)  # Use dummy velocity for validation
        
        # Convert diameter to meters
        diameter_m = diameter_km * 1000.0
        
        # Calculate radius in meters
        radius_m = diameter_m / 2.0
        
        # Calculate volume assuming spherical shape: V = (4/3) * π * r³
        volume_m3 = (4.0 / 3.0) * math.pi * (radius_m ** 3)
        
        # Calculate mass: mass = density * volume
        mass_kg = density_kg_m3 * volume_m3
        
        logger.info(f"Calculated mass: {mass_kg:.2e} kg for diameter {diameter_km} km")
        return mass_kg
        
    except ImpactCalculationError:
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Mass calculation failed: {str(e)}")


def calculate_kinetic_energy(mass_kg: float, velocity_kps: float) -> float:
    """
    Calculate kinetic energy from mass and velocity.
    
    Args:
        mass_kg: Mass in kilograms
        velocity_kps: Velocity in km/s
        
    Returns:
        Kinetic energy in joules
        
    Raises:
        ImpactCalculationError: If calculation fails or parameters are invalid
    """
    try:
        if not isinstance(mass_kg, (int, float)) or not math.isfinite(mass_kg):
            raise ImpactCalculationError(f"Invalid mass: {mass_kg}. Must be a finite number.")
        
        if mass_kg <= 0:
            raise ImpactCalculationError(f"Mass must be positive: {mass_kg} kg")
        
        if not isinstance(velocity_kps, (int, float)) or not math.isfinite(velocity_kps):
            raise ImpactCalculationError(f"Invalid velocity: {velocity_kps}. Must be a finite number.")
        
        if velocity_kps <= 0:
            raise ImpactCalculationError(f"Velocity must be positive: {velocity_kps} km/s")
        
        # Convert velocity to m/s
        velocity_ms = velocity_kps * 1000.0
        
        # Calculate kinetic energy: KE = (1/2) * m * v²
        kinetic_energy_j = 0.5 * mass_kg * (velocity_ms ** 2)
        
        logger.info(f"Calculated kinetic energy: {kinetic_energy_j:.2e} J for mass {mass_kg:.2e} kg and velocity {velocity_kps} km/s")
        return kinetic_energy_j
        
    except ImpactCalculationError:
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Kinetic energy calculation failed: {str(e)}")


def calculate_crater_diameter(kinetic_energy_j: float, target_density_kg_m3: float = 2500.0) -> float:
    """
    Calculate crater diameter using simplified crater formation formula.
    
    This uses a more accurate crater scaling law based on:
    D = K * (E / ρ_target * g)^(1/3.4)
    
    Where:
    - D is crater diameter
    - K is a scaling constant (~0.25 for complex craters in rock)
    - E is kinetic energy
    - ρ_target is target material density
    - g is gravitational acceleration (9.81 m/s²)
    
    Args:
        kinetic_energy_j: Kinetic energy in joules
        target_density_kg_m3: Target material density in kg/m³ (default: 2500 kg/m³ for rock)
        
    Returns:
        Crater diameter in meters
        
    Raises:
        ImpactCalculationError: If calculation fails or parameters are invalid
    """
    try:
        if not isinstance(kinetic_energy_j, (int, float)) or not math.isfinite(kinetic_energy_j):
            raise ImpactCalculationError(f"Invalid kinetic energy: {kinetic_energy_j}. Must be a finite number.")
        
        if kinetic_energy_j <= 0:
            raise ImpactCalculationError(f"Kinetic energy must be positive: {kinetic_energy_j} J")
        
        if not isinstance(target_density_kg_m3, (int, float)) or not math.isfinite(target_density_kg_m3):
            raise ImpactCalculationError(f"Invalid target density: {target_density_kg_m3}. Must be a finite number.")
        
        if target_density_kg_m3 <= 0:
            raise ImpactCalculationError(f"Target density must be positive: {target_density_kg_m3} kg/m³")
        
        # Scaling constant for complex craters (empirically derived, adjusted for better accuracy)
        scaling_constant = 0.25
        
        # Scaling exponent (empirically derived from crater studies)
        scaling_exponent = 1.0 / 3.4
        
        # Earth's gravitational acceleration
        gravity = 9.81  # m/s²
        
        # Calculate crater diameter using scaling law
        # D = K * (E / (ρ_target * g))^(1/3.4)
        energy_density_gravity_ratio = kinetic_energy_j / (target_density_kg_m3 * gravity)
        crater_diameter_m = scaling_constant * (energy_density_gravity_ratio ** scaling_exponent)
        
        logger.info(f"Calculated crater diameter: {crater_diameter_m:.2f} m for energy {kinetic_energy_j:.2e} J")
        return crater_diameter_m
        
    except ImpactCalculationError:
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Crater diameter calculation failed: {str(e)}")


def calculate_impact_effects(diameter_km: float, velocity_kps: float, 
                           asteroid_density_kg_m3: float = 3000.0,
                           target_density_kg_m3: float = 2500.0) -> ImpactResults:
    """
    Calculate complete impact effects including mass, kinetic energy, and crater diameter.
    
    Args:
        diameter_km: Asteroid diameter in kilometers
        velocity_kps: Impact velocity in km/s
        asteroid_density_kg_m3: Asteroid density in kg/m³ (default: 3000 kg/m³)
        target_density_kg_m3: Target material density in kg/m³ (default: 2500 kg/m³)
        
    Returns:
        ImpactResults object containing all calculated values
        
    Raises:
        ImpactCalculationError: If any calculation fails or parameters are invalid
    """
    try:
        # Validate all input parameters
        validate_impact_parameters(diameter_km, velocity_kps, asteroid_density_kg_m3)
        
        if not isinstance(target_density_kg_m3, (int, float)) or not math.isfinite(target_density_kg_m3):
            raise ImpactCalculationError(f"Invalid target density: {target_density_kg_m3}. Must be a finite number.")
        
        if target_density_kg_m3 <= 0:
            raise ImpactCalculationError(f"Target density must be positive: {target_density_kg_m3} kg/m³")
        
        logger.info(f"Calculating impact effects for {diameter_km} km asteroid at {velocity_kps} km/s")
        
        # Step 1: Calculate mass
        mass_kg = calculate_mass(diameter_km, asteroid_density_kg_m3)
        
        # Step 2: Calculate kinetic energy
        kinetic_energy_j = calculate_kinetic_energy(mass_kg, velocity_kps)
        
        # Step 3: Calculate crater diameter
        crater_diameter_m = calculate_crater_diameter(kinetic_energy_j, target_density_kg_m3)
        
        # Create results object
        results = ImpactResults(
            crater_diameter_meters=crater_diameter_m,
            impact_energy_joules=kinetic_energy_j,
            mass_kg=mass_kg
        )
        
        logger.info(f"Impact calculation complete: crater={crater_diameter_m:.2f}m, energy={kinetic_energy_j:.2e}J, mass={mass_kg:.2e}kg")
        return results
        
    except ImpactCalculationError:
        raise
    except Exception as e:
        raise ImpactCalculationError(f"Impact effects calculation failed: {str(e)}")


def format_impact_results(results: ImpactResults) -> Dict[str, Any]:
    """
    Format impact results for API response.
    
    Args:
        results: ImpactResults object
        
    Returns:
        Dictionary with formatted results for JSON response
    """
    crater_diameter_m = round(results.crater_diameter_meters, 2)
    crater_diameter_km = round(crater_diameter_m / 1000.0, 4)
    
    return {
        "craterDiameterMeters": crater_diameter_m,
        "impactEnergyJoules": results.impact_energy_joules,
        "massKg": results.mass_kg,
        "craterDiameterKm": crater_diameter_km,
        "impactEnergyMegatons": round(results.impact_energy_joules / 4.184e15, 2)  # Convert to megatons TNT equivalent
    }