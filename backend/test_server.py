#!/usr/bin/env python3
"""
Simple test server to verify NASA API functionality
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests
import uvicorn

# Load environment variables
load_dotenv()

app = FastAPI(title="Test NASA API Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test NASA API Server is running"}

@app.get("/test-nasa")
async def test_nasa():
    """Test NASA API connection"""
    api_key = os.getenv("NASA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="NASA_API_KEY not found")
    
    try:
        url = f"https://api.nasa.gov/neo/rest/v1/neo/browse?page=0&size=5&api_key={api_key}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            asteroids = data.get("near_earth_objects", [])
            return {
                "status": "success",
                "count": len(asteroids),
                "asteroids": [
                    {
                        "name": asteroid.get("name"),
                        "id": asteroid.get("id"),
                        "is_potentially_hazardous": asteroid.get("is_potentially_hazardous_asteroid")
                    }
                    for asteroid in asteroids[:3]
                ]
            }
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NASA API error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)