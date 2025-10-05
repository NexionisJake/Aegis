@echo off
REM Production startup script for Project Aegis Backend (Windows)
REM Usage: start-production.bat

echo ==========================================
echo Starting Project Aegis Backend (Production)
echo ==========================================

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

REM Check for .env file
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create a .env file with required environment variables.
    echo See .env.example for reference.
    exit /b 1
)

REM Load and validate NASA API key
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="NASA_API_KEY" set NASA_API_KEY=%%b
)

if "%NASA_API_KEY%"=="" (
    echo ERROR: NASA_API_KEY not configured!
    echo Please set your NASA API key in the .env file.
    exit /b 1
)

if "%NASA_API_KEY%"=="your_nasa_api_key_here" (
    echo ERROR: Please replace the default NASA_API_KEY with your actual key!
    exit /b 1
)

echo NASA API configured: OK
echo Starting server with uvicorn...
echo ==========================================

REM Start the application with production settings
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
