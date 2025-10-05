# Project Aegis

A web application for visualizing near-Earth asteroid orbital paths and simulating impact scenarios.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NASA API](https://img.shields.io/badge/NASA-API-red.svg)](https://api.nasa.gov/)

## 🚀 Quick Start

### Development Mode
```bash
# Start backend
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python main.py

# Start frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

### Production Mode with Docker
```bash
# Configure environment variables
cp .env.example .env
# Edit .env with your NASA API key

# Start with Docker Compose
docker-compose up -d
```

Visit http://localhost for the application.

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Comprehensive deployment instructions for various platforms
- **[Deployment Checklist](DEPLOYMENT-CHECKLIST.md)** - Pre-deployment verification checklist
- **[User Guide](USER_GUIDE.md)** - Application user documentation
- **[API Documentation](http://localhost:8000/docs)** - Interactive API documentation (when running)

## Project Structure

```
Aegis-frontend_change/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Main API application
│   ├── nasa_client.py         # NASA API integration
│   ├── orbital_calculator.py  # Orbital mechanics calculations
│   ├── impact_calculator.py   # Impact simulation
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Backend container configuration
│   ├── .env.example          # Environment variables template
│   └── start-production.bat  # Production startup script
├── frontend/                  # React frontend with Vite
│   ├── src/                  # React source code
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   └── utils/           # Utility functions
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── Dockerfile           # Frontend container configuration
│   ├── nginx.conf           # Nginx configuration
│   ├── vercel.json          # Vercel deployment config
│   └── build-and-serve.bat  # Production build script
├── docker-compose.yml        # Multi-container orchestration
├── .env.example             # Root environment template
├── DEPLOYMENT.md            # Deployment documentation
└── README.md               # This file
```

## Setup Instructions

### Prerequisites
- **Backend**: Python 3.11+
- **Frontend**: Node.js 18+ and npm
- **NASA API Key**: Get yours at [https://api.nasa.gov/](https://api.nasa.gov/)
- **Docker** (optional): For containerized deployment

### Backend Setup
1. Navigate to the `backend` directory
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your NASA API key
   ```
5. Run the development server:
   ```bash
   python main.py
   ```

The backend will be available at: http://localhost:8000

### Frontend Setup
1. Navigate to the `frontend` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional):
   ```bash
   cp .env.example .env
   # Edit if you need custom API URL
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at: http://localhost:5173

### Quick Start Scripts
For convenience, use the provided startup scripts:

**Windows:**
- `start-backend.bat` - Starts the backend server
- `start-frontend.bat` - Starts the frontend server

**Linux/Mac:**
- `chmod +x backend/start-production.sh` - Make executable
- `./backend/start-production.sh` - Start backend

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your NASA API key and configuration
   ```

2. **Build and start services**:
   ```bash
   docker-compose up -d
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Individual Containers

**Backend:**
```bash
cd backend
docker build -t aegis-backend .
docker run -p 8000:8000 --env-file .env aegis-backend
```

**Frontend:**
```bash
cd frontend
docker build -t aegis-frontend --build-arg VITE_API_BASE_URL=http://localhost:8000 .
docker run -p 80:80 aegis-frontend
```

## 🌐 Production Deployment

Project Aegis supports two main deployment methods:

### 🐳 Docker Deployment (Recommended for Full Stack)

Complete containerized deployment with Docker Compose:
- ✅ Both frontend and backend together
- ✅ Production-ready configuration
- ✅ Works on any platform (local, VPS, cloud)
- ✅ Easy updates and rollback

```bash
docker-compose up -d
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full Docker deployment instructions.

### ⚡ Vercel Deployment (Frontend)

Deploy frontend to Vercel's global CDN:
- ✅ Automatic HTTPS and CDN
- ✅ Instant deployments
- ✅ Preview deployments for PRs
- ✅ Built-in analytics

Backend deployment options:
- Railway (Recommended for FastAPI)
- Render
- Google Cloud Run
- Docker on any VPS

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel + backend deployment instructions.

**Before deploying, complete the [Deployment Checklist](DEPLOYMENT-CHECKLIST.md)**

## Technology Stack

### Backend
- **Python 3.11+** - Programming language
- **FastAPI** - Modern web framework
- **Poliastro** - Orbital mechanics calculations
- **Astropy** - Astronomical calculations
- **NumPy/SciPy** - Scientific computing
- **Requests** - NASA API integration
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Three.js** - 3D graphics library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber
- **Leaflet** - Interactive maps
- **react-leaflet** - React components for Leaflet
- **Axios** - HTTP client

### DevOps & Deployment
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server and reverse proxy
- **GitHub Actions** - CI/CD (optional)

## 🔧 Environment Variables

### Backend (.env)
```env
NASA_API_KEY=your_nasa_api_key_here
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=development
VITE_APP_NAME="Project Aegis"
VITE_ENABLE_DEBUG_LOGGING=true
```

See `.env.example` files for full documentation.

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Root endpoint, API information
- `GET /health` - Health check with NASA API status

### Asteroid Data
- `GET /api/asteroids/list` - Get list of Near-Earth Objects
- `GET /api/asteroid/{asteroid_name}` - Get specific asteroid data
- `GET /api/trajectory/{asteroid_name}` - Calculate orbital trajectory

### Impact Simulation
- `POST /api/impact/calculate` - Calculate impact effects
- `POST /api/impact/deflection` - Simulate deflection scenarios

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov=. --cov-report=html  # With coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:watch  # Watch mode
```

## 🛠️ Development

### Code Style
- **Backend**: Follow PEP 8, use Black formatter
- **Frontend**: ESLint configuration included

### Running Linters
```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
pip install black flake8
black .
flake8 .
```

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ CORS configured for specific origins
- ✅ Input validation with Pydantic
- ✅ Security headers in production
- ✅ HTTPS enforced in production
- ✅ No secrets in version control

## 📊 Performance

### Optimizations
- Code splitting for faster initial load
- Lazy loading for 3D components
- API response caching
- Optimized bundle sizes
- CDN for static assets (production)
- Compression (gzip/brotli)

### Monitoring
- Health check endpoints
- Error tracking (configure Sentry)
- Performance monitoring
- API rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA**: For providing the Near-Earth Object API
- **Poliastro**: For orbital mechanics calculations
- **Three.js**: For 3D visualization capabilities
- **React & Vite**: For modern web development tools

## 📞 Support

- **Documentation**: See DEPLOYMENT.md and USER_GUIDE.md
- **Issues**: Submit via GitHub Issues
- **NASA API**: [https://api.nasa.gov/](https://api.nasa.gov/)

## 🗺️ Roadmap

- [ ] Add more deflection methods
- [ ] Implement real-time tracking
- [ ] Add user authentication
- [ ] Database integration for favorites
- [ ] Mobile app version
- [ ] Advanced impact simulations
- [ ] Multi-language support

---

**Built with ❤️ for planetary defense awareness**