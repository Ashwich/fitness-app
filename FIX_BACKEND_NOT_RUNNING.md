# Fix: Backend Not Running on Port 8081

## Problem
- `http://localhost:8081/health` returns Expo manifest (wrong!)
- ngrok shows `ERR_NGROK_3200` - endpoint is offline
- This means **backend is NOT running on port 8081**

## Root Cause
Something else (possibly Expo) is using port 8081, or the backend isn't started.

## Solution

### Step 1: Kill Everything on Port 8081

```powershell
# Find what's using port 8081
netstat -ano | findstr :8081

# Kill the process (replace <PID> with actual PID from above)
taskkill /PID <PID> /F
```

### Step 2: Verify Port 8081 is Free

```powershell
netstat -ano | findstr :8081
```

Should return nothing (port is free).

### Step 3: Start Backend

**Open a NEW terminal window:**

```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**Wait for this message:**
```
[INFO] Users service is running port: 8081 host: "0.0.0.0"
```

**DO NOT proceed until you see this!**

### Step 4: Test Backend Locally

**In your computer's browser, test:**
```
http://localhost:8081/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "users-service",
  "timestamp": "..."
}
```

**If you get:**
- ❌ Expo manifest → Something else is using port 8081
- ❌ Connection refused → Backend not running
- ❌ Error → Backend has an error

**Fix these issues before proceeding!**

### Step 5: Start ngrok (Backend MUST be running)

**Open a NEW terminal window (keep backend running):**

```powershell
ngrok http 8081
```

**Verify it shows:**
```
Forwarding    https://xxx.ngrok-free.dev -> http://localhost:8081
Session Status    online
```

**If it shows "offline" or errors, the backend is not running!**

### Step 6: Test ngrok

**In your phone's browser:**
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```

**Expected:**
```json
{
  "status": "ok",
  "service": "users-service",
  "timestamp": "..."
}
```

**If you get `ERR_NGROK_3200`:**
- Backend is not running
- Go back to Step 3

### Step 7: Update .env

Make sure `.env` has:
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

### Step 8: Start Expo

**Only after Steps 1-6 are working:**

```powershell
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --tunnel --port 5173 --clear
```

## Verification Checklist

- [ ] Port 8081 is free (nothing using it)
- [ ] Backend is running: `npm run dev` shows "Users service is running port: 8081"
- [ ] `http://localhost:8081/health` returns backend response (NOT Expo manifest)
- [ ] ngrok shows "online" status
- [ ] `https://xxx.ngrok-free.dev/health` returns backend response (NOT error)
- [ ] `.env` file has correct ngrok URL
- [ ] Expo is running on port 5173 (NOT 8081)

## Common Issues

### Issue 1: Expo Using Port 8081
**Symptom:** `http://localhost:8081/health` returns Expo manifest
**Fix:** 
1. Stop Expo
2. Kill process on port 8081
3. Start backend
4. Verify backend responds

### Issue 2: Backend Not Starting
**Symptom:** `npm run dev` shows errors
**Fix:** Check backend logs, fix errors, ensure database is running

### Issue 3: ngrok Can't Connect
**Symptom:** `ERR_NGROK_3200` - endpoint offline
**Fix:** Backend must be running BEFORE starting ngrok

## Critical Test

**This MUST work before proceeding:**

1. Backend running: `http://localhost:8081/health` → Backend response ✅
2. ngrok running: `https://xxx.ngrok-free.dev/health` → Backend response ✅

**If either fails, fix it before starting Expo!**

