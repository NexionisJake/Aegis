"""
Unit tests for impact calculation functionality.
"""
import pytest
import math
from impact_calculator import (
    ImpactCalculationError,
    ImpactParameters,
    ImpactResults,
    validate_impact_parameters,
    calculate_mass,
    calculate_kinetic_energy,
    calculate_crater_diameter,
    calculate_impact_effects,
    format_impact_results
)


class TestValidateImpactParameters:
    """Test parameter validation functionality."""
    
    def test_valid_parameters(self):
        """Test validation with valid parameters."""
        # Should not raise any exception
        validate_impact_parameters(1.0, 20.0, 3000.0)
        validate_impact_parameters(0.1, 10.0, 2500.0)
        validate_impact_parameters(100.0, 30.0, 5000.0)
    
    def test_invalid_diameter(self):
        """Test validation with invalid diameter values."""
        # Negative diameter
        with pytest.raises(ImpactCalculationError, match="Diameter must be positive"):
            validate_impact_parameters(-1.0, 20.0, 3000.0)
        
        # Zero diameter
        with pytest.raises(ImpactCalculationError, match="Diameter must be positive"):
            validate_impact_parameters(0.0, 20.0, 3000.0)
        
        # Too large diameter
        with pytest.raises(ImpactCalculationError, match="Diameter too large"):
            validate_impact_parameters(1500.0, 20.0, 3000.0)
        
        # Non-finite diameter
        with pytest.raises(ImpactCalculationError, match="Invalid diameter"):
            validate_impact_parameters(float('inf'), 20.0, 3000.0)
        
        with pytest.raises(ImpactCalculationError, match="Invalid diameter"):
            validate_impact_parameters(float('nan'), 20.0, 3000.0)
    
    def test_invalid_velocity(self):
        """Test validation with invalid velocity values."""
        # Negative velocity
        with pytest.raises(ImpactCalculationError, match="Velocity must be positive"):
            validate_impact_parameters(1.0, -20.0, 3000.0)
        
        # Zero velocity
        with pytest.raises(ImpactCalculationError, match="Velocity must be positive"):
            validate_impact_parameters(1.0, 0.0, 3000.0)
        
        # Too high velocity
        with pytest.raises(ImpactCalculationError, match="Velocity too high"):
            validate_impact_parameters(1.0, 150.0, 3000.0)
        
        # Non-finite velocity
        with pytest.raises(ImpactCalculationError, match="Invalid velocity"):
            validate_impact_parameters(1.0, float('inf'), 3000.0)
    
    def test_invalid_density(self):
        """Test validation with invalid density values."""
        # Negative density
        with pytest.raises(ImpactCalculationError, match="Density must be positive"):
            validate_impact_parameters(1.0, 20.0, -3000.0)
        
        # Zero density
        with pytest.raises(ImpactCalculationError, match="Density must be positive"):
            validate_impact_parameters(1.0, 20.0, 0.0)
        
        # Too high density
        with pytest.raises(ImpactCalculationError, match="Density too high"):
            validate_impact_parameters(1.0, 20.0, 25000.0)
        
        # Non-finite density
        with pytest.raises(ImpactCalculationError, match="Invalid density"):
            validate_impact_parameters(1.0, 20.0, float('nan'))


class TestCalculateMass:
    """Test mass calculation functionality."""
    
    def test_calculate_mass_basic(self):
        """Test basic mass calculation."""
        # Test with 1 km diameter sphere
        diameter_km = 1.0
        density_kg_m3 = 3000.0
        
        mass = calculate_mass(diameter_km, density_kg_m3)
        
        # Expected calculation:
        # radius = 500 m
        # volume = (4/3) * π * (500)³ = 5.236e8 m³
        # mass = 3000 * 5.236e8 = 1.571e12 kg
        expected_mass = (4.0/3.0) * math.pi * (500.0**3) * 3000.0
        
        assert abs(mass - expected_mass) < 1e6  # Allow small floating point errors
        assert mass > 0
    
    def test_calculate_mass_different_sizes(self):
        """Test mass calculation with different asteroid sizes."""
        density = 3000.0
        
        # Small asteroid (100m diameter)
        mass_small = calculate_mass(0.1, density)
        
        # Medium asteroid (1km diameter)
        mass_medium = calculate_mass(1.0, density)
        
        # Large asteroid (10km diameter)
        mass_large = calculate_mass(10.0, density)
        
        # Mass should scale with diameter cubed
        assert mass_medium / mass_small == pytest.approx(1000.0, rel=1e-3)  # 10³
        assert mass_large / mass_medium == pytest.approx(1000.0, rel=1e-3)  # 10³
    
    def test_calculate_mass_different_densities(self):
        """Test mass calculation with different densities."""
        diameter = 1.0
        
        # Low density (carbonaceous)
        mass_low = calculate_mass(diameter, 1500.0)
        
        # Medium density (stony)
        mass_medium = calculate_mass(diameter, 3000.0)
        
        # High density (metallic)
        mass_high = calculate_mass(diameter, 7800.0)
        
        # Mass should scale linearly with density
        assert mass_medium / mass_low == pytest.approx(2.0, rel=1e-3)
        assert mass_high / mass_medium == pytest.approx(7800.0/3000.0, rel=1e-3)
    
    def test_calculate_mass_invalid_parameters(self):
        """Test mass calculation with invalid parameters."""
        with pytest.raises(ImpactCalculationError):
            calculate_mass(-1.0, 3000.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_mass(1.0, -3000.0)


class TestCalculateKineticEnergy:
    """Test kinetic energy calculation functionality."""
    
    def test_calculate_kinetic_energy_basic(self):
        """Test basic kinetic energy calculation."""
        mass_kg = 1e12  # 1 trillion kg
        velocity_kps = 20.0  # 20 km/s
        
        energy = calculate_kinetic_energy(mass_kg, velocity_kps)
        
        # Expected: KE = 0.5 * m * v²
        # KE = 0.5 * 1e12 * (20000)² = 2e20 J
        expected_energy = 0.5 * mass_kg * (velocity_kps * 1000.0) ** 2
        
        assert energy == pytest.approx(expected_energy, rel=1e-10)
        assert energy > 0
    
    def test_calculate_kinetic_energy_velocity_scaling(self):
        """Test kinetic energy scaling with velocity."""
        mass = 1e12
        
        # Different velocities
        energy_10 = calculate_kinetic_energy(mass, 10.0)
        energy_20 = calculate_kinetic_energy(mass, 20.0)
        energy_30 = calculate_kinetic_energy(mass, 30.0)
        
        # Energy should scale with velocity squared
        assert energy_20 / energy_10 == pytest.approx(4.0, rel=1e-3)  # (20/10)²
        assert energy_30 / energy_10 == pytest.approx(9.0, rel=1e-3)  # (30/10)²
    
    def test_calculate_kinetic_energy_mass_scaling(self):
        """Test kinetic energy scaling with mass."""
        velocity = 20.0
        
        # Different masses
        energy_1 = calculate_kinetic_energy(1e12, velocity)
        energy_2 = calculate_kinetic_energy(2e12, velocity)
        energy_10 = calculate_kinetic_energy(10e12, velocity)
        
        # Energy should scale linearly with mass
        assert energy_2 / energy_1 == pytest.approx(2.0, rel=1e-3)
        assert energy_10 / energy_1 == pytest.approx(10.0, rel=1e-3)
    
    def test_calculate_kinetic_energy_invalid_parameters(self):
        """Test kinetic energy calculation with invalid parameters."""
        with pytest.raises(ImpactCalculationError):
            calculate_kinetic_energy(-1e12, 20.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_kinetic_energy(1e12, -20.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_kinetic_energy(float('nan'), 20.0)


class TestCalculateCraterDiameter:
    """Test crater diameter calculation functionality."""
    
    def test_calculate_crater_diameter_basic(self):
        """Test basic crater diameter calculation."""
        kinetic_energy = 2e20  # 2e20 J
        target_density = 2500.0  # kg/m³
        
        diameter = calculate_crater_diameter(kinetic_energy, target_density)
        
        # Expected using scaling law: D = 0.25 * (E / (ρ * g))^(1/3.4)
        gravity = 9.81
        energy_density_gravity_ratio = kinetic_energy / (target_density * gravity)
        expected_diameter = 0.25 * (energy_density_gravity_ratio ** (1.0/3.4))
        
        assert diameter == pytest.approx(expected_diameter, rel=1e-10)
        assert diameter > 0
    
    def test_calculate_crater_diameter_energy_scaling(self):
        """Test crater diameter scaling with energy."""
        target_density = 2500.0
        
        # Different energies
        diameter_1 = calculate_crater_diameter(1e20, target_density)
        diameter_2 = calculate_crater_diameter(2e20, target_density)
        diameter_10 = calculate_crater_diameter(10e20, target_density)
        
        # Diameter should scale with energy^(1/3.4)
        expected_ratio_2 = 2.0 ** (1.0/3.4)
        expected_ratio_10 = 10.0 ** (1.0/3.4)
        
        assert diameter_2 / diameter_1 == pytest.approx(expected_ratio_2, rel=1e-3)
        assert diameter_10 / diameter_1 == pytest.approx(expected_ratio_10, rel=1e-3)
    
    def test_calculate_crater_diameter_density_scaling(self):
        """Test crater diameter scaling with target density."""
        energy = 2e20
        
        # Different target densities
        diameter_low = calculate_crater_diameter(energy, 1000.0)
        diameter_medium = calculate_crater_diameter(energy, 2500.0)
        diameter_high = calculate_crater_diameter(energy, 5000.0)
        
        # Diameter should scale inversely with density^(1/3.4)
        expected_ratio_medium = (1000.0/2500.0) ** (1.0/3.4)
        expected_ratio_high = (1000.0/5000.0) ** (1.0/3.4)
        
        assert diameter_medium / diameter_low == pytest.approx(expected_ratio_medium, rel=1e-3)
        assert diameter_high / diameter_low == pytest.approx(expected_ratio_high, rel=1e-3)
    
    def test_calculate_crater_diameter_invalid_parameters(self):
        """Test crater diameter calculation with invalid parameters."""
        with pytest.raises(ImpactCalculationError):
            calculate_crater_diameter(-1e20, 2500.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_crater_diameter(1e20, -2500.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_crater_diameter(float('inf'), 2500.0)


class TestCalculateImpactEffects:
    """Test complete impact effects calculation."""
    
    def test_calculate_impact_effects_apophis_scenario(self):
        """Test impact calculation with Apophis-like parameters."""
        # Apophis parameters (approximate)
        diameter_km = 0.37  # 370 meters
        velocity_kps = 19.0  # 19 km/s
        asteroid_density = 3000.0  # kg/m³
        target_density = 2500.0  # kg/m³
        
        results = calculate_impact_effects(diameter_km, velocity_kps, asteroid_density, target_density)
        
        # Verify results structure
        assert isinstance(results, ImpactResults)
        assert results.mass_kg > 0
        assert results.impact_energy_joules > 0
        assert results.crater_diameter_meters > 0
        
        # Verify reasonable magnitudes for Apophis
        assert 1e10 < results.mass_kg < 1e12  # Should be tens to hundreds of billions of kg
        assert 1e18 < results.impact_energy_joules < 1e21  # Should be in the exajoule range
        assert 1000 < results.crater_diameter_meters < 20000  # Should be several km crater
    
    def test_calculate_impact_effects_small_asteroid(self):
        """Test impact calculation with small asteroid."""
        diameter_km = 0.01  # 10 meters
        velocity_kps = 15.0
        
        results = calculate_impact_effects(diameter_km, velocity_kps)
        
        assert results.mass_kg > 0
        assert results.impact_energy_joules > 0
        assert results.crater_diameter_meters > 0
        
        # Small asteroid should produce smaller effects
        assert results.mass_kg < 1e8  # Less than 100 million kg
        assert results.crater_diameter_meters < 500  # Less than 500m crater
    
    def test_calculate_impact_effects_large_asteroid(self):
        """Test impact calculation with large asteroid."""
        diameter_km = 10.0  # 10 km (dinosaur killer size)
        velocity_kps = 25.0
        
        results = calculate_impact_effects(diameter_km, velocity_kps)
        
        assert results.mass_kg > 0
        assert results.impact_energy_joules > 0
        assert results.crater_diameter_meters > 0
        
        # Large asteroid should produce massive effects
        assert results.mass_kg > 1e15  # More than quadrillion kg
        assert results.crater_diameter_meters > 100000  # More than 100 km crater
    
    def test_calculate_impact_effects_invalid_parameters(self):
        """Test impact effects calculation with invalid parameters."""
        with pytest.raises(ImpactCalculationError):
            calculate_impact_effects(-1.0, 20.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_impact_effects(1.0, -20.0)
        
        with pytest.raises(ImpactCalculationError):
            calculate_impact_effects(1.0, 20.0, -3000.0)


class TestFormatImpactResults:
    """Test impact results formatting functionality."""
    
    def test_format_impact_results_basic(self):
        """Test basic results formatting."""
        results = ImpactResults(
            crater_diameter_meters=5000.0,
            impact_energy_joules=1e20,
            mass_kg=1e12
        )
        
        formatted = format_impact_results(results)
        
        # Check required fields
        assert "craterDiameterMeters" in formatted
        assert "impactEnergyJoules" in formatted
        assert "massKg" in formatted
        assert "craterDiameterKm" in formatted
        assert "impactEnergyMegatons" in formatted
        
        # Check values
        assert formatted["craterDiameterMeters"] == 5000.0
        assert formatted["impactEnergyJoules"] == 1e20
        assert formatted["massKg"] == 1e12
        assert formatted["craterDiameterKm"] == 5.0  # 5000m = 5km
        
        # Check TNT equivalent conversion (1 megaton = 4.184e15 J)
        expected_megatons = 1e20 / 4.184e15
        assert formatted["impactEnergyMegatons"] == pytest.approx(expected_megatons, rel=1e-2)
    
    def test_format_impact_results_rounding(self):
        """Test results formatting with proper rounding."""
        results = ImpactResults(
            crater_diameter_meters=1234.5678,
            impact_energy_joules=9.876543e19,
            mass_kg=5.432109e11
        )
        
        formatted = format_impact_results(results)
        
        # Check rounding
        assert formatted["craterDiameterMeters"] == 1234.57  # Rounded to 2 decimal places
        assert formatted["craterDiameterKm"] == 1.2346  # Rounded to 4 decimal places
        assert isinstance(formatted["impactEnergyMegatons"], float)


class TestKnownScenarios:
    """Test with known impact scenarios for validation."""
    
    def test_tunguska_event_approximation(self):
        """Test calculation approximating the Tunguska event."""
        # Tunguska event: ~50m diameter, ~15 km/s, ~15 MT yield
        diameter_km = 0.05  # 50 meters
        velocity_kps = 15.0
        
        results = calculate_impact_effects(diameter_km, velocity_kps)
        formatted = format_impact_results(results)
        
        # Tunguska was an airburst, so crater comparison isn't direct,
        # but energy should be in the right ballpark (10-20 MT)
        assert 5.0 < formatted["impactEnergyMegatons"] < 50.0
    
    def test_chicxulub_approximation(self):
        """Test calculation approximating the Chicxulub impactor."""
        # Chicxulub impactor: ~10km diameter, ~20 km/s
        diameter_km = 10.0
        velocity_kps = 20.0
        
        results = calculate_impact_effects(diameter_km, velocity_kps)
        formatted = format_impact_results(results)
        
        # Should produce massive energy (millions of megatons)
        assert formatted["impactEnergyMegatons"] > 1e6  # More than 1 million MT
        
        # Chicxulub crater is ~150km diameter
        assert 50000 < results.crater_diameter_meters < 500000  # 50-500 km range


if __name__ == "__main__":
    pytest.main([__file__])