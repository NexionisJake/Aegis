# ⚠️ Railway Backend Not Running - Fix Required

## Problem
Your Railway backend is returning **502 Bad Gateway** errors. This means the application isn't starting properly.

## Most Likely Cause
**Missing Environment Variables** - Specifically the `NASA_API_KEY`

---

## 🔧 Quick Fix Steps

### Step 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Find your project: **aegis-production-1445**
3. Click on the project to open it

### Step 2: Add Environment Variables
1. Click on the **Variables** tab (left sidebar)
2. Click **+ New Variable** button
3. Add these variables ONE BY ONE:

#### Required Variables:

```
NASA_API_KEY
Value: [Get your key from https://api.nasa.gov/]

ALLOWED_ORIGINS
Value: https://aegis-neo.vercel.app

ENVIRONMENT
Value: production

PORT
Value: 8000

DEBUG
Value: False

LOG_LEVEL
Value: INFO
```

### Step 3: Check Deployment Logs
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **View Logs**
4. Look for errors - most likely "NASA_API_KEY not found" or similar

### Step 4: Verify Settings
In Railway project settings, verify:
- **Root Directory**: Should be `backend`
- **Start Command**: Should be `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Build Command**: Can be empty (Railway auto-detects Python)

---

## 🔑 Get NASA API Key (if you don't have one)

1. Go to: https://api.nasa.gov/
2. Fill in the form:
   - First Name: Your name
   - Last Name: Your last name
   - Email: Your email
3. Click "Signup"
4. Check your email for the API key
5. Copy the key and paste it in Railway's `NASA_API_KEY` variable

**Note**: Without an API key, the default "DEMO_KEY" only allows 30-50 requests per day and may fail.

---

## 📋 Checklist

- [ ] Railway dashboard opened
- [ ] Environment variables added (especially NASA_API_KEY)
- [ ] Checked deployment logs for errors
- [ ] Verified root directory is `backend`
- [ ] Waited for Railway to redeploy (happens automatically)
- [ ] Tested health endpoint again

---

## 🧪 After Configuration - Test Again

Once you've added the environment variables, Railway will automatically redeploy. Wait 1-2 minutes, then test:

### PowerShell Test:
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://aegis-production-1445.up.railway.app/health"
```

Expected response:
```json
{
  "status": "healthy",
  "nasa_api_configured": true
}
```

### Or run the full test:
```powershell
cd "c:\Users\abhi2\OneDrive\Desktop\satwik nasa\Aegis-frontend_change"
.\test-deployment.ps1
```

---

## 🐛 Alternative: Check Railway Logs

If backend still doesn't work after adding variables:

1. Railway Dashboard → Your Project
2. Deployments tab → Latest deployment
3. **View Logs** button
4. Look for specific error messages
5. Common errors:
   - "ModuleNotFoundError" - missing dependencies in requirements.txt
   - "NASA_API_KEY" - API key not set
   - "Port already in use" - PORT variable issue
   - "Connection refused" - application not starting

---

## 📞 Need Help?

If you're still seeing errors:
1. Share the Railway deployment logs
2. Verify all files in `backend/` directory
3. Check `backend/requirements.txt` includes all dependencies
4. Ensure Python version is compatible (3.11+)

---

## ✅ Success Indicators

When backend is working, you should see:
- ✅ Health endpoint returns 200 OK
- ✅ Railway logs show "Uvicorn running on..."
- ✅ No 502 errors
- ✅ Frontend can fetch asteroid data

---

**Next**: After fixing Railway, rerun `.\test-deployment.ps1` to verify everything works!
