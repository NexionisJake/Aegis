# Railway Deployment Guide

## Backend Deployment (Railway)

### Environment Variables Required:
```
NASA_API_KEY=GTQf59A5LtPISGNd4UiZriVbMuKRjGw1D3Y54TbI
GEMINI_API_KEY=AIzaSyBMaYBWhoFUwX6ZH-vU-loH4LZrUsAu_1g
PYTHON_VERSION=3.11
```

### Start Command:
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Build Command (if needed):
```bash
cd backend && pip install -r requirements.txt
```

### Root Directory:
Set to `/` (project root)

### Important Notes:
1. **Absolute Imports**: Backend uses absolute imports (not relative) for Railway compatibility
2. **Working Directory**: Commands start from project root, so use `cd backend` prefix
3. **Port**: Railway automatically provides `$PORT` environment variable
4. **Python Version**: Use Python 3.11 (Railway default) for compatibility

### Deployment Steps:
1. Connect your GitHub repository to Railway
2. Select the `main` branch
3. Add environment variables in Railway dashboard
4. Railway will automatically detect Python and deploy
5. Get your deployment URL from Railway dashboard

### Testing Your Deployment:
```bash
# Test asteroid list endpoint
curl https://your-railway-url.up.railway.app/api/asteroids/enhanced-list

# Test API docs
Open: https://your-railway-url.up.railway.app/docs
```

### Troubleshooting:

**Import Errors:**
- ✅ Fixed: All imports are now absolute (not relative)
- If you see `ImportError: attempted relative import`, imports weren't updated

**Module Not Found:**
- Check that `cd backend` is in start command
- Verify `requirements.txt` includes all dependencies

**Port Binding:**
- Use `--port $PORT` (Railway provides this)
- Don't hardcode port 8000

**API Key Issues:**
- Ensure environment variables are set in Railway dashboard
- Keys must be exact (no quotes needed in Railway UI)

### Health Check:
Once deployed, visit:
- `https://your-url.up.railway.app/` - Should return API info
- `https://your-url.up.railway.app/docs` - FastAPI documentation
- `https://your-url.up.railway.app/api/asteroids/enhanced-list` - Test endpoint

## Frontend Deployment (Vercel)

### Environment Variables Required:
```
VITE_API_BASE_URL=https://your-railway-url.up.railway.app
```

### Build Settings:
- **Framework Preset**: Vite
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

### Deployment Steps:
1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend` OR use custom build command
3. Add `VITE_API_BASE_URL` environment variable
4. Deploy

### CORS Configuration:
Backend already has CORS configured to allow all origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, update to specific Vercel domain:
```python
allow_origins=["https://your-vercel-app.vercel.app"]
```

## Complete Deployment Checklist:

### Railway (Backend):
- [ ] Repository connected
- [ ] `NASA_API_KEY` environment variable set
- [ ] `GEMINI_API_KEY` environment variable set
- [ ] Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Deployment successful
- [ ] Test `/docs` endpoint
- [ ] Test `/api/asteroids/enhanced-list` endpoint
- [ ] Copy Railway URL

### Vercel (Frontend):
- [ ] Repository connected
- [ ] `VITE_API_BASE_URL` set to Railway URL
- [ ] Build successful
- [ ] Frontend loads
- [ ] Can fetch asteroid list
- [ ] Can simulate impact
- [ ] Map overlay works
- [ ] AI analysis displays

## Post-Deployment Verification:

1. Open frontend URL
2. Check browser console for errors
3. Select an asteroid from sidebar
4. Click on Earth to select location
5. Click "Simulate Impact"
6. Verify zoom animation works
7. Verify map overlay appears
8. Check impact statistics display
9. Verify AI analysis loads
10. Test Reset View button

## Support:
If deployment fails, check:
1. Railway logs for backend errors
2. Vercel build logs for frontend errors
3. Browser console for API connection errors
4. Network tab for failed requests
