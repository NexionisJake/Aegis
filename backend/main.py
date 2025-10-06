from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import Dict, Any
from dotenv import load_dotenv
import os
import logging
import traceback # Add traceback for detailed error logging
from .nasa_client import get_asteroid_data, get_neo_browse_data, get_close_approach_data, NASAAPIError
# Defer heavy scientific stack imports (numpy/scipy/astropy/poliastro) so basic endpoints work even if broken.
HEAVY_LIBS_AVAILABLE = True
HEAVY_IMPORT_ERROR = None
try:
    from .orbital_calculator import (
        extract_orbital_elements,
        calculate_both_trajectories,
        OrbitalCalculationError
    )
    from .impact_calculator import (
        calculate_impact_effects,
        format_impact_results,
        ImpactCalculationError
    )
    from .asteroid_physical_data import (
        get_asteroid_physical_parameters,
        get_realistic_fallback_parameters
    )
except Exception as _heavy_err:  # Broad except to allow degraded startup
    HEAVY_LIBS_AVAILABLE = False
    HEAVY_IMPORT_ERROR = str(_heavy_err)
    # Provide lightweight placeholder exceptions so endpoint code still compiles
    class ImpactCalculationError(Exception):
        pass
    class OrbitalCalculationError(Exception):
        pass
    # Log at import time for visibility
    logging.basicConfig(level=logging.INFO)
    logging.getLogger(__name__).warning(
        "Heavy scientific dependencies failed to import. Running in DEGRADED mode. "
        f"Endpoints requiring orbital or impact calculations will return 503. Root error: {HEAVY_IMPORT_ERROR}"
    )
from .error_handlers import (
    global_exception_handler,
    handle_api_errors,
    create_error_response,
    map_error_to_http_status
)
from .ai_analysis import AsteroidImpactAnalyzer
from datetime import datetime

# Load environment variables explicitly from backend/.env if present (works when run from project root or other cwd)
from pathlib import Path
_env_path = Path(__file__).parent / '.env'
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    # Fallback to default search
    load_dotenv()

# NASA API key fallback to DEMO_KEY if not provided
if not os.getenv("NASA_API_KEY") or os.getenv("NASA_API_KEY") == "your_nasa_api_key_here":
    os.environ["NASA_API_KEY"] = "DEMO_KEY"  # low rate limits but prevents hard failure
    logging.getLogger(__name__).warning("NASA_API_KEY not set. Falling back to DEMO_KEY (rate-limited). Set a real key in backend/.env for production.")
else:
    logging.getLogger(__name__).info(f"NASA_API_KEY loaded: {os.getenv('NASA_API_KEY')[:10]}... (truncated)")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Project Aegis API", version="1.0.0")

