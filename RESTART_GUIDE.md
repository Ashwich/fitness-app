# Complete Restart Guide - Fix ngrok Routing Issue

## Current Problem
ngrok is routing requests to Expo instead of your backend. When you access the ngrok URL, you get Expo manifest instead of backend responses.

## Solution: Restart Everything in Correct Order

### Step 1: Stop ALL Running Services

**Stop these in order:**
1. **Stop Expo** - Press `Ctrl+C` in the Expo terminal
2. **Stop ngrok** - Press `Ctrl+C` in the ngrok terminal  
3. **Stop Backend** - Press `Ctrl+C` in the backend terminal

**Verify nothing is running on port 8081:**
```powershell
netstat -ano | findstr :8081
```
If you see any process, note the PID and kill it:
```powershell
taskkill /PID <PID> /F
```

### Step 2: Start Backend First

**Open a NEW terminal window:**

```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**Wait for this message:**
```
[INFO] Users service is running port: 8081 host: "0.0.0.0"
```

**✅ DO NOT proceed until you see this message!**

### Step 3: Test Backend Locally

**In a browser on your computer, test:**
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

**If you get an error, the backend is not running correctly. Fix it before proceeding.**

### Step 4: Start ngrok

**Open a NEW terminal window (keep backend running):**

```powershell
ngrok http 8081
```

**Wait for ngrok to start. You should see:**
```
Forwarding    https://unpersonalised-carlota-uncomplexly.ngrok-free.dev -> http://localhost:8081
```

**✅ Copy the HTTPS URL (the one WITHOUT :8081 at the end)**

### Step 5: Test ngrok Backend Connection

**In your phone's browser, test:**
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "users-service",
  "timestamp": "..."
}
```

**❌ If you get Expo manifest, ngrok is still routing to Expo.**
**✅ If you get backend response, ngrok is working correctly!**

### Step 6: Update .env File

**Make sure your `.env` file has (NO port number, NO /api/users):**
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_GYM_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_APP_NAME=Fitsera
```

### Step 7: Start Expo WITHOUT --tunnel

**Open a NEW terminal window (keep backend and ngrok running):**

```powershell
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --port 5173 --clear
```

**⚠️ IMPORTANT: NO `--tunnel` flag!**

**Wait for Expo to start. You should see a QR code.**

### Step 8: Test Login/Register

**In your app, try to login or register.**

**Check backend logs - you should see:**
```
[INFO] Incoming request method: "POST" path: "/api/users/login"
```

**If you see this, the request is reaching the backend! ✅**

## Verification Checklist

- [ ] Backend is running on port 8081
- [ ] `http://localhost:8081/health` returns backend response
- [ ] ngrok is forwarding to `http://localhost:8081`
- [ ] `https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health` returns backend response (NOT Expo manifest)
- [ ] `.env` file has correct URL (no port, no /api/users)
- [ ] Expo is running WITHOUT `--tunnel` flag
- [ ] Backend logs show incoming requests when you try to login

## If Still Not Working

1. **Check ngrok web interface:** `http://127.0.0.1:4040`
   - Look at request history
   - See what URLs are being requested
   - Check if requests are reaching ngrok

2. **Check backend logs:**
   - Are requests appearing in backend console?
   - If NO requests appear, ngrok is routing to wrong service

3. **Verify port 8081:**
   ```powershell
   netstat -ano | findstr :8081
   ```
   Should show your backend Node.js process

4. **Restart ngrok:**
   - Stop ngrok (Ctrl+C)
   - Start again: `ngrok http 8081`
   - Get new URL if it changed
   - Update `.env` file with new URL
   - Restart Expo with `--clear`

## Common Mistakes

❌ **Wrong:**
- Starting Expo with `--tunnel`
- Using ngrok URL with `:8081` at the end
- Starting services in wrong order
- Not clearing Expo cache

✅ **Correct:**
- Expo without `--tunnel`
- ngrok URL without port number
- Backend → ngrok → Expo (in that order)
- Using `--clear` flag with Expo

