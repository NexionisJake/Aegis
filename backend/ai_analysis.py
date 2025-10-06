import google.generativeai as genai
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class AsteroidImpactAnalyzer:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            self.ai_available = True
        else:
            logger.warning("GEMINI_API_KEY not found. AI analysis will use fallback mode.")
            self.ai_available = False
    
    def analyze_impact(self, asteroid_data: Dict[str, Any], impact_results: Dict[str, Any], location: str) -> str:
        """Generate AI analysis of asteroid impact using Gemini"""
        
        if not self.ai_available:
            return self._fallback_analysis(asteroid_data, impact_results, location)
        
        prompt = f"""
        Analyze this asteroid impact scenario and provide a comprehensive assessment:

        **Asteroid Information:**
        - Name: {asteroid_data.get('name', 'Unknown')}
        - Diameter: {asteroid_data.get('diameter_km', 'Unknown')} km
        - Velocity: {asteroid_data.get('velocity_kps', 'Unknown')} km/s
        - Mass: {asteroid_data.get('mass_kg', 'Unknown')} kg
        - Is Potentially Hazardous: {asteroid_data.get('is_potentially_hazardous', 'Unknown')}

        **Impact Results:**
        - Location: {location}
        - Crater Diameter: {impact_results.get('craterDiameterMeters', 0)} meters
        - Impact Energy: {impact_results.get('impactEnergyMegatons', 0)} megatons TNT equivalent
        - Impact Energy (Joules): {impact_results.get('impactEnergyJoules', 0)} J

        Please provide:
        1. **Severity Assessment**: Rate the impact severity (1-10 scale)
        2. **Immediate Effects**: What would happen in the first minutes/hours
        3. **Regional Impact**: Effects within 100-500km radius
        4. **Global Consequences**: Potential worldwide effects
        5. **Historical Comparisons**: Compare to known events (Tunguska, Chicxulub, nuclear weapons)
        6. **Survival Recommendations**: What should people do if this were to happen
        7. **Scientific Significance**: What we could learn from such an event

        Keep the analysis scientific but accessible. Use specific numbers and comparisons.
        Format your response with clear sections using ** for headers.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._fallback_analysis(asteroid_data, impact_results, location)
    
    def _fallback_analysis(self, asteroid_data: Dict[str, Any], impact_results: Dict[str, Any], location: str) -> str:
        """Fallback analysis when AI is unavailable"""
        energy_mt = impact_results.get('impactEnergyMegatons', 0)
        crater_km = impact_results.get('craterDiameterMeters', 0) / 1000
        diameter_km = asteroid_data.get('diameter_km', 0)
        
        # Determine severity based on energy
        if energy_mt > 1000000:  # > 1 million megatons
            severity = "10/10 - Extinction-level event"
            comparison = "Similar to the Chicxulub impactor that ended the dinosaurs"
            immediate_effects = "Global atmospheric disruption, massive tsunamis if ocean impact"
            regional_effects = "Complete devastation across continents"
            global_effects = "Nuclear winter, mass extinction event"
        elif energy_mt > 100000:  # > 100k megatons
            severity = "9/10 - Global catastrophe"
            comparison = "Thousands of times more powerful than the largest nuclear weapons"
            immediate_effects = "Massive fireball, seismic activity equivalent to magnitude 8+ earthquake"
            regional_effects = "Destruction across multiple countries, climate disruption"
            global_effects = "Significant climate change, crop failures worldwide"
        elif energy_mt > 10000:  # > 10k megatons
            severity = "8/10 - Continental disaster"
            comparison = "Equivalent to multiple large volcanic eruptions"
            immediate_effects = "Devastating blast wave, massive crater formation"
            regional_effects = "Destruction across entire regions, atmospheric effects"
            global_effects = "Temporary climate cooling, economic disruption"
        elif energy_mt > 1000:  # > 1k megatons
            severity = "7/10 - Regional disaster"
            comparison = "Comparable to the largest volcanic eruptions in history"
            immediate_effects = "Intense heat, blast wave destroying cities"
            regional_effects = "Major infrastructure damage across countries"
            global_effects = "Minimal global effects, regional climate disruption"
        elif energy_mt > 100:  # > 100 megatons
            severity = "6/10 - Major impact"
            comparison = "Similar to the largest hydrogen bombs"
            immediate_effects = "Significant blast damage, intense heat"
            regional_effects = "City-level destruction, widespread damage"
            global_effects = "Limited global impact"
        elif energy_mt > 10:  # > 10 megatons
            severity = "5/10 - Significant impact"
            comparison = "Comparable to large nuclear weapons"
            immediate_effects = "Major explosion, significant crater"
            regional_effects = "Damage across metropolitan areas"
            global_effects = "Negligible global effects"
        elif energy_mt > 1:  # > 1 megaton
            severity = "4/10 - Moderate impact"
            comparison = "Similar to tactical nuclear weapons"
            immediate_effects = "Local destruction, crater formation"
            regional_effects = "Damage to nearby cities and towns"
            global_effects = "No global effects"
        else:
            severity = "1-3/10 - Local impact"
            comparison = "Similar to large conventional explosions"
            immediate_effects = "Local blast damage and crater"
            regional_effects = "Limited to immediate vicinity"
            global_effects = "No significant effects"
        
        return f"""
**Impact Analysis for {asteroid_data.get('name', 'Unknown Asteroid')}**

**Severity Assessment**: {severity}

**Asteroid Characteristics**:
- Diameter: {diameter_km:.3f} km
- Crater Size: {crater_km:.1f} km diameter
- Energy Released: {energy_mt:,.0f} megatons TNT equivalent

**Immediate Effects**: {immediate_effects}

**Regional Impact**: {regional_effects}

**Global Consequences**: {global_effects}

**Historical Comparison**: {comparison}

**Survival Recommendations**: 
- If within 100km: Immediate evacuation required
- If within 1000km: Prepare for significant seismic activity and potential debris
- Global: Monitor for atmospheric effects and climate changes

**Scientific Significance**: 
This impact would provide valuable data on asteroid composition, atmospheric entry effects, and crater formation processes. The event would be studied for decades to improve planetary defense strategies.

**Note**: This is a basic assessment based on impact energy calculations. Full AI analysis requires Gemini API configuration.
        """