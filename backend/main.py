from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
import os
import logging
from nasa_client import get_asteroid_data, NASAAPIError
from orbital_calculator import (
    extract_orbital_elements,
    calculate_both_trajectories,
    OrbitalCalculationError
)
from impact_calculator import (
    calculate_impact_effects,
    format_impact_results,
    ImpactCalculationError
)
from error_handlers import (
    global_exception_handler,
    handle_api_errors,
    create_error_response,
    map_error_to_http_status
)

# Load environment variables
load_dotenv()

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
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
async def get_trajectory(asteroid_name: str):
    """
    Calculate and return orbital trajectory for an asteroid and Earth.
    
    Args:
        asteroid_name: Name or designation of the asteroid (e.g., "Apophis", "99942")
        
    Returns:
        Dictionary containing asteroid_path and earth_path coordinate arrays
        
    Raises:
        HTTPException: 404 if asteroid not found, 500 for calculation errors
    """
    try:
        logger.info(f"Trajectory calculation request for asteroid: {asteroid_name}")
        
        # Step 1: Fetch asteroid data from NASA API
        nasa_data = get_asteroid_data(asteroid_name)
        
        # Step 2: Extract orbital elements
        orbital_elements = extract_orbital_elements(nasa_data)
        
        # Step 3: Calculate trajectories
        trajectories = calculate_both_trajectories(orbital_elements, num_points=365)
        
        logger.info(f"Successfully calculated trajectories for {asteroid_name}")
        return trajectories
        
    except NASAAPIError as e:
        error_message = str(e)
        logger.error(f"NASA API error for trajectory {asteroid_name}: {error_message}")
        
        # Return appropriate HTTP status codes based on error type
        if "not found" in error_message.lower():
            raise HTTPException(status_code=404, detail=error_message)
        elif "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail=error_message)
        elif "timeout" in error_message.lower():
            raise HTTPException(status_code=504, detail=error_message)
        else:
            raise HTTPException(status_code=500, detail=f"Failed to fetch asteroid data: {error_message}")
    
    except OrbitalCalculationError as e:
        error_message = str(e)
        logger.error(f"Orbital calculation error for {asteroid_name}: {error_message}")
        raise HTTPException(status_code=422, detail=f"Failed to calculate trajectory: {error_message}")
    
    except Exception as e:
        logger.error(f"Unexpected error calculating trajectory for {asteroid_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)