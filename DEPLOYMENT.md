# Project Aegis - Deployment Guide

This guide provides instructions for deploying Project Aegis using Docker and Vercel.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment (Recommended)](#docker-deployment-recommended)
  - [Full Stack with Docker Compose](#full-stack-with-docker-compose)
  - [Individual Containers](#individual-containers)
  - [Docker Production Optimizations](#docker-production-optimizations)
- [Vercel Deployment (Frontend)](#vercel-deployment-frontend)
  - [Backend Deployment Options for Vercel](#backend-deployment-options-for-vercel)
- [Production Optimizations](#production-optimizations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying, ensure you have:

- ✅ NASA API Key from [https://api.nasa.gov/](https://api.nasa.gov/)
- ✅ All environment variables configured
- ✅ Production build tested locally
- ✅ All tests passing
- ✅ CORS origins configured correctly
- ✅ Security headers implemented
- ✅ Error handling implemented
- ✅ Logging configured

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
NASA_API_KEY=your_actual_nasa_api_key
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
DEBUG=False
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=INFO
```

### Frontend Environment Variables

Create a `.env.production` file in the `frontend` directory:

```env
VITE_API_BASE_URL=https://your-backend-api.com
VITE_APP_ENV=production
VITE_APP_NAME="Project Aegis"
VITE_ENABLE_DEBUG_LOGGING=false
```

## Docker Deployment (Recommended)

Docker provides the easiest and most reliable way to deploy the complete Project Aegis stack.

### Prerequisites
- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- NASA API Key from [https://api.nasa.gov/](https://api.nasa.gov/)

### Full Stack with Docker Compose

This is the **recommended** method for deploying both frontend and backend together.

1. **Clone the repository**
   ```bash
   git clone https://github.com/NexionisJake/Aegis.git
   cd Aegis
   ```

2. **Configure environment variables**
   ```bash
   # Create .env file in root directory
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # NASA API Key (REQUIRED)
   NASA_API_KEY=your_actual_nasa_api_key_here
   
   # Backend Configuration
   ENVIRONMENT=production
   HOST=0.0.0.0
   PORT=8000
   DEBUG=False
   LOG_LEVEL=INFO
   
   # CORS - Add your frontend domain
   ALLOWED_ORIGINS=http://localhost,https://yourdomain.com
   
   # Frontend Configuration
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_ENV=production
   VITE_ENABLE_DEBUG_LOGGING=false
   ```

3. **Build and start services**
   ```bash
   docker-compose up -d
   ```
   
   This will:
   - Build both backend and frontend Docker images
   - Start containers in detached mode
   - Configure networking between services
   - Set up health checks

4. **Verify deployment**
   
   Check if containers are running:
   ```bash
   docker-compose ps
   ```
   
   Access the application:
   - **Frontend**: http://localhost (port 80)
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Health Check**: http://localhost:8000/health

5. **View logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Backend only
   docker-compose logs -f backend
   
   # Frontend only
   docker-compose logs -f frontend
   ```

6. **Stop the application**
   ```bash
   # Stop and remove containers
   docker-compose down
   
   # Stop, remove containers, and remove volumes
   docker-compose down -v
   ```

7. **Update and redeploy**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Rebuild and restart
   docker-compose up -d --build
   ```

### Individual Containers

If you need to deploy backend and frontend separately:

**Backend Container:**
```bash
cd backend

# Build the image
docker build -t aegis-backend .

# Run the container
docker run -d \
  --name aegis-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  aegis-backend

# Check logs
docker logs -f aegis-backend
```

**Frontend Container:**
```bash
cd frontend

# Build the image with API URL
docker build -t aegis-frontend \
  --build-arg VITE_API_BASE_URL=https://your-backend-url.com \
  .

# Run the container
docker run -d \
  --name aegis-frontend \
  -p 80:80 \
  --restart unless-stopped \
  aegis-frontend

# Check logs
docker logs -f aegis-frontend
```

#### Docker Production Optimizations

#### 1. Use Docker Secrets for Sensitive Data

Instead of using `.env` file, use Docker secrets:

```bash
# Create secrets
echo "your_nasa_api_key" | docker secret create nasa_api_key -

# Update docker-compose.yml to use secrets
```

#### 2. Enable Resource Limits

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

#### 3. Configure Logging

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 4. Use Health Checks

Already configured in `docker-compose.yml`:
- Backend: Checks `/health` endpoint every 30s
- Frontend: Checks nginx every 30s

#### 5. Production Networking

For production, use custom networks:
```bash
docker network create aegis-production
```

Then reference in docker-compose.yml.

#### Docker Deployment on Cloud Platforms

#### Deploy to AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu Server 22.04 LTS
   - Instance type: t2.medium or larger
   - Security groups: Allow ports 80, 443, 8000

2. **Install Docker**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy Application**
   ```bash
   git clone https://github.com/NexionisJake/Aegis.git
   cd Aegis
   nano .env  # Configure environment
   docker-compose up -d
   ```

4. **Configure Domain & SSL**
   ```bash
   # Install Nginx as reverse proxy
   sudo apt install nginx certbot python3-certbot-nginx -y
   
   # Configure SSL
   sudo certbot --nginx -d yourdomain.com
   ```

#### Deploy to Google Cloud Run

```bash
# Backend
gcloud run deploy aegis-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NASA_API_KEY=your_key

# Frontend
gcloud run deploy aegis-frontend \
  --source ./frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Deploy to Azure Container Instances

```bash
# Create resource group
az group create --name aegis-rg --location eastus

# Deploy backend
az container create \
  --resource-group aegis-rg \
  --name aegis-backend \
  --image aegis-backend \
  --dns-name-label aegis-backend \
  --ports 8000

# Deploy frontend
az container create \
  --resource-group aegis-rg \
  --name aegis-frontend \
  --image aegis-frontend \
  --dns-name-label aegis-frontend \
  --ports 80
```

## Vercel Deployment (Frontend)

Vercel is an excellent platform for deploying the React frontend with automatic HTTPS, global CDN, and instant deployments.

### Prerequisites
- Vercel account (free tier available at [vercel.com](https://vercel.com))
- GitHub repository connected to Vercel (recommended) OR Vercel CLI
- Backend API deployed elsewhere (see [Backend Deployment Options](#backend-deployment-options-for-vercel))

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Choose the `frontend` directory as the root

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Configure Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `VITE_API_BASE_URL` | `https://your-backend-api.com` | Production |
   | `VITE_APP_ENV` | `production` | Production |
   | `VITE_ENABLE_DEBUG_LOGGING` | `false` | Production |
   
   **Important**: Replace `https://your-backend-api.com` with your actual backend URL

5. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application
   - You'll receive a production URL like `https://your-app.vercel.app`

6. **Configure Custom Domain** (Optional)
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed by Vercel

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

4. **Configure Environment Variables**
   
   The `vercel.json` file is already configured. Update it if needed:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "installCommand": "npm ci",
     "devCommand": "npm run dev",
     "env": {
       "VITE_API_BASE_URL": "https://your-backend-api.com",
       "VITE_APP_ENV": "production",
       "VITE_ENABLE_DEBUG_LOGGING": "false"
     }
   }
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```
   
   Or for preview deployment:
   ```bash
   vercel
   ```

6. **View Deployment**
   - Vercel will provide a deployment URL
   - Visit the URL to verify your deployment

### Vercel Configuration Details

The `vercel.json` file includes:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url",
    "VITE_APP_ENV": "production",
    "VITE_ENABLE_DEBUG_LOGGING": "false"
  },
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

This configuration provides:
- ✅ Optimized caching for static assets
- ✅ SPA routing support
- ✅ Security headers
- ✅ Production environment variables

### Automatic Deployments

Once connected to GitHub:
- **Production**: Every push to `main` branch triggers a production deployment
- **Preview**: Pull requests create preview deployments automatically
- **Rollback**: Easy rollback to previous deployments in Vercel dashboard

### Backend Deployment Options for Vercel

Since Vercel primarily hosts frontend applications, you need to deploy your backend separately. Here are the recommended options:

#### Option 1: Railway (Recommended for FastAPI)

Railway offers excellent Python/FastAPI support with automatic deployments.

1. **Sign up at [railway.app](https://railway.app)**

2. **Connect GitHub Repository**
   - New Project → Deploy from GitHub repo
   - Select your repository

3. **Configure Backend Service**
   - Railway auto-detects Python
   - Set root directory to `backend`
   - Add environment variables:
     - `NASA_API_KEY`
     - `ALLOWED_ORIGINS` (include your Vercel domain)
     - `PORT=8000`

4. **Get Railway URL**
   - Railway provides a URL like `https://aegis-backend.up.railway.app`
   - Use this in your Vercel environment variables

5. **Update CORS**
   ```bash
   # In Railway environment variables
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.your-app.vercel.app
   ```

#### Option 2: Render

1. **Create Web Service at [render.com](https://render.com)**
2. **Connect Repository**
3. **Configure**:
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`
4. **Add Environment Variables**
5. **Deploy and get URL**

#### Option 3: Google Cloud Run

```bash
cd backend
gcloud run deploy aegis-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NASA_API_KEY=your_key,ALLOWED_ORIGINS=https://your-app.vercel.app
```

#### Option 4: AWS Lambda + API Gateway

Deploy backend as serverless functions using [Mangum](https://mangum.io/) adapter for FastAPI.

### Vercel + Backend Integration Checklist

- [ ] Backend deployed and accessible via HTTPS
- [ ] Backend URL added to Vercel environment variables (`VITE_API_BASE_URL`)
- [ ] CORS configured on backend to allow Vercel domain
- [ ] API endpoints tested from Vercel deployment
- [ ] Environment variables configured in Vercel
- [ ] Custom domain configured (if using)
- [ ] SSL/HTTPS working on both frontend and backend

### Troubleshooting Vercel Deployment

**Build Fails:**
```bash
# Clear Vercel cache and redeploy
vercel --prod --force
```

**Environment Variables Not Working:**
- Ensure variable names start with `VITE_` for Vite to include them
- Redeploy after changing environment variables
- Check that variables are set for "Production" environment

**CORS Errors:**
- Verify `ALLOWED_ORIGINS` in backend includes your Vercel domain
- Check that domain includes `https://` prefix
- Include both `www` and non-`www` versions if applicable

**API Connection Failed:**
- Verify `VITE_API_BASE_URL` is correct in Vercel dashboard
- Check backend is running and accessible
- Test API endpoint directly in browser

**404 on Routes:**
- Ensure `vercel.json` includes SPA routing configuration
- Check that all routes redirect to `index.html`
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "env": {
       "VITE_API_BASE_URL": "https://your-backend-api.com"
     }
   }
   ```

3. **Deploy**
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Configure Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add `VITE_API_BASE_URL` with your backend URL

## Production Optimizations

### Backend Optimizations

1. **Multiple Workers for Uvicorn**
   ```bash
   # Recommended for production
   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
   ```
   
   Rule of thumb: `workers = (2 x CPU cores) + 1`

2. **Enable API Response Caching**
   - Cache NASA API responses to reduce API calls
   - Implement Redis for distributed caching
   - Set appropriate TTL for cached data

3. **Security Best Practices**
   - ✅ Use environment variables for all secrets
   - ✅ Enable HTTPS only in production
   - ✅ Configure strict CORS policies
   - ✅ Implement rate limiting (use `slowapi` or `fastapi-limiter`)
   - ✅ Add request validation with Pydantic
   - ✅ Enable security headers

4. **Performance Monitoring**
   ```python
   # Add to main.py
   from fastapi.middleware.gzip import GZipMiddleware
   
   app.add_middleware(GZipMiddleware, minimum_size=1000)
   ```

### Frontend Optimizations

Already configured in `vite.config.js`:

1. **Code Splitting**
   - ✅ Separate chunks for React, Three.js, and Leaflet
   - ✅ Reduces initial bundle size
   - ✅ Faster page loads

2. **Build Optimizations**
   - ✅ Terser minification enabled
   - ✅ Console.log removal in production
   - ✅ Tree shaking automatic
   - ✅ Asset optimization

3. **Performance Features**
   - Enable compression (automatic on Vercel and Nginx)
   - Lazy load heavy 3D components
   - Use React.lazy() for route-based code splitting
   - Implement service worker for offline support (optional)

4. **Security Headers** (Configured in `nginx.conf` and `vercel.json`)
   - ✅ X-Content-Type-Options: nosniff
   - ✅ X-Frame-Options: DENY
   - ✅ X-XSS-Protection: 1; mode=block
   - ✅ Referrer-Policy: strict-origin-when-cross-origin

###Performance Checklist

- [ ] Lighthouse score > 90 for all categories
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.9s
- [ ] Total bundle size < 300KB (gzipped)
- [ ] Images optimized and compressed
- [ ] API responses cached where appropriate
- [ ] CDN configured for static assets

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Deploy Backend**
   ```bash
   cd backend
   railway up
   ```

5. **Deploy Frontend**
   ```bash
   cd frontend
   railway up
   ```

6. **Configure Environment Variables**
   - Go to Railway Dashboard
   - Add environment variables for both services
   - Link frontend to backend URL

### Render (Full Stack)

1. **Create `render.yaml`** in root directory:
   ```yaml
   services:
     - type: web
       name: aegis-backend
       env: python
       buildCommand: "pip install -r backend/requirements.txt"
       startCommand: "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
       envVars:
         - key: NASA_API_KEY
           sync: false
         - key: ALLOWED_ORIGINS
           value: https://aegis-frontend.onrender.com
         - key: ENVIRONMENT
           value: production
     
     - type: web
       name: aegis-frontend
       env: static
       buildCommand: "cd frontend && npm install && npm run build"
       staticPublishPath: frontend/dist
       envVars:
         - key: VITE_API_BASE_URL
           value: https://aegis-backend.onrender.com
   ```

2. **Deploy**
   - Connect your GitHub repository to Render
   - Render will automatically deploy based on `render.yaml`

### Heroku (Full Stack)

**Backend Deployment:**

1. **Create `Procfile`** in `backend` directory:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

2. **Create `runtime.txt`** in `backend` directory:
   ```
   python-3.11.0
   ```

3. **Deploy**
   ```bash
   cd backend
   heroku create aegis-backend
   heroku config:set NASA_API_KEY=your_key
   heroku config:set ALLOWED_ORIGINS=https://your-frontend-url.com
   git push heroku main
   ```

**Frontend Deployment:**

1. **Set up a new Heroku app with buildpacks**
   ```bash
   cd frontend
   heroku create your-aegis-frontend-app-name
   heroku buildpacks:add heroku/nodejs
   heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static.git
   ```

2. **Add `static.json`** in `frontend` directory:
   ```json
   {
     "root": "dist/",
     "clean_urls": true,
     "routes": {
       "/**": "index.html"
     }
   }
   ```

3. **Update `package.json` build script** (if not already present):
   ```json
   {
     "scripts": {
       "build": "vite build"
     }
   }
   ```

4. **Deploy to Heroku**
   ```bash
   git push heroku main
   ```

### AWS EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu Server 22.04 LTS
   - Instance type: t2.medium or larger
   - Configure security group (ports 80, 443, 8000)

2. **Connect to Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo apt install docker-compose -y
   ```

4. **Clone and Deploy**
   ```bash
   git clone <your-repo>
   cd Aegis-frontend_change
   
   # Configure environment
   nano .env
   
   # Deploy
   docker-compose up -d
   ```

5. **Configure Nginx Reverse Proxy** (Optional)
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/aegis
   ```
   
   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
       }
   }
   ```

6. **Enable HTTPS with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

### Google Cloud Platform

1. **Install Google Cloud SDK**
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

2. **Create Cloud Run Services**
   
   **Backend:**
   ```bash
   cd backend
   gcloud run deploy aegis-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NASA_API_KEY=your_key
   ```
   
   **Frontend:**
   ```bash
   cd frontend
   gcloud run deploy aegis-frontend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Production Optimizations

### Backend Optimizations

1. **Use Production ASGI Server**
   - Uvicorn with multiple workers
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

2. **Enable Caching**
   - Implement Redis for API response caching
   - Cache NASA API responses

3. **Security**
   - Use environment variables for secrets
   - Implement rate limiting
   - Enable HTTPS only
   - Set secure CORS policies

### Frontend Optimizations

1. **Build Optimizations**
   - Code splitting
   - Tree shaking
   - Minification (automatic with Vite)
   - Asset optimization

2. **Performance**
   - Enable compression (gzip/brotli)
   - Implement lazy loading
   - Use CDN for static assets
   - Add service worker for offline support

3. **Security**
   - Content Security Policy (CSP)
   - HTTPS only
   - Security headers

## Monitoring and Maintenance

### Logging

**Backend:**
```python
# Configure structured logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Frontend:**
```javascript
// Use environment-based logging
if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
    console.log('Debug info')
}
```

### Health Checks

- Backend: `GET /health`
- Frontend: `GET /health` (nginx endpoint)

### Monitoring Tools

- **Application Monitoring**: New Relic, DataDog, Sentry
- **Infrastructure Monitoring**: CloudWatch, Stackdriver
- **Uptime Monitoring**: UptimeRobot, Pingdom

### Backup Strategy

1. **Database** (if added): Daily automated backups
2. **Environment Variables**: Store securely in secret manager
3. **Code**: Git repository with proper branching strategy

### Update Process

1. Test changes locally
2. Run all tests
3. Deploy to staging environment
4. Verify functionality
5. Deploy to production
6. Monitor for errors

## Troubleshooting

### Common Issues

**CORS Errors:**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check frontend `VITE_API_BASE_URL` is correct

**API Connection Failed:**
- Verify backend is running
- Check firewall/security group settings
- Verify environment variables are set

**Build Fails:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all environment variables are set

**Container Issues:**
- Check Docker logs: `docker-compose logs`
- Verify port mappings
- Check environment variable configuration

## Support

For issues or questions:
- Check GitHub Issues
- Review application logs
- Check NASA API status: [https://api.nasa.gov/](https://api.nasa.gov/)

## License

[Your License Here]
