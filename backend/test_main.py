import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)


class TestFastAPIApplication:
    """Test suite for FastAPI application startup and configuration."""
    
    def test_app_instance_creation(self):
        """Test that FastAPI app instance is created with correct configuration."""
        assert app.title == "Project Aegis API"
        assert app.version == "1.0.0"
    
    def test_cors_middleware_configured(self):
        """Test that CORS middleware is properly configured."""
        # Check if CORS middleware is in the middleware stack
        cors_middleware_found = False
        for middleware in app.user_middleware:
            if "CORSMiddleware" in str(middleware.cls):
                cors_middleware_found = True
                break
        assert cors_middleware_found, "CORS middleware not found in app middleware stack"
    
    def test_root_endpoint(self):
        """Test the root endpoint returns correct response."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Project Aegis API is running"}
    
    def test_health_check_endpoint_without_api_key(self):
        """Test health check endpoint when NASA API key is not configured."""
        with patch.dict(os.environ, {"NASA_API_KEY": "your_nasa_api_key_here"}, clear=False):
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["nasa_api_configured"] is False
    
    def test_health_check_endpoint_with_api_key(self):
        """Test health check endpoint when NASA API key is properly configured."""
        with patch.dict(os.environ, {"NASA_API_KEY": "valid_api_key_123"}, clear=False):
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["nasa_api_configured"] is True
    
    def test_health_check_endpoint_with_missing_api_key(self):
        """Test health check endpoint when NASA API key environment variable is missing."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["nasa_api_configured"] is False
    
    def test_environment_variable_loading(self):
        """Test that environment variables are loaded on application startup."""
        # Test that load_dotenv is imported and available
        import main
        from dotenv import load_dotenv
        
        # Verify that the load_dotenv function is available in the main module
        assert hasattr(main, 'load_dotenv')
        
        # Test that environment variables can be accessed after loading
        # This indirectly tests that load_dotenv was called during module import
        import os
        nasa_key = os.getenv("NASA_API_KEY")
        # The key should be accessible (even if it's the default placeholder)
        assert nasa_key is not None


class TestApplicationStartup:
    """Test suite for application startup configuration."""
    
    def test_app_can_start(self):
        """Test that the application can start without errors."""
        # This test verifies that importing main.py doesn't raise any exceptions
        try:
            import main
            assert main.app is not None
        except Exception as e:
            pytest.fail(f"Application failed to start: {e}")
    
    def test_cors_allows_react_dev_server(self):
        """Test that CORS is configured to allow React development server."""
        # Make a preflight request to test CORS
        response = client.options("/", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        })
        # FastAPI/Starlette handles CORS preflight automatically
        # We just need to verify the app doesn't reject the origin
        assert response.status_code in [200, 204]  # Either OK or No Content is acceptable