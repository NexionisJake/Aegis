# Project Aegis - Startup Guide

This guide explains how to quickly start the Project Aegis asteroid impact simulator using the provided batch files.

## Quick Start

### Option 1: Simple Startup (Recommended for most users)
```bash
# Double-click or run from command line
start-project-aegis.bat
```

This will:
- Check for Python and Node.js prerequisites
- Install dependencies if needed
- Start both backend and frontend servers
- Automatically open the application in your browser

### Option 2: Development Mode (Recommended for developers)
```bash
# Double-click or run from command line
start-dev.bat
```

This provides:
- Detailed logging and error information
- Development environment variables
- Separate windows for backend and frontend logs
- Better debugging capabilities

### Option 3: Stop All Servers
```bash
# Double-click or run from command line
stop-servers.bat
```

This will cleanly shut down all Project Aegis servers.

## Prerequisites

Before running the batch files, ensure you have:

### Required Software
- **Python 3.8+** - [Download from python.org](https://www.python.org/downloads/)
- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **Git** (optional) - For cloning the repository

### Verification
You can verify your installation by running:
```bash
python --version
node --version
npm --version
```

## Server Information

When running, the application uses these ports:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Main application interface |
| Backend API | http://localhost:8000 | REST API server |
| API Documentation | http://localhost:8000/docs | Interactive API docs |

## Troubleshooting

### Common Issues

#### "Python is not installed or not in PATH"
- Install Python from [python.org](https://www.python.org/downloads/)
- Make sure to check "Add Python to PATH" during installation
- Restart your command prompt after installation

#### "Node.js is not installed or not in PATH"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your command prompt after installation

#### "Port already in use" errors
- Run `stop-servers.bat` to clean up any existing processes
- Check if other applications are using ports 8000 or 5173
- You can change ports in the configuration files if needed

#### Backend fails to start
- Check if you have the required Python packages
- Ensure you have a valid NASA API key (optional for basic functionality)
- Check the backend console window for detailed error messages

#### Frontend fails to start
- Ensure Node.js dependencies are installed (`npm install` in frontend folder)
- Check the frontend console window for detailed error messages
- Clear npm cache: `npm cache clean --force`

### Manual Startup (Alternative)

If the batch files don't work, you can start the servers manually:

#### Backend (Terminal 1)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

## Development Tips

### Hot Reloading
Both servers support hot reloading:
- **Frontend**: Changes to React components automatically refresh the browser
- **Backend**: Changes to Python files automatically restart the server

### Environment Variables
You can set these environment variables for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `NASA_API_KEY` | None | Your NASA API key for real data |
| `BACKEND_PORT` | 8000 | Backend server port |
| `FRONTEND_PORT` | 5173 | Frontend development server port |

### Logs and Debugging
- Backend logs appear in the "Backend Server" console window
- Frontend logs appear in the "Frontend Server" console window
- Browser developer tools show client-side logs and errors

## Project Structure

```
Project Aegis/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main server file
│   ├── requirements.txt    # Python dependencies
│   └── ...
├── frontend/               # React frontend
│   ├── src/               # Source code
│   ├── package.json       # Node.js dependencies
│   └── ...
├── start-project-aegis.bat # Simple startup script
├── start-dev.bat          # Development startup script
├── stop-servers.bat       # Server shutdown script
└── README-STARTUP.md      # This file
```

## Next Steps

Once the application is running:

1. **Explore the 3D Visualization**: The app automatically loads Apophis asteroid data
2. **Simulate Impact**: Click the "🌍 Simulate Impact" button to see impact effects
3. **Switch Views**: Toggle between 3D orbital view and 2D impact map
4. **Check Performance**: Use the performance monitor (visible in development mode)

## Support

If you encounter issues:

1. Check the console windows for error messages
2. Verify all prerequisites are installed correctly
3. Try running `stop-servers.bat` and restarting
4. Check the troubleshooting section above
5. Review the detailed logs in development mode

## API Usage

The backend provides a REST API that you can test:

- **Health Check**: GET http://localhost:8000/
- **Trajectory Data**: GET http://localhost:8000/api/trajectory/Apophis
- **Impact Calculation**: POST http://localhost:8000/api/impact
- **API Documentation**: http://localhost:8000/docs

Enjoy exploring asteroid impact simulations with Project Aegis! 🚀