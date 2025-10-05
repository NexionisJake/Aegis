#!/bin/bash

# Production build and serve script for Project Aegis Frontend
# Usage: ./build-and-serve.sh

set -e  # Exit on error

echo "=========================================="
echo "Building Project Aegis Frontend (Production)"
echo "=========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci --production=false
else
    echo "Dependencies already installed"
fi

# Check for .env.production file
if [ ! -f ".env.production" ]; then
    echo "WARNING: .env.production file not found!"
    echo "Using default environment variables."
    echo "See .env.example for reference."
fi

# Build the application
echo "Building production bundle..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "ERROR: Build failed! dist directory not found."
    exit 1
fi

echo "=========================================="
echo "Build completed successfully!"
echo "Output directory: dist/"
echo "=========================================="

# Optionally serve the built files locally for testing
read -p "Do you want to preview the production build? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting preview server..."
    npm run preview
fi
