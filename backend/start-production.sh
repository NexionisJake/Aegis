#!/bin/bash

# Production startup script for Project Aegis Backend
# Usage: ./start-production.sh

set -e  # Exit on error

echo "=========================================="
echo "Starting Project Aegis Backend (Production)"
echo "=========================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Please create a .env file with required environment variables."
    echo "See .env.example for reference."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate NASA API key
if [ -z "$NASA_API_KEY" ] || [ "$NASA_API_KEY" = "your_nasa_api_key_here" ]; then
    echo "ERROR: NASA_API_KEY not configured!"
    echo "Please set your NASA API key in the .env file."
    exit 1
fi

echo "Environment: ${ENVIRONMENT:-production}"
echo "Port: ${PORT:-8000}"
echo "NASA API configured: ✓"

# Start the application with production settings
echo "Starting server with uvicorn..."
echo "=========================================="

# Use multiple workers for production
uvicorn main:app \
    --host ${HOST:-0.0.0.0} \
    --port ${PORT:-8000} \
    --workers ${WORKERS:-4} \
    --log-level ${LOG_LEVEL:-info} \
    --no-access-log \
    --proxy-headers \
    --forwarded-allow-ips='*'
