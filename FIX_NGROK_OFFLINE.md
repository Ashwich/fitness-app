# Fix: ngrok Endpoint Offline

## The Problem
You're seeing: "The endpoint unpersonalised-carlota-uncomplexly.ngrok-free.dev is offline"

This means ngrok tunnel has disconnected.

## Quick Fix

### Step 1: Restart ngrok
1. Go to the terminal where ngrok is running
2. Stop it (Ctrl+C)
3. Start it again:
   ```bash
   ngrok http 8081
   ```

### Step 2: Get New URL (if it changed)
If you get a NEW URL, update your `.env` file:
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://NEW_NGROK_URL_HERE
EXPO_PUBLIC_GYM_SERVICE_URL=https://NEW_NGROK_URL_HERE
EXPO_PUBLIC_APP_NAME=Fitsera
```

### Step 3: Restart Expo
```bash
npx expo start --clear
```

## Keep ngrok Running
- **Keep the ngrok terminal open** while testing
- If ngrok disconnects, just restart it
- Free ngrok URLs change when you restart (unless you have a paid plan)

## Alternative: Use ngrok with Fixed Domain (Paid)
If you want a permanent URL, upgrade to ngrok paid plan for fixed domains.

