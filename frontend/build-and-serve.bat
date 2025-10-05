@echo off
REM Production build and serve script for Project Aegis Frontend (Windows)
REM Usage: build-and-serve.bat

echo ==========================================
echo Building Project Aegis Frontend (Production)
echo ==========================================

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm ci --production=false
) else (
    echo Dependencies already installed
)

REM Check for .env.production file
if not exist ".env.production" (
    echo WARNING: .env.production file not found!
    echo Using default environment variables.
    echo See .env.example for reference.
)

REM Build the application
echo Building production bundle...
call npm run build

REM Check if build was successful
if not exist "dist\" (
    echo ERROR: Build failed! dist directory not found.
    exit /b 1
)

echo ==========================================
echo Build completed successfully!
echo Output directory: dist/
echo ==========================================

REM Optionally serve the built files locally for testing
set /p PREVIEW="Do you want to preview the production build? (y/n) "
if /i "%PREVIEW%"=="y" (
    echo Starting preview server...
    call npm run preview
)
