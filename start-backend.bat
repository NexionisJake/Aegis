@echo off
echo Starting Project Aegis Backend Server...
cd backend
REM Activate virtual environment if it exists
if exist ..\\.venv\\Scripts\\activate.bat (
    call ..\\.venv\\Scripts\\activate.bat
)
python main.py