# Railway Backend Configuration

## ✅ Backend Deployed Successfully!

**Backend URL**: https://aegis-production-1445.up.railway.app

---

## 🔧 Railway Environment Variables

In your Railway dashboard, ensure these environment variables are set:

### Required Variables:

```bash
NASA_API_KEY=your_actual_nasa_api_key
ALLOWED_ORIGINS=https://aegis-neo.vercel.app
ENVIRONMENT=production
PORT=8000
DEBUG=False
LOG_LEVEL=INFO
```

### How to Set Variables in Railway:

1. Go to: https://railway.app/dashboard
2. Click on your `aegis-production-1445` project
3. Go to **Variables** tab
4. Add each variable listed above
5. Railway will automatically redeploy

---

## 🔗 Connect Frontend to Backend

### Step 1: Update Vercel Environment Variables

1. Go to Vercel Dashboard: https://vercel.com/nexions-projects-c33b07cd/aegis-neo
2. Click **Settings** → **Environment Variables**
3. Add/Update these variables:

   ```
   VITE_API_BASE_URL = https://aegis-production-1445.up.railway.app
   VITE_APP_ENV = production
   VITE_ENABLE_DEBUG_LOGGING = false
   ```

4. Select **Production** environment for all variables
5. Click **Save**

### Step 2: Redeploy Frontend

Run this command to redeploy with new environment variables:

```powershell
cd frontend
vercel --prod
```

Or trigger a redeploy from Vercel Dashboard → Deployments → Redeploy

---

## ✅ Verification Checklist

### Backend Health Check:

Test your backend is working:

```powershell
# Test health endpoint
curl https://aegis-production-1445.up.railway.app/health

# Test root endpoint
curl https://aegis-production-1445.up.railway.app/
```

Expected response:
```json
{
  "status": "healthy",
  "nasa_api_configured": true
}
```

### Frontend-Backend Connection:

1. Visit: https://aegis-neo.vercel.app
2. Open browser console (F12)
3. Look for API calls to `aegis-production-1445.up.railway.app`
4. Select an asteroid - should load data without errors

### CORS Configuration:

If you see CORS errors:
- Verify `ALLOWED_ORIGINS` in Railway includes `https://aegis-neo.vercel.app`
- Check there's no trailing slash
- Redeploy backend after updating

---

## 📊 Monitoring

### Railway Dashboard:
- **Logs**: https://railway.app/dashboard → your project → Deployments → Logs
- **Metrics**: View CPU, Memory, Network usage
- **Deployments**: See deployment history

### Endpoints to Monitor:

```
GET  /                          - Root endpoint
GET  /health                    - Health check
GET  /api/asteroids             - Browse asteroids
GET  /api/asteroids/{id}        - Get specific asteroid
POST /api/calculate-trajectory  - Calculate orbit
POST /api/calculate-impact      - Impact simulation
```

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" errors

**Solution**:
1. Check backend is running: Visit https://aegis-production-1445.up.railway.app/health
2. Verify VITE_API_BASE_URL in Vercel matches Railway URL
3. Check Railway logs for errors

### Issue: CORS errors in browser console

**Solution**:
1. Railway → Variables → Update `ALLOWED_ORIGINS`
2. Must be exact match: `https://aegis-neo.vercel.app`
3. No trailing slash
4. Redeploy after updating

### Issue: NASA API errors

**Solution**:
1. Verify `NASA_API_KEY` is set in Railway
2. Check key is valid at https://api.nasa.gov/
3. Check rate limits (1000/hour with API key)
4. View Railway logs for specific error

### Issue: Backend not responding

**Solution**:
1. Check Railway dashboard for deployment status
2. View logs for startup errors
3. Verify all required packages in `requirements.txt`
4. Check PORT is set correctly (Railway auto-assigns)

---

## 💰 Cost & Limits

### Railway Free Tier:
- **$5 credit/month** (usually sufficient for small projects)
- **500 hours/month** execution time
- Auto-sleeps after inactivity (wakes on request)

### Monitor Usage:
- Dashboard → Metrics → Resource Usage
- Set up usage alerts
- Upgrade to Pro if needed ($20/month)

---

## 🚀 Deployment Commands

### Redeploy Frontend (after env variable changes):
```powershell
cd frontend
vercel --prod
```

### Check Backend Logs:
```powershell
# Railway CLI (optional)
railway logs
```

### Test Endpoints:
```powershell
# Health check
curl https://aegis-production-1445.up.railway.app/health

# List asteroids
curl https://aegis-production-1445.up.railway.app/api/asteroids

# Get specific asteroid
curl https://aegis-production-1445.up.railway.app/api/asteroids/3542519
```

---

## 📝 Next Steps

1. **Set Railway Environment Variables** (especially NASA_API_KEY and ALLOWED_ORIGINS)
2. **Update Vercel Environment Variables** (VITE_API_BASE_URL)
3. **Redeploy Frontend** on Vercel
4. **Test Full Application**
5. **Monitor Logs** for any issues
6. **Optional**: Set up custom domain

---

## 🔒 Security Best Practices

✅ **Currently Implemented**:
- HTTPS on both frontend and backend
- CORS restricted to your Vercel domain
- Environment variables for secrets
- No API keys in code

🎯 **Recommended**:
- Enable Railway's built-in DDoS protection
- Set up rate limiting on API endpoints
- Monitor for unusual traffic patterns
- Keep dependencies updated
- Regular security audits

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **NASA API**: https://api.nasa.gov/
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

**Your Full Stack is Now Deployed! 🎉**

- **Frontend**: https://aegis-neo.vercel.app
- **Backend**: https://aegis-production-1445.up.railway.app
- **Repository**: https://github.com/NexionisJake/Aegis
