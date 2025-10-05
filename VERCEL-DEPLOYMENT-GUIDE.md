# Vercel Deployment Guide for Project Aegis

## ✅ Frontend Deployment Status

Your frontend is now deployed on Vercel!

### Frontend URLs:
- **Production URL**: https://aegis-neo.vercel.app
- **Vercel Dashboard**: https://vercel.com/nexions-projects-c33b07cd/aegis-neo

### What Was Deployed:
- ✅ React + Vite frontend
- ✅ Three.js 3D visualization
- ✅ Leaflet maps
- ✅ Production optimizations enabled
- ✅ Security headers configured

---

## 🔧 Backend Deployment Options

Since Vercel is primarily for frontend, you need to deploy the backend separately. Here are the **recommended options**:

### Option 1: Railway (RECOMMENDED) ⭐

Railway is perfect for Python/FastAPI backends with automatic deployments.

#### Steps:

1. **Sign up at Railway**
   - Visit: https://railway.app/
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `NexionisJake/Aegis`
   - Select `backend` as root directory

3. **Configure Service**
   Railway will auto-detect Python. Configure:
   
   **Build Command**: (leave empty - auto-detected)
   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   **Root Directory**: `backend`

4. **Add Environment Variables**
   Go to "Variables" tab and add:
   ```
   NASA_API_KEY=your_actual_nasa_api_key
   ALLOWED_ORIGINS=https://aegis-neo.vercel.app
   ENVIRONMENT=production
   PORT=8000
   DEBUG=False
   LOG_LEVEL=INFO
   ```

5. **Deploy**
   - Railway will automatically deploy
   - You'll get a URL like: `https://aegis-backend-production.up.railway.app`

6. **Update Frontend Environment Variable**
   - Go to Vercel Dashboard → aegis-neo → Settings → Environment Variables
   - Add/Update: `VITE_API_BASE_URL` = `https://your-railway-backend-url.up.railway.app`
   - Redeploy frontend: `vercel --prod`

---

### Option 2: Render

Free tier available, good for Python apps.

#### Steps:

1. **Sign up at Render**
   - Visit: https://render.com/
   - Sign in with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect `NexionisJake/Aegis` repository
   - Configure:
     - **Name**: aegis-backend
     - **Root Directory**: backend
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**
   ```
   NASA_API_KEY=your_actual_nasa_api_key
   ALLOWED_ORIGINS=https://aegis-neo.vercel.app
   ENVIRONMENT=production
   DEBUG=False
   ```

4. **Deploy & Update Frontend**
   - Get your Render URL: `https://aegis-backend.onrender.com`
   - Update VITE_API_BASE_URL in Vercel

---

### Option 3: Google Cloud Run

Serverless, pay-per-use, great for production.

#### Steps:

1. **Install Google Cloud SDK**
   ```bash
   # Download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Login and Set Project**
   ```bash
   gcloud auth login
   gcloud config set project your-project-id
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   gcloud run deploy aegis-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NASA_API_KEY=your_key,ALLOWED_ORIGINS=https://aegis-neo.vercel.app
   ```

4. **Get URL and Update Frontend**
   - Cloud Run provides URL: `https://aegis-backend-xxxxx-uc.a.run.app`
   - Update VITE_API_BASE_URL in Vercel

---

### Option 4: Vercel Serverless Functions (Experimental)

You can deploy the backend as Vercel serverless functions, but this requires restructuring.

**Not recommended** for this project due to:
- FastAPI complexity
- NASA API integration
- Better suited for traditional deployment

---

## 🔄 Complete Deployment Workflow

### Initial Setup:

1. ✅ **Frontend on Vercel** (DONE)
   - URL: https://aegis-neo.vercel.app
   - Auto-deploys from main branch

2. **Backend on Railway** (TO DO)
   - Deploy backend following Option 1 above
   - Get Railway URL

3. **Connect Frontend to Backend**
   ```bash
   # In Vercel Dashboard
   # Add environment variable:
   VITE_API_BASE_URL=https://your-railway-backend-url
   
   # Redeploy frontend
   vercel --prod
   ```

4. **Test Deployment**
   - Visit https://aegis-neo.vercel.app
   - Check browser console for API connection
   - Test asteroid selection and visualizations

---

## 📝 Post-Deployment Checklist

### Frontend (Vercel):
- [x] Deployed successfully
- [ ] Custom domain configured (optional)
- [ ] Environment variables set
- [ ] HTTPS working
- [ ] Connected to backend

### Backend:
- [ ] Deployed to Railway/Render/GCP
- [ ] NASA API key configured
- [ ] CORS origins include Vercel domain
- [ ] Health check endpoint working
- [ ] API documentation accessible

### Integration:
- [ ] Frontend can reach backend API
- [ ] CORS working properly
- [ ] NASA data loading
- [ ] 3D visualizations rendering
- [ ] All features functional

---

## 🔍 Troubleshooting

### Frontend Issues:

**1. API Connection Failed**
```
Check browser console
Verify VITE_API_BASE_URL in Vercel
Ensure backend is deployed and running
```

**2. CORS Errors**
```
Backend ALLOWED_ORIGINS must include: https://aegis-neo.vercel.app
Redeploy backend after updating environment variables
```

**3. Build Failures**
```
Check build logs in Vercel Dashboard
Verify all dependencies in package.json
Clear build cache and redeploy
```

### Backend Issues:

**1. Backend Not Starting**
```
Check Railway/Render logs
Verify requirements.txt includes all dependencies
Check NASA_API_KEY is set
```

**2. NASA API Errors**
```
Verify API key is valid
Check rate limits (1000 req/hour with registered key)
Implement caching to reduce API calls
```

**3. Port Issues**
```
Use $PORT environment variable (Railway/Render provide this)
Don't hardcode port 8000 in start command
```

---

## 🚀 Quick Deploy Commands

### Frontend (Already Deployed):
```bash
# Redeploy frontend
vercel --prod

# View logs
vercel logs

# Open in browser
vercel open
```

### Backend (Railway):
```bash
# Railway will auto-deploy from GitHub
# Monitor at: https://railway.app/dashboard
```

---

## 📊 Monitoring & Maintenance

### Vercel:
- Dashboard: https://vercel.com/dashboard
- View deployments, logs, and analytics
- Set up deployment notifications

### Railway:
- Dashboard: https://railway.app/dashboard
- View logs, metrics, and resource usage
- Monitor costs (free $5/month credit)

### Recommended Tools:
- **Sentry**: Error tracking
- **UptimeRobot**: Uptime monitoring
- **Google Analytics**: User analytics

---

## 💡 Tips

1. **Use Environment Variables**
   - Never commit API keys
   - Use Vercel/Railway secret management
   - Keep .env files in .gitignore

2. **Monitor Costs**
   - Vercel: Free tier generous
   - Railway: $5/month free credit
   - Set up billing alerts

3. **Performance**
   - Enable caching for NASA API
   - Use CDN (automatic on Vercel)
   - Optimize images and assets

4. **Security**
   - Always use HTTPS
   - Configure CORS properly
   - Keep dependencies updated

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **NASA API**: https://api.nasa.gov/

---

## 🎯 Next Steps

1. **Deploy Backend** using Railway (Option 1)
2. **Update Frontend** with backend URL
3. **Test Full Application**
4. **Set up Monitoring**
5. **Configure Custom Domain** (optional)

Good luck with your deployment! 🚀