# Add global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# Add validation error handler
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors."""
    logger.error(f"Validation error in {request.url.path}: {exc}")
    
    error_response = create_error_response(
        status_code=422,
        message="Invalid input parameters",
        details=str(exc),
        error_code="VALIDATION_ERROR"
    )
    
    return JSONResponse(
        status_code=422,
        content=error_response
    )


# Pydantic models for request/response validation
class ImpactCalculationRequest(BaseModel):
    """Request model for impact calculation endpoint."""
    diameter_km: float = Field(..., gt=0, le=1000, description="Asteroid diameter in kilometers")
    velocity_kps: float = Field(..., gt=0, le=100, description="Impact velocity in km/s")
    asteroid_density_kg_m3: float = Field(3000.0, gt=0, le=20000, description="Asteroid density in kg/m³")
    target_density_kg_m3: float = Field(2500.0, gt=0, le=20000, description="Target material density in kg/m³")

# Get allowed origins from environment variable
def get_allowed_origins():
    """Get CORS allowed origins from environment variable or use defaults."""
    allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
    
    # Always include Vercel domain
    default_origins = [
        "https://aegis-neo.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    
    if allowed_origins_env:
        # Split by comma and strip whitespace
        origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
        # Combine with defaults and remove duplicates
        all_origins = list(set(default_origins + origins))
        return all_origins
    
    return default_origins

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),  # Use environment-based origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Project Aegis API is running"}

@app.get("/health")
async def health_check():
    nasa_api_key = os.getenv("NASA_API_KEY")
    return {
        "status": "healthy",
        "nasa_api_configured": nasa_api_key is not None and nasa_api_key != "your_nasa_api_key_here"
    }


@app.get("/api/asteroids/list")
@handle_api_errors
async def get_asteroids_list():
    """
    Get a list of real Near-Earth Objects from NASA's NEO Browse API.
    
    Returns:
        List of asteroid objects with name, designation, and description from NASA
    """
    try:
        logger.info("Fetching real NEO data from NASA API")
        
        # Fetch real NEO data from NASA
        neo_data = get_neo_browse_data(page=0, size=20)
        
        # Process the NASA data into our format
        asteroids = []
        
        if "near_earth_objects" in neo_data:
            for neo in neo_data["near_earth_objects"]:
                # Extract key information
                name = neo.get("name", "Unknown")
                designation = neo.get("designation", "")
                
                # Create description based on available data
                description_parts = []
                
                if neo.get("is_potentially_hazardous_asteroid"):
                    description_parts.append("Potentially Hazardous")
                
                # Get diameter info if available
                diameter_data = neo.get("estimated_diameter", {})
                if diameter_data.get("kilometers"):
                    min_diameter = diameter_data["kilometers"].get("estimated_diameter_min", 0)
                    max_diameter = diameter_data["kilometers"].get("estimated_diameter_max", 0)
                    avg_diameter = (min_diameter + max_diameter) / 2
                    if avg_diameter > 0:
                        description_parts.append(f"~{avg_diameter:.2f}km diameter")
                
                # Get close approach info if available
                close_approaches = neo.get("close_approach_data", [])
                if close_approaches:
                    next_approach = close_approaches[0]
                    approach_date = next_approach.get("close_approach_date", "")
                    if approach_date:
                        description_parts.append(f"Next approach: {approach_date}")
                
                description = ", ".join(description_parts) if description_parts else "Near-Earth Object"
                
                asteroids.append({
                    "name": name,
                    "designation": designation,
                    "description": description,
                    "nasa_id": neo.get("id", ""),
                    "is_potentially_hazardous": neo.get("is_potentially_hazardous_asteroid", False)
                })
        
        # Add a few well-known asteroids as fallback if we get fewer than expected
        if len(asteroids) < 10:
            famous_asteroids = [
                {"name": "Apophis", "designation": "99942", "description": "Famous for 2029 close approach", "nasa_id": "2099942", "is_potentially_hazardous": True},
                {"name": "Bennu", "designation": "101955", "description": "OSIRIS-REx sample return target", "nasa_id": "2101955", "is_potentially_hazardous": True}
            ]
            
            for famous in famous_asteroids:
                if not any(ast["name"] == famous["name"] for ast in asteroids):
                    asteroids.append(famous)
        
        logger.info(f"Successfully processed {len(asteroids)} asteroids from NASA data")
        return {"asteroids": asteroids[:15]}  # Limit to 15 for UI performance
        
    except Exception as e:
        logger.error(f"Error fetching real NEO data: {str(e)}")
        # Fallback to a minimal list if NASA API fails
        fallback_asteroids = [
            {"name": "Apophis", "designation": "99942", "description": "Close approach in 2029", "nasa_id": "2099942", "is_potentially_hazardous": True},
            {"name": "Bennu", "designation": "101955", "description": "OSIRIS-REx sample return target", "nasa_id": "2101955", "is_potentially_hazardous": True}
        ]
        return {"asteroids": fallback_asteroids}

@app.get("/api/asteroids/top-10-nearest")
@handle_api_errors
async def get_top_10_nearest():
    """
    Get orbital trajectories for asteroids with upcoming close approaches using real NASA data.
    
    Returns:
        Dictionary containing trajectories for nearest asteroids, keyed by name
    """
    try:
        logger.info("Fetching real close approach data from NASA API")
        
        trajectories = {}
        successful_calculations = 0
        
        try:
            # Get real close approach data from NASA
            close_approach_data = get_close_approach_data()
            
            # Extract asteroids from close approach data
            asteroid_candidates = []
            
            if "near_earth_objects" in close_approach_data:
                for date_key, asteroids_for_date in close_approach_data["near_earth_objects"].items():
                    for asteroid in asteroids_for_date:
                        name = asteroid.get("name", "").strip()
                        if name and name not in [a["name"] for a in asteroid_candidates]:
                            asteroid_candidates.append({
                                "name": name,
                                "close_approach_date": date_key,
                                "miss_distance": asteroid.get("close_approach_data", [{}])[0].get("miss_distance", {}).get("kilometers", float('inf'))
                            })
            
            # Sort by closest approach distance and take top 10
            asteroid_candidates.sort(key=lambda x: float(x.get("miss_distance", float('inf'))))
            top_asteroids = asteroid_candidates[:10]
            
            logger.info(f"Found {len(top_asteroids)} asteroids from close approach data")
            
        except Exception as nasa_error:
            logger.warning(f"Failed to get live NASA close approach data. Falling back to hardcoded list. Reason: {nasa_error}", exc_info=True)
            # Fallback to well-known NEOs with real NASA data - expanded to 10 asteroids
            top_asteroids = [
                {"name": "Apophis", "close_approach_date": "2029-04-13", "miss_distance": "31000"},
                {"name": "Bennu", "close_approach_date": "2025-09-25", "miss_distance": "334000"},
                {"name": "Didymos", "close_approach_date": "2026-10-05", "miss_distance": "5800000"},
                {"name": "Toutatis", "close_approach_date": "2028-11-29", "miss_distance": "18700000"},
                {"name": "Eros", "close_approach_date": "2031-01-31", "miss_distance": "23300000"},
                {"name": "Ryugu", "close_approach_date": "2027-06-15", "miss_distance": "12500000"},
                {"name": "Itokawa", "close_approach_date": "2030-03-20", "miss_distance": "7800000"},
                {"name": "Phaethon", "close_approach_date": "2026-12-14", "miss_distance": "10200000"},
                {"name": "Vesta", "close_approach_date": "2028-05-18", "miss_distance": "95000000"},
                {"name": "Psyche", "close_approach_date": "2029-07-22", "miss_distance": "180000000"}
            ]
        
        # Calculate trajectories for each asteroid
        for asteroid_info in top_asteroids:
            if successful_calculations >= 10:
                break
                
            asteroid_name_raw = asteroid_info["name"]
            # Sanitize the name: remove parentheses
            asteroid_name = asteroid_name_raw.replace("(", "").replace(")", "").strip()

            if not asteroid_name:
                continue
            
            try:
                # Fetch detailed asteroid data
                nasa_data = get_asteroid_data(asteroid_name)
                
                # Extract orbital elements
                orbital_elements = extract_orbital_elements(nasa_data)
                
                # Calculate trajectories
                trajectory_data = calculate_both_trajectories(orbital_elements, num_points=365)
                trajectories[asteroid_name] = trajectory_data
                successful_calculations += 1
                
                logger.info(f"Successfully calculated trajectory for {asteroid_name}")
                
            except Exception as e:
                logger.warning(f"Failed to calculate trajectory for {asteroid_name}: {str(e)}")
                continue
        
        logger.info(f"Successfully calculated trajectories for {successful_calculations} asteroids")
        
        # If we got very few results, add guaranteed scientifically important asteroids
        if successful_calculations < 5:
            guaranteed_asteroids = ["Apophis", "Bennu", "Didymos", "Ryugu", "Eros"]
            for guaranteed_name in guaranteed_asteroids:
                if guaranteed_name not in trajectories and successful_calculations < 10:
                    try:
                        nasa_data = get_asteroid_data(guaranteed_name)
                        orbital_elements = extract_orbital_elements(nasa_data)
                        trajectory_data = calculate_both_trajectories(orbital_elements, num_points=365)
                        trajectories[guaranteed_name] = trajectory_data
                        successful_calculations += 1
                        logger.info(f"Added guaranteed asteroid: {guaranteed_name}")
                    except Exception as e:
                        logger.warning(f"Failed to add guaranteed asteroid {guaranteed_name}: {str(e)}")
        
        return trajectories
        
    except Exception as e:
        logger.error(f"Error calculating nearest asteroids: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate asteroid trajectories")

@app.get("/api/asteroid/{asteroid_name}")
@handle_api_errors
async def get_asteroid(asteroid_name: str):
    """
    Fetch asteroid data from NASA JPL Small-Body Database.
    
    Args:
        asteroid_name: Name or designation of the asteroid (e.g., "Apophis", "99942")
        
    Returns:
        Complete NASA API response containing orbital and physical parameters
        
    Raises:
        HTTPException: 404 if asteroid not found, 500 for other API errors
    """
    try:
        logger.info(f"API request for asteroid: {asteroid_name}")
        data = get_asteroid_data(asteroid_name)
        return data
        
    except NASAAPIError as e:
        error_message = str(e)
        logger.error(f"NASA API error for {asteroid_name}: {error_message}")
        
        # Return appropriate HTTP status codes based on error type
        if "not found" in error_message.lower():
            raise HTTPException(status_code=404, detail=error_message)
        elif "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail=error_message)
        elif "timeout" in error_message.lower():
            raise HTTPException(status_code=504, detail=error_message)
        else:
            raise HTTPException(status_code=500, detail=f"Failed to fetch asteroid data: {error_message}")
    
    except Exception as e:
        logger.error(f"Unexpected error for {asteroid_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/trajectory/{asteroid_name}")
@handle_api_errors
async def get_trajectory(request: Request, asteroid_name: str):
    """
    Calculate and return orbital trajectory for an asteroid and Earth.
    
    Args:
        request: The incoming request object.
        asteroid_name: Name or designation of the asteroid (e.g., "Apophis", "99942")
        
    Returns:
        Dictionary containing asteroid_path, earth_path, and orbital metadata
        
    Raises:
        HTTPException: 404 if asteroid not found, 500 for calculation errors
    """
    if not HEAVY_LIBS_AVAILABLE:
        raise HTTPException(status_code=503, detail=f"Scientific libraries unavailable: {HEAVY_IMPORT_ERROR}")
    try:
        logger.info(f"Trajectory calculation request for asteroid: {asteroid_name}")
        logger.info(f"Incoming request headers: {dict(request.headers)}")

        # Step 1: Fetch asteroid data from NASA API
        nasa_data = get_asteroid_data(asteroid_name)
        
        # Step 2: Extract orbital elements
        orbital_elements = extract_orbital_elements(nasa_data)
        
        # Step 3: Calculate trajectories
        trajectories = calculate_both_trajectories(orbital_elements, num_points=365)
        
        # Step 4: Add orbital elements and metadata to response
        trajectories["orbital_elements"] = {
            "a": orbital_elements.semi_major_axis,
            "e": orbital_elements.eccentricity,
            "i": orbital_elements.inclination,
            "raan": orbital_elements.longitude_ascending_node,
            "w": orbital_elements.argument_periapsis,
            "M": orbital_elements.mean_anomaly,
            "epoch": orbital_elements.epoch
        }
        
        # Add physical parameters if available
        try:
            physical_params = get_asteroid_physical_parameters(nasa_data)
            if physical_params and isinstance(physical_params, dict):
                if "diameter_km" in physical_params:
                    trajectories["diameter"] = physical_params["diameter_km"]
                if "relative_velocity_kps" in physical_params:
                    trajectories["relative_velocity"] = physical_params["relative_velocity_kps"]
        except Exception as e:
            logger.warning(f"Could not extract physical parameters: {e}")
            
        # Add potentially hazardous status if available
        try:
            if "object" in nasa_data and "pha" in nasa_data["object"]:
                trajectories["is_potentially_hazardous"] = nasa_data["object"]["pha"] == "Y"
        except Exception as e:
            logger.warning(f"Could not extract PHA status: {e}")
            
        # Add observation data if available
        try:
            if "orbit" in nasa_data and "data_arc" in nasa_data["orbit"]:
                data_arc = nasa_data["orbit"]["data_arc"]
                trajectories["first_obs"] = data_arc.get("first_obs", "N/A") if isinstance(data_arc, dict) else "N/A"
                trajectories["last_obs"] = data_arc.get("last_obs", "N/A") if isinstance(data_arc, dict) else "N/A"
                trajectories["n_obs_used"] = data_arc.get("n_obs_used", "N/A") if isinstance(data_arc, dict) else "N/A"
        except Exception as e:
            logger.warning(f"Could not extract observation data: {e}")
        
        logger.info(f"Successfully calculated trajectory for {asteroid_name}")
        return trajectories

    except NASAAPIError as e:
        logger.error(f"NASA API Error for {asteroid_name}: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
        
    except OrbitalCalculationError as e:
        logger.error(f"Orbital Calculation Error for {asteroid_name}: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    except Exception as e:
        # Log the full traceback for unexpected errors
        tb_str = traceback.format_exc()
        logger.error(f"Unexpected error processing trajectory for {asteroid_name}: {e}\nTraceback:\n{tb_str}")
        
        # Also log the incoming request headers for debugging
        logger.error(f"Request headers that caused the error: {dict(request.headers)}")

        error_response = create_error_response(
            status_code=500,
            message="An unexpected internal error occurred.",
            details=f"Error processing trajectory for {asteroid_name}. Please check logs for details.",
            error_code="INTERNAL_SERVER_ERROR"
        )
        return JSONResponse(status_code=500, content=error_response)


# Initialize AI analyzer
analyzer = AsteroidImpactAnalyzer()


@app.get("/api/asteroids/enhanced-list")
@handle_api_errors
async def get_enhanced_asteroids_list():
    """
    Get comprehensive asteroid list with detailed information for enhanced UI.
    
    Returns:
        List of asteroids with detailed NASA data including threat levels
    """
    try:
        logger.info("Fetching enhanced NEO data from NASA API")
        logger.debug(f"Using NASA_API_KEY present: {bool(os.getenv('NASA_API_KEY'))}")
        # Fetch more asteroids from NASA
        neo_data = get_neo_browse_data(page=0, size=50)
        asteroids = []
        # Defensive: ensure structure
        neos = neo_data.get("near_earth_objects") if isinstance(neo_data, dict) else None
        if neos and isinstance(neos, list):
            for neo in neos:
                # Extract comprehensive data
                name = neo.get("name", "Unknown")
                diameter_data = neo.get("estimated_diameter", {})
                
                # Get diameter range
                diameter_km = None
                if diameter_data.get("kilometers"):
                    km_data = diameter_data["kilometers"]
                    diameter_km = (km_data.get("estimated_diameter_min", 0) + 
                                 km_data.get("estimated_diameter_max", 0)) / 2
                
                # Get orbital data
                orbital_data = neo.get("orbital_data", {})
                
                # Create enhanced asteroid entry
                asteroid_info = {
                    "name": name,
                    "designation": neo.get("designation", ""),
                    "nasa_jpl_url": neo.get("nasa_jpl_url", ""),
                    "is_potentially_hazardous": neo.get("is_potentially_hazardous_asteroid", False),
                    "diameter_km": diameter_km,
                    "absolute_magnitude": neo.get("absolute_magnitude_h"),
                    "orbital_period": orbital_data.get("orbital_period"),
                    "minimum_orbit_intersection": orbital_data.get("minimum_orbit_intersection"),
                    "description": f"{'⚠️ Potentially Hazardous' if neo.get('is_potentially_hazardous_asteroid') else '✅ Non-hazardous'} - Diameter: {diameter_km:.3f} km" if diameter_km else "Real NASA asteroid data",
                    "threat_level": "HIGH" if neo.get("is_potentially_hazardous_asteroid") else "LOW"
                }
                
                asteroids.append(asteroid_info)
        
        # Sort by threat level and size
        asteroids.sort(key=lambda x: (x.get("is_potentially_hazardous", False), x.get("diameter_km", 0)), reverse=True)
        
        if not asteroids:
            logger.warning("Enhanced list produced 0 asteroids from NASA response structure. Returning fallback list.")
            asteroids = [
                {"name": "Apophis", "designation": "99942", "description": "⚠️ Potentially Hazardous - Famous for 2029 close approach", "nasa_jpl_url": "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=99942", "is_potentially_hazardous": True, "threat_level": "HIGH", "diameter_km": 0.34, "absolute_magnitude": 19.7},
                {"name": "Bennu", "designation": "101955", "description": "⚠️ Potentially Hazardous - OSIRIS-REx sample return target", "nasa_jpl_url": "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955", "is_potentially_hazardous": True, "threat_level": "HIGH", "diameter_km": 0.492, "absolute_magnitude": 20.9},
                {"name": "Ryugu", "designation": "162173", "description": "✅ Non-hazardous - Hayabusa2 sample return target", "nasa_jpl_url": "", "is_potentially_hazardous": False, "threat_level": "LOW", "diameter_km": 0.9, "absolute_magnitude": 19.2}
            ]
        logger.info(f"Successfully processed {len(asteroids)} enhanced asteroids (returning up to 30)")
        return {"asteroids": asteroids[:30]}  # Return top 30
        
    except Exception as e:
        logger.error(f"Error fetching enhanced NEO data: {str(e)}")
        # Return fallback data instead of 500 error
        logger.warning("NASA API failed. Returning fallback asteroid data.")
        fallback_asteroids = [
            {"name": "Apophis", "designation": "99942", "description": "⚠️ Potentially Hazardous - Famous for 2029 close approach", "nasa_jpl_url": "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=99942", "is_potentially_hazardous": True, "threat_level": "HIGH", "diameter_km": 0.34, "absolute_magnitude": 19.7},
            {"name": "Bennu", "designation": "101955", "description": "⚠️ Potentially Hazardous - OSIRIS-REx sample return target", "nasa_jpl_url": "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955", "is_potentially_hazardous": True, "threat_level": "HIGH", "diameter_km": 0.492, "absolute_magnitude": 20.9},
            {"name": "Ryugu", "designation": "162173", "description": "✅ Non-hazardous - Hayabusa2 sample return target", "nasa_jpl_url": "", "is_potentially_hazardous": False, "threat_level": "LOW", "diameter_km": 0.9, "absolute_magnitude": 19.2}
        ]
        return {"asteroids": fallback_asteroids}


@app.post("/api/impact/analyze")
@handle_api_errors
async def analyze_impact_with_ai(request: Dict[str, Any]):
    """
    Generate AI-powered impact analysis using Gemini 1.5 Flash.
    
    Args:
        request: Dictionary containing asteroid_data, impact_results, and location
        
    Returns:
        AI analysis of the asteroid impact scenario
    """
    try:
        asteroid_data = request.get('asteroid_data', {})
        impact_results = request.get('impact_results', {})
        location = request.get('location', 'Unknown location')
        
        analysis = analyzer.analyze_impact(asteroid_data, impact_results, location)
        
        return {
            "analysis": analysis,
            "generated_at": datetime.utcnow().isoformat(),
            "model": "gemini-1.5-flash"
        }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail="AI analysis failed")


@app.post("/api/impact/calculate")
@handle_api_errors
async def calculate_impact(request: ImpactCalculationRequest):
    """
    Calculate impact effects including crater diameter and impact energy.
    
    Args:
        request: ImpactCalculationRequest containing asteroid parameters
        
    Returns:
        Dictionary containing impact calculation results
        
    Raises:
        HTTPException: 422 for invalid parameters, 500 for calculation errors
    """
    if not HEAVY_LIBS_AVAILABLE:
        raise HTTPException(status_code=503, detail=f"Scientific libraries unavailable: {HEAVY_IMPORT_ERROR}")
    try:
        logger.info(f"Impact calculation request: diameter={request.diameter_km}km, velocity={request.velocity_kps}km/s")
        
        # Calculate impact effects
        results = calculate_impact_effects(
            diameter_km=request.diameter_km,
            velocity_kps=request.velocity_kps,
            asteroid_density_kg_m3=request.asteroid_density_kg_m3,
            target_density_kg_m3=request.target_density_kg_m3
        )
        
        # Format results for API response
        formatted_results = format_impact_results(results)
        
        logger.info(f"Impact calculation successful: crater={formatted_results['craterDiameterMeters']}m, energy={formatted_results['impactEnergyMegatons']}MT")
        return formatted_results
        
    except ImpactCalculationError as e:
        error_message = str(e)
        logger.error(f"Impact calculation error: {error_message}")
        raise HTTPException(status_code=422, detail=f"Impact calculation failed: {error_message}")
    
    except Exception as e:
        logger.error(f"Unexpected error in impact calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/impact/calculate/{asteroid_name}")
@handle_api_errors
async def calculate_asteroid_impact(asteroid_name: str):
    """
    Calculate impact effects for a specific asteroid using real NASA physical parameters.
    
    Args:
        asteroid_name: Name or designation of the asteroid
        
    Returns:
        Dictionary containing impact calculation results with real parameters
        
    Raises:
        HTTPException: 404 if asteroid not found, 422 for calculation errors, 500 for server errors
    """
    if not HEAVY_LIBS_AVAILABLE:
        raise HTTPException(status_code=503, detail=f"Scientific libraries unavailable: {HEAVY_IMPORT_ERROR}")
    try:
        logger.info(f"Asteroid-specific impact calculation request for: {asteroid_name}")
        
        # Get real physical parameters for this asteroid
        physical_params = get_asteroid_physical_parameters(asteroid_name)
        
        if not physical_params:
            # Use realistic fallback parameters instead of hardcoded values
            physical_params = get_realistic_fallback_parameters(asteroid_name)
            logger.info(f"Using fallback parameters for {asteroid_name}: {physical_params}")
        else:
            logger.info(f"Using real NASA parameters for {asteroid_name}: {physical_params['source']}")
        
        # Calculate impact effects using real parameters
        results = calculate_impact_effects(
            diameter_km=physical_params["diameter_km"],
            velocity_kps=physical_params["velocity_kps"],
            asteroid_density_kg_m3=physical_params["density_kg_m3"],
            target_density_kg_m3=2700  # Earth's crust density
        )
        
        # Format results for API response
        formatted_results = format_impact_results(results)
        
        # Add source information
        formatted_results["asteroid_name"] = asteroid_name
        formatted_results["parameters_source"] = physical_params.get("source", "Estimated")
        formatted_results["diameter_used_km"] = physical_params["diameter_km"]
        formatted_results["velocity_used_kps"] = physical_params["velocity_kps"]
        formatted_results["density_used_kg_m3"] = physical_params["density_kg_m3"]
        
        logger.info(f"Asteroid impact calculation successful for {asteroid_name}: "
                   f"crater={formatted_results['craterDiameterMeters']}m, "
                   f"energy={formatted_results['impactEnergyMegatons']}MT "
                   f"(using {formatted_results['parameters_source']})")
        
        return formatted_results
        
    except ImpactCalculationError as e:
        error_message = str(e)
        logger.error(f"Impact calculation error for {asteroid_name}: {error_message}")
        raise HTTPException(status_code=422, detail=f"Impact calculation failed for {asteroid_name}: {error_message}")
    
    except Exception as e:
        logger.error(f"Unexpected error in asteroid impact calculation for {asteroid_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")



class DeflectionRequest(BaseModel):
    """Request model for deflection calculation endpoint."""
    asteroid_name: str = Field(..., min_length=1, description="Name or designation of the asteroid")
    delta_v_mps: float = Field(..., gt=0, description="Velocity change in meters per second")
    days_from_epoch: float = Field(..., gt=0, description="Time of deflection in days from the asteroid's epoch")


@app.post("/api/deflection/calculate")
@handle_api_errors
async def calculate_deflection(request: DeflectionRequest):
    """
    Calculate the deflected trajectory of an asteroid after a deflection maneuver.
    
    Args:
        request: DeflectionRequest containing asteroid name, delta-v, and time of deflection
        
    Returns:
        Deflected trajectory data including new orbital path
        
    Raises:
        HTTPException: If calculation fails or asteroid data is unavailable
    """
    if not HEAVY_LIBS_AVAILABLE:
        raise HTTPException(status_code=503, detail=f"Scientific libraries unavailable: {HEAVY_IMPORT_ERROR}")
    try:
        logger.info(f"Deflection calculation for {request.asteroid_name}")
        
        # Import the deflection calculation function
        from orbital_calculator import calculate_deflected_trajectory
        
        # Calculate the deflected trajectory
        deflected_trajectory = calculate_deflected_trajectory(
            asteroid_name=request.asteroid_name,
            delta_v_mps=request.delta_v_mps,
            days_from_epoch=request.days_from_epoch
        )
        
        logger.info(f"Deflection calculation successful for {request.asteroid_name}")
        return deflected_trajectory
        
    except OrbitalCalculationError as e:
        error_message = str(e)
        logger.error(f"Deflection calculation error for {request.asteroid_name}: {error_message}")
        raise HTTPException(status_code=422, detail=f"Deflection calculation failed: {error_message}")
        
    except Exception as e:
        logger.error(f"Deflection calculation failed for {request.asteroid_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Deflection calculation failed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
