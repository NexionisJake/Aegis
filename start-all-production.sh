#!/bin/bash

# Root production startup script for Project Aegis
# Starts both backend and frontend services
# Usage: ./start-all-production.sh

set -e  # Exit on error

echo "=========================================="
echo "Project Aegis - Production Deployment"
echo "=========================================="

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Docker detected. Recommended to use Docker deployment."
    echo "Run: docker-compose up -d"
    echo ""
    read -p "Do you want to continue with manual startup? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating root .env file from example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env
        echo "Please edit .env file with your configuration"
        exit 1
    fi
fi

# Function to start backend
start_backend() {
    echo "Starting backend service..."
    cd backend
    
    if [ -f "start-production.sh" ]; then
        chmod +x start-production.sh
        ./start-production.sh &
        BACKEND_PID=$!
        echo "Backend started (PID: $BACKEND_PID)"
    else
        echo "ERROR: Backend start script not found!"
        exit 1
    fi
    
    cd ..
}

# Function to build frontend
build_frontend() {
    echo "Building frontend..."
    cd frontend
    
    if [ -f "build-and-serve.sh" ]; then
        chmod +x build-and-serve.sh
        ./build-and-serve.sh
    else
        npm run build
    fi
    
    cd ..
}

# Start backend
start_backend

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Build frontend
build_frontend

echo "=========================================="
echo "Deployment Summary:"
echo "- Backend: Running on port 8000"
echo "- Frontend: Built in frontend/dist/"
echo ""
echo "Next steps:"
echo "1. Configure a web server (nginx/apache) to serve frontend/dist/"
echo "2. Set up reverse proxy to backend API"
echo "3. Configure SSL/TLS certificates"
echo "=========================================="
