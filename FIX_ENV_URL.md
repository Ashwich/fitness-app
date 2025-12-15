# Fix: Expo Manifest Error - Wrong URL Configuration

## Problem
Your API requests are returning Expo manifest data instead of backend responses, even though ngrok is correctly forwarding to the backend.

## Root Cause
The `.env` file either:
1. Doesn't exist
2. Has the wrong URL format
3. Includes port number in ngrok URL (shouldn't)

## Solution

### Step 1: Create/Update .env File

Create a `.env` file in your project root (`C:\Users\Lenovo\Desktop\fitsera-app\.env`) with:

```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_GYM_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
EXPO_PUBLIC_APP_NAME=Fitsera
```

**IMPORTANT:**
- ✅ Use `https://` (not `http://`)
- ✅ NO port number (`:8081` should NOT be in the URL)
- ✅ NO `/api/users` path (the code adds it automatically)
- ✅ Just the ngrok domain: `https://unpersonalised-carlota-uncomplexly.ngrok-free.dev`

### Step 2: Verify Backend is Running

Make sure your backend is running on port 8081:
```bash
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

Should see: "Users service is running port: 8081"

### Step 3: Verify ngrok is Pointing to Backend

Test in your phone's browser:
```
https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health
```

Should return: `{"status":"ok","service":"users-service",...}`

If you see Expo manifest, ngrok is pointing to the wrong service.

### Step 4: Restart Expo with Clear Cache

```bash
npx expo start --tunnel --port 5173 --clear
```

The `--clear` flag ensures the new `.env` values are loaded.

### Step 5: Check Console Logs

When the app starts, you should see:
```
[Config] Backend URL: https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/api/users
[Config] Base URL (normalized): https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

If you see a different URL, the `.env` file isn't being read correctly.

## Common Mistakes

❌ **Wrong:**
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev:8081
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/api/users
EXPO_PUBLIC_USERS_SERVICE_URL=http://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

✅ **Correct:**
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev
```

## Still Not Working?

1. Check if `.env` file is in the project root (same folder as `package.json`)
2. Make sure there are no spaces around the `=` sign
3. Restart Expo with `--clear` flag
4. Check console logs for the actual URL being used

