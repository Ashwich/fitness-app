# Diagnose ngrok Routing Issue

## Current Problem
Even after setup, API requests are returning Expo manifest instead of backend responses.

## Root Cause
ngrok is forwarding requests to Expo instead of the backend. This happens when:
1. ngrok is forwarding to the wrong port
2. Expo's tunnel is intercepting requests
3. Backend is not running on port 8081

## Diagnostic Steps

### Step 1: Verify Backend is Running

**Check if backend is actually running:**
```powershell
netstat -ano | findstr :8081
```

Should show Node.js process listening on port 8081.

**Test backend locally:**
```
http://localhost:8081/health
```

Should return: `{"status":"ok","service":"users-service"}`

### Step 2: Check ngrok Configuration

**Verify ngrok is forwarding to port 8081:**
When you run `ngrok http 8081`, it should show:
```
Forwarding    https://xxx.ngrok-free.dev -> http://localhost:8081
```

**NOT:**
```
Forwarding    https://xxx.ngrok-free.dev -> http://localhost:5173
```

### Step 3: Test ngrok Directly

**In your phone's browser, test:**
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

**If you get Expo manifest:**
- ngrok is forwarding to Expo (WRONG)
- Stop ngrok and restart it
- Make sure backend is running FIRST
- Make sure Expo is NOT running when you test

### Step 4: Check ngrok Web Interface

**Open ngrok web interface:**
```
http://127.0.0.1:4040
```

**Check:**
1. What port is ngrok forwarding to? (Should be 8081)
2. What requests are coming in?
3. What responses are being returned?

### Step 5: Verify .env File

**Check your .env file:**
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

**Should be:**
- ✅ Starts with `https://`
- ✅ No port number (`:8081` should NOT be in URL)
- ✅ No `/api/users` path
- ✅ Just the ngrok domain

### Step 6: Check Request URL in Logs

**When you try to login, check the logs:**
```
[API Request] POST https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/api/users/login
```

**If the URL is wrong, the .env file needs to be updated.**

## Solution: Complete Restart

### Step 1: Stop Everything
```powershell
# Stop Expo (Ctrl+C)
# Stop ngrok (Ctrl+C)
# Stop Backend (Ctrl+C)
```

### Step 2: Kill Any Process on Port 8081
```powershell
netstat -ano | findstr :8081
# Note the PID, then:
taskkill /PID <PID> /F
```

### Step 3: Start Backend FIRST
```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**Wait for:** `"Users service is running port: 8081"`

**Test:** `http://localhost:8081/health` should work

### Step 4: Start ngrok (Backend MUST be running)
```powershell
ngrok http 8081
```

**Verify it shows:** `Forwarding https://xxx.ngrok-free.dev -> http://localhost:8081`

### Step 5: Test ngrok BEFORE Starting Expo
**In phone browser:**
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```

**MUST return backend response, NOT Expo manifest!**

**If you get Expo manifest:**
- ngrok is wrong
- Stop ngrok
- Make sure backend is running
- Restart ngrok: `ngrok http 8081`

### Step 6: Update .env (if ngrok URL changed)
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

### Step 7: Start Expo
```powershell
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --tunnel --port 5173 --clear
```

### Step 8: Test Login
**Check backend logs - should see:**
```
[INFO] Incoming request method: "POST" path: "/api/users/login"
```

## Common Issues

### Issue 1: ngrok Forwarding to Wrong Port
**Symptom:** `/health` returns Expo manifest
**Fix:** Restart ngrok, make sure it says `-> http://localhost:8081`

### Issue 2: Backend Not Running
**Symptom:** `/health` returns connection error
**Fix:** Start backend first, then ngrok

### Issue 3: Expo Intercepting Requests
**Symptom:** Requests work when Expo is stopped, fail when Expo is running
**Fix:** Test ngrok BEFORE starting Expo. If it works, then Expo is fine.

### Issue 4: Wrong URL in .env
**Symptom:** Request URL in logs is wrong
**Fix:** Update .env with correct ngrok URL (no port, no /api/users)

## Critical Test

**This test MUST pass before proceeding:**

1. Start backend
2. Start ngrok
3. **DO NOT start Expo yet**
4. Test in phone browser: `https://xxx.ngrok-free.dev/health`
5. **MUST return backend response**

**If this fails, ngrok is not configured correctly. Fix it before starting Expo.**

