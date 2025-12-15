# Registration Error Fix

## Problem
Registration is returning Expo manifest data instead of API response. This means the request is hitting the Expo dev server instead of your backend.

## Root Cause
The ngrok URL in your `.env` file might be pointing to the Expo dev server (port 8081) instead of your backend API.

## Solution

### Step 1: Check Your ngrok Setup
Make sure ngrok is pointing to your **backend** (users-service), not the Expo dev server:

```bash
# In a terminal, run:
ngrok http 8081
```

**Important**: This should tunnel to your backend running on port 8081, NOT the Expo dev server.

### Step 2: Verify Backend is Running
In a separate terminal, make sure your backend is running:
```bash
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

You should see: "Users service is running port: 8081"

### Step 3: Check Your .env File
Open `.env` in your project root and verify:
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

**DO NOT** include `/api/users` in the URL - the code adds that automatically.

### Step 4: Test Backend Directly
Test if your backend is accessible through ngrok:
1. Open browser on your phone
2. Go to: `https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health`
3. You should see: `{"status":"ok","service":"users-service",...}`

If you see Expo manifest instead, ngrok is pointing to the wrong service.

### Step 5: Restart Everything
1. Stop ngrok (Ctrl+C)
2. Stop backend (Ctrl+C)
3. Restart backend: `npm run dev`
4. Restart ngrok: `ngrok http 8081`
5. Update `.env` with new ngrok URL if it changed
6. Restart Expo: `npx expo start --clear`

## Alternative: Use Different Ports
If port 8081 conflicts with Expo:
1. Change backend port to 8082 in backend `.env`
2. Update ngrok: `ngrok http 8082`
3. Update frontend `.env`: `EXPO_PUBLIC_USERS_SERVICE_URL=https://your-ngrok-url.ngrok-free.dev`

