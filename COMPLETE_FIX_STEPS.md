# Complete Fix: Backend Not Running

## Current Problem
- Port 8081 has multiple processes (conflict)
- `http://localhost:8081/health` returns Expo manifest (wrong!)
- ngrok shows offline because backend isn't running

## Complete Fix Steps

### Step 1: Kill All Processes on Port 8081

**Run this script:**
```powershell
.\kill-port-8081.ps1
```

**Or manually:**
```powershell
# Find PIDs
netstat -ano | findstr :8081

# Kill each PID (replace <PID> with actual number)
taskkill /PID <PID> /F
```

**Verify port is free:**
```powershell
netstat -ano | findstr :8081
```
Should return nothing.

### Step 2: Start Backend

**Open a NEW terminal window:**

```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**CRITICAL: Wait for this message:**
```
[INFO] Users service is running port: 8081 host: "0.0.0.0"
```

**DO NOT proceed until you see this!**

### Step 3: Test Backend Locally

**In your computer's browser:**
```
http://localhost:8081/health
```

**MUST return:**
```json
{
  "status": "ok",
  "service": "users-service",
  "timestamp": "..."
}
```

**If you get:**
- ❌ Expo manifest → Port 8081 still has wrong process (go back to Step 1)
- ❌ Connection refused → Backend not running (check Step 2)
- ❌ Error → Backend has an error (check backend logs)

**Fix these before proceeding!**

### Step 4: Start ngrok

**Open a NEW terminal window (keep backend running):**

```powershell
ngrok http 8081
```

**Verify:**
- Shows: `Forwarding https://xxx.ngrok-free.dev -> http://localhost:8081`
- Status: `online` (NOT offline)

**If it shows "offline":**
- Backend is not running
- Go back to Step 2

### Step 5: Test ngrok

**In your phone's browser:**
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```

**MUST return:**
```json
{
  "status": "ok",
  "service": "users-service",
  "timestamp": "..."
}
```

**If you get `ERR_NGROK_3200`:**
- Backend is not running
- Go back to Step 2

### Step 6: Update .env

**Make sure `.env` has:**
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_GYM_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_APP_NAME=Fitsera
```

### Step 7: Start Expo

**Only after Steps 1-5 are working:**

```powershell
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --tunnel --port 5173 --clear
```

**Important:** Expo should use port 5173, NOT 8081!

## Verification Checklist

Before starting Expo, verify:

- [ ] Port 8081 is free (no processes using it)
- [ ] Backend is running: `npm run dev` shows "Users service is running port: 8081"
- [ ] `http://localhost:8081/health` returns backend JSON (NOT Expo manifest)
- [ ] ngrok shows "online" status
- [ ] `https://xxx.ngrok-free.dev/health` returns backend JSON (NOT error)
- [ ] `.env` file has correct ngrok URL

## If Still Not Working

1. **Check backend logs** - Are there any errors?
2. **Check database** - Is PostgreSQL running?
3. **Check backend .env** - Does it have correct database URL?
4. **Restart everything** - Kill all, start fresh

## Key Points

✅ **Backend MUST be running on port 8081**
✅ **Test `http://localhost:8081/health` BEFORE starting ngrok**
✅ **Test ngrok BEFORE starting Expo**
✅ **Expo uses port 5173, NOT 8081**

The issue is that the backend isn't actually running. Once you start it properly, everything should work.

