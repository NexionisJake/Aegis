# 🛡️ AEGIS - Asteroid Impact Simulator

**Advanced Earth Guard and Impact Simulation System**

A cutting-edge web application for visualizing near-Earth asteroids and simulating impact scenarios with AI-powered analysis.

[![Live Demo](https://img.shields.io/badge/Live-Demo-00E5FF?style=for-the-badge&logo=vercel)](https://aegis-neo.vercel.app/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NASA API](https://img.shields.io/badge/NASA-API-red.svg)](https://api.nasa.gov/)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%201.5-4285F4?logo=google)](https://ai.google.dev/)

## 🌐 Live Application

**🚀 [Launch AEGIS](https://aegis-neo.vercel.app/)**

Experience real-time asteroid impact simulation with:
- 📡 Live NASA asteroid data
- 🌍 Interactive 3D Earth visualization
- 💥 Scientific impact calculations
- 🤖 AI-powered impact analysis
- 🗺️ Detailed impact zone mapping

## ✨ Key Features

### 🎯 Real-Time Asteroid Database
- **20+ NASA-verified asteroids** with live orbital data
- Real-time threat level classification (High/Medium/Low)
- Comprehensive physical parameters (diameter, mass, velocity, orbit period)
- Direct links to NASA JPL Small-Body Database

### 🌍 Interactive 3D Earth Visualization
- Photorealistic Earth with NASA Blue Marble textures
- Day/night lighting with city illumination
- Atmospheric glow effects
- Smooth orbital controls (drag to rotate, scroll to zoom)
- Auto-rotation with manual override

### 💥 Scientific Impact Simulation
- **Click anywhere on Earth** to select impact location
- Precise crater diameter calculations
- Impact energy analysis (megaton TNT equivalent)
- Blast radius visualization
- Affected area calculations (km²)
- Impact velocity and trajectory modeling

### 🤖 AI-Powered Analysis
- **Google Gemini 1.5 Flash** integration
- Detailed impact scenario analysis
- Environmental effect predictions
- Population and infrastructure risk assessment
- Real-time AI-generated insights

### �️ Impact Visualization
- Interactive impact zone maps (Leaflet/OpenStreetMap)
- Crater zone highlighting with radius indicators
- Blast damage zones with color-coded severity
- Coordinate display and location details
- Zoom and pan for detailed inspection

### 🎨 Modern AEGIS Theme
- Cyberpunk-inspired cyan and gold color scheme
- Glassmorphism UI effects with backdrop blur
- Smooth animations and transitions
- Responsive design for all screen sizes
- Professional SVG icons throughout

### 📊 Enhanced Asteroid Sidebar
- **Smart search** with real-time filtering
- Threat level filtering (All/High/Medium/Low)
- Modern card-based layout
- Shimmer loading effects
- Smooth scrolling with custom scrollbar
- NASA JPL direct links per asteroid

### 🎮 User Experience
- Intuitive click-to-select interface
- Loading states with progress indicators
- Error handling with graceful fallbacks
- Deselect functionality for easy reset
- Educational disclaimers
- Responsive controls panel

## 🎬 Screenshots

### Main Dashboard
![AEGIS Dashboard](docs/screenshots/dashboard.png)
*Interactive 3D Earth with asteroid selection sidebar*

### Impact Simulation
![Impact Results](docs/screenshots/impact-simulation.png)
*Detailed impact statistics and AI analysis*

### Impact Zone Visualization
![Impact Map](docs/screenshots/impact-map.png)
*Interactive map showing crater and blast zones*

## 🎯 How It Works

1. **Select an Asteroid**
   - Browse 20+ NASA-verified near-Earth asteroids
   - Filter by threat level or search by name
   - View detailed orbital and physical parameters

2. **Choose Impact Location**
   - Click anywhere on the interactive 3D Earth
   - Precise latitude/longitude selection
   - Visual location indicator appears

3. **Simulate Impact**
   - Click "Simulate Impact" button
   - Scientific calculations using real physics
   - Crater size, blast radius, and energy computed

4. **Analyze Results**
   - View detailed impact statistics
   - Explore interactive impact zone map
   - Read AI-generated analysis and predictions
   - Understand potential effects and risks

5. **Explore Scenarios**
   - Try different asteroids and locations
   - Compare impact effects
   - Learn about planetary defense

## 🚀 Quick Start

### Try the Live Demo
Visit **[aegis-neo.vercel.app](https://aegis-neo.vercel.app/)** to use AEGIS instantly - no installation required!

### Local Development
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

## 🛠️ Technology Stack

### Backend
- **Python 3.11+** - Programming language
- **FastAPI** - Modern, high-performance web framework
- **Poliastro** - Orbital mechanics calculations
- **Astropy** - Astronomical calculations and constants
- **NumPy/SciPy** - Scientific computing and numerical analysis
- **Requests** - NASA API integration
- **Uvicorn** - Lightning-fast ASGI server
- **Pydantic** - Data validation and settings management
- **Google Gemini API** - AI-powered impact analysis

### Frontend
- **React 19** - Modern UI framework with concurrent features
- **Vite** - Next-generation frontend tooling
- **Three.js** - 3D graphics library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber
- **Leaflet** - Interactive mapping library
- **react-leaflet** - React components for Leaflet
- **Axios** - Promise-based HTTP client
- **GSAP** - Professional-grade animation library
- **Custom AEGIS Theme** - Cyberpunk-inspired UI design

### APIs & Data Sources
- **NASA JPL Small-Body Database** - Asteroid orbital data
- **NASA NEO Web Service** - Near-Earth Object information
- **Google Gemini 1.5 Flash** - AI analysis generation
- **OpenStreetMap** - Impact zone mapping

### DevOps & Deployment
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration
- **Nginx** - High-performance web server and reverse proxy
- **Vercel** - Frontend hosting and CDN
- **Railway** - Backend API hosting (recommended)
- **GitHub Actions** - CI/CD automation (optional)

## 🔧 Environment Variables

### Backend (.env)
```env
# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,https://aegis-neo.vercel.app

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env)
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# App Configuration
VITE_APP_ENV=development
VITE_APP_NAME="AEGIS - Asteroid Impact Simulator"
VITE_ENABLE_DEBUG_LOGGING=true
```

### Getting API Keys
- **NASA API Key**: Free at [https://api.nasa.gov/](https://api.nasa.gov/) (instant approval)
- **Gemini API Key**: Free at [https://ai.google.dev/](https://ai.google.dev/) (requires Google account)

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

- **NASA JPL** - For providing the Near-Earth Object API and Small-Body Database
- **Google Gemini AI** - For powering intelligent impact analysis
- **Poliastro** - For accurate orbital mechanics calculations
- **Three.js Community** - For 3D visualization capabilities
- **React & Vite Teams** - For modern web development tools
- **OpenStreetMap** - For detailed mapping data
- **Vercel** - For seamless frontend hosting and deployment

## 📞 Support & Contact

- **Live Demo**: [aegis-neo.vercel.app](https://aegis-neo.vercel.app/)
- **Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md) and [USER_GUIDE.md](USER_GUIDE.md)
- **Issues**: Submit via [GitHub Issues](https://github.com/NexionisJake/Aegis/issues)
- **NASA API**: [api.nasa.gov](https://api.nasa.gov/)
- **Gemini AI**: [ai.google.dev](https://ai.google.dev/)

## ⚠️ Disclaimer

AEGIS is an **educational simulation tool** designed for learning and awareness about asteroid impacts and planetary defense. All impact calculations are approximations based on simplified physics models. Actual asteroid impact effects would vary significantly based on numerous factors not fully modeled here including:
- Atmospheric entry dynamics
- Asteroid composition and structure
- Local geology and terrain
- Weather conditions
- Ocean depth (for water impacts)

**This tool should not be used for actual emergency planning or scientific research without proper validation.**

---

<div align="center">

**�️ Built with ❤️ for planetary defense awareness 🌍**

**[Launch AEGIS](https://aegis-neo.vercel.app/)** | **[Documentation](DEPLOYMENT.md)** | **[Report Issue](https://github.com/NexionisJake/Aegis/issues)**

*Protecting Earth, one simulation at a time* 🚀

</div>

### ✅ Completed Features
- [x] Interactive 3D Earth visualization
- [x] Real-time NASA asteroid data integration
- [x] Scientific impact calculations
- [x] AI-powered impact analysis (Gemini)
- [x] Impact zone mapping with Leaflet
- [x] Modern AEGIS theme with glassmorphism
- [x] Responsive design for all devices
- [x] Enhanced asteroid sidebar with search & filters
- [x] Production deployment (Vercel + Railway)

### 🚧 In Progress
- [ ] Advanced deflection method simulations
- [ ] Historical impact event database
- [ ] Comparison mode for multiple asteroids

### 🔮 Future Plans
- [ ] Real-time asteroid tracking notifications
- [ ] User authentication and saved simulations
- [ ] Database integration for favorites
- [ ] Mobile app (React Native)
- [ ] Advanced atmospheric entry modeling
- [ ] Multi-asteroid collision scenarios
- [ ] Educational mode with guided tours
- [ ] Multi-language support (i18n)
- [ ] API rate limiting dashboard
- [ ] Custom asteroid parameters input

---

**Built with ❤️ for planetary defense awareness**