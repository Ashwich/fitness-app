# Fix: Expo Tunnel + ngrok Conflict

## The Problem
- Without `--tunnel`: Phone can't connect to Expo (timeout)
- With `--tunnel`: Expo's tunnel conflicts with ngrok, causing API requests to return Expo manifest

## The Solution
Use BOTH tunnels, but keep them separate:
- **Expo `--tunnel`**: For Expo dev server (so phone can connect)
- **ngrok**: For backend API (separate URL)

## Step-by-Step Fix

### Step 1: Stop Everything
Press `Ctrl+C` in all terminals (Expo, ngrok, Backend)

### Step 2: Start Backend
```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```
Wait for: `"Users service is running port: 8081"`

### Step 3: Start ngrok for Backend
```powershell
ngrok http 8081
```
**Copy the HTTPS URL** (e.g., `https://unpersonalised-carlota-uncomplexly.ngrok-free.dev`)

### Step 4: Test ngrok Backend
**In your phone's browser:**
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```
**Should return:** `{"status":"ok","service":"users-service"}`

**If you get Expo manifest, stop ngrok and restart it (make sure Expo is not running yet)**

### Step 5: Update .env File
Make sure `.env` has the **ngrok URL** (for backend API):
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_GYM_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_APP_NAME=Fitsera
```

### Step 6: Start Expo WITH --tunnel
```powershell
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --tunnel --port 5173 --clear
```

**Important:** 
- Expo will create its own tunnel URL (e.g., `exp://xxx.tunnel.exp.direct`)
- This is ONLY for the Expo dev server
- Your app will use the ngrok URL (from .env) for API calls

### Step 7: Connect Phone to Expo
- Scan the QR code with Expo Go
- Phone should connect to Expo's tunnel

### Step 8: Verify API Calls
When you login/register, check:
1. **Backend logs** - Should see: `[INFO] Incoming request method: "POST" path: "/api/users/login"`
2. **App should work** - Login/register should succeed

## How It Works

```
Phone → Expo Tunnel → Expo Dev Server (port 5173)
                    ↓
              App Code Loads
                    ↓
Phone → ngrok URL → Backend API (port 8081)
```

- **Expo tunnel**: Only for loading the app code
- **ngrok**: Only for backend API calls
- They don't conflict because they serve different purposes

## Troubleshooting

### If API calls still return Expo manifest:

1. **Check .env file:**
   - Should have ngrok URL: `https://xxx.ngrok-free.dev`
   - Should NOT have Expo tunnel URL
   - Should NOT have port number

2. **Verify ngrok is forwarding to backend:**
   - Test: `https://xxx.ngrok-free.dev/health` in phone browser
   - Should return backend response, NOT Expo manifest

3. **Check backend logs:**
   - When you login, backend should show the request
   - If no request appears, ngrok is routing to Expo

4. **Restart ngrok:**
   - Stop ngrok (Ctrl+C)
   - Make sure backend is running on port 8081
   - Start ngrok: `ngrok http 8081`
   - Update .env with new URL if it changed
   - Restart Expo with `--clear`

## Key Points

✅ **Use Expo `--tunnel`** - So phone can connect to Expo dev server
✅ **Use ngrok separately** - For backend API calls
✅ **Keep URLs separate** - Expo tunnel URL ≠ ngrok URL
✅ **.env points to ngrok** - For API calls, not Expo tunnel

The confusion was thinking they conflict - they don't! They serve different purposes:
- Expo tunnel = App code delivery
- ngrok = Backend API access

