# 🔍 Railway Backend Troubleshooting - Check Deployment Logs

## Current Status
- ✅ Environment variables are set (all 6 variables configured)
- ❌ Backend still returning 502 Bad Gateway
- **This means the application isn't starting properly**

---

## 🔧 Next Steps to Fix

### Step 1: Check Deployment Status in Railway

1. Go to your Railway dashboard
2. Click on the **Deployments** tab (in the left sidebar)
3. Look at the latest deployment:
   - 🟢 **Green checkmark** = Deployed successfully
   - 🔴 **Red X** = Deployment failed
   - ⏳ **Loading spinner** = Still deploying

### Step 2: View Deployment Logs

1. In the Deployments tab, click on the **latest deployment**
2. Click the **View Logs** button
3. Look for error messages:

**Common errors to look for:**

```
ModuleNotFoundError: No module named 'xxx'
→ Missing package in requirements.txt

ImportError: cannot import name 'xxx'
→ Code issue or dependency problem

NASA_API_KEY not found
→ Environment variable not loaded (unlikely now)

Address already in use
→ Port configuration issue

Uvicorn running on http://0.0.0.0:xxxx
→ This is GOOD! App started successfully
```

### Step 3: Check Settings Tab

1. Go to **Settings** tab
2. Scroll down to find:
   - **Start Command**: Should be `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: Should be `backend`
   - **Builder**: Should be detected as Python

### Step 4: Force Redeploy

If everything looks correct but still not working:

1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes for redeployment

### Step 5: Check Build Logs vs Runtime Logs

Railway has two types of logs:
- **Build Logs**: Shows installation of dependencies
- **Runtime Logs**: Shows application startup and errors

Make sure to check BOTH!

---

## 🐛 Possible Issues & Solutions

### Issue 1: Port Configuration

**Symptom**: "Address already in use" or "Port binding failed"

**Solution**: 
- Check that PORT environment variable is set to `8000`
- Verify start command uses `$PORT`: `--port $PORT`
- Railway provides its own PORT, so it should use `$PORT` not hardcoded 8000

### Issue 2: Missing Dependencies

**Symptom**: "ModuleNotFoundError: No module named 'fastapi'" (or other packages)

**Solution**:
Check that `backend/requirements.txt` includes:
```
fastapi
uvicorn
python-dotenv
requests
poliastro
astropy
numpy
scipy
```

### Issue 3: Python Version

**Symptom**: "Python version not supported"

**Solution**:
- Railway auto-detects Python version
- Your code uses Python 3.13 (might be too new)
- Add a `runtime.txt` file in backend folder:
  ```
  python-3.11.0
  ```

### Issue 4: File Structure

**Symptom**: "Cannot find module 'main'"

**Solution**:
- Verify Root Directory is set to `backend` in Railway settings
- Ensure `main.py` is in the `backend` folder
- Start command should be: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Issue 5: Environment Variables Not Loading

**Symptom**: Application starts but crashes immediately

**Solution**:
- Variables are set (we can see them)
- But check if they need quotes removed
- Try removing any quotes around values
- Railway handles values as-is

---

## 📋 Quick Diagnostic Checklist

Run through this in Railway dashboard:

### Variables Tab:
- [ ] NASA_API_KEY - has a value (not empty)
- [ ] ALLOWED_ORIGINS - exactly `https://aegis-neo.vercel.app` (no trailing slash)
- [ ] ENVIRONMENT - is `production`
- [ ] PORT - is `8000`
- [ ] DEBUG - is `False` (capital F)
- [ ] LOG_LEVEL - is `INFO`

### Settings Tab:
- [ ] Root Directory: `backend`
- [ ] Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Build Command: (empty or auto-detected)
- [ ] Builder: Python detected

### Deployments Tab:
- [ ] Latest deployment shows success (green checkmark)
- [ ] Build logs show "Successfully installed..." packages
- [ ] Runtime logs show "Uvicorn running on..."
- [ ] No error messages in logs

---

## 🔄 What to Do Next

1. **Check the Railway deployment logs** (most important!)
2. **Share what errors you see** in the logs
3. If logs show "Uvicorn running...", wait 30 seconds and test again:
   ```powershell
   Invoke-RestMethod -Uri "https://aegis-production-1445.up.railway.app/health"
   ```

4. If still failing, check if Railway needs you to:
   - Verify your account
   - Add billing information (even for free tier)
   - Accept terms of service

---

## 💡 Alternative: Check Railway Service Status

1. In Settings tab, look for **Service ID**
2. Make sure the service is:
   - ✅ **Active** (not paused)
   - ✅ **Healthy** (not crashed)
   - ✅ **Deployed** (not building)

---

## 📞 If All Else Fails

If you've checked everything and it's still not working, we can try:

1. **Redeploy from scratch** - Delete and recreate Railway service
2. **Try a different platform** - Render.com or Google Cloud Run
3. **Deploy Docker container** - Use your Dockerfile instead
4. **Check Railway community** - https://help.railway.app/

---

**Next Action**: Check the Railway deployment logs and share what error message you see!
