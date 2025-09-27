# Project Aegis

A web application for visualizing near-Earth asteroid orbital paths and simulating impact scenarios.

## Project Structure

```
project-aegis/
├── backend/                 # Python FastAPI backend
│   ├── venv/               # Python virtual environment
│   ├── main.py             # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend with Vite
│   ├── src/               # React source code
│   ├── package.json       # Node.js dependencies
│   └── dist/              # Built frontend assets
├── start-backend.bat      # Backend startup script
├── start-frontend.bat     # Frontend startup script
└── README.md              # This file
```

## Setup Instructions

### Backend Setup
1. Navigate to the `backend` directory
2. Activate the virtual environment: `venv\Scripts\activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Configure your NASA API key in `.env` file
5. Run the server: `python main.py`

The backend will be available at: http://localhost:8000

### Frontend Setup
1. Navigate to the `frontend` directory
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

The frontend will be available at: http://localhost:5173

### Quick Start
- Run `start-backend.bat` to start the backend server
- Run `start-frontend.bat` to start the frontend server

## Technology Stack

### Backend
- Python 3.10+
- FastAPI
- poliastro (orbital mechanics)
- requests (NASA API integration)
- uvicorn (ASGI server)

### Frontend
- React 18+
- Vite (build tool)
- Three.js + @react-three/fiber (3D visualization)
- Leaflet + react-leaflet (2D mapping)
- axios (HTTP client)

## Environment Variables

Create a `.env` file in the `backend` directory with:
```
NASA_API_KEY=your_nasa_api_key_here
DEBUG=True
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check with NASA API configuration status