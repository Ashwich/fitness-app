# 🚀 Quick Start: ngrok Setup (5 Minutes)

## Step 1: Download ngrok
1. Go to: **https://ngrok.com/download**
2. Download **Windows** version
3. Extract `ngrok.exe` to `C:\ngrok\` (or any folder you remember)

## Step 2: Sign up for Free Account
1. Go to: **https://dashboard.ngrok.com/signup**
2. Create a free account (takes 30 seconds)
3. After signup, go to: **https://dashboard.ngrok.com/get-started/your-authtoken**
4. **Copy your authtoken** (looks like: `2abc123def456ghi789jkl012mno345pq_6r7s8t9u0v1w2x3y4z5`)

## Step 3: Configure ngrok
Open PowerShell and run:
```powershell
C:\ngrok\ngrok.exe config add-authtoken YOUR_AUTHTOKEN_HERE
```
(Replace `YOUR_AUTHTOKEN_HERE` with the token you copied)

## Step 4: Start ngrok Tunnel
1. Make sure your backend is running (in one terminal):
   ```bash
   cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
   npm run dev
   ```

2. Open a **NEW** PowerShell terminal and run:
   ```powershell
   C:\ngrok\ngrok.exe http 8081
   ```

3. You'll see something like:
   ```
   Forwarding  https://abc123-def456.ngrok-free.app -> http://localhost:8081
   ```

4. **Copy the HTTPS URL** (the `https://abc123-def456.ngrok-free.app` part)

## Step 5: Update .env File
1. Open `.env` file in your project: `C:\Users\Lenovo\Desktop\fitsera-app\.env`
2. Replace the content with:
   ```
   EXPO_PUBLIC_USERS_SERVICE_URL=https://YOUR_NGROK_URL_HERE
   EXPO_PUBLIC_GYM_SERVICE_URL=https://YOUR_NGROK_URL_HERE
   EXPO_PUBLIC_APP_NAME=Fitsera
   ```
   (Replace `YOUR_NGROK_URL_HERE` with your actual ngrok URL, e.g., `abc123-def456.ngrok-free.app`)

## Step 6: Restart Expo
```bash
cd C:\Users\Lenovo\Desktop\fitsera-app
npx expo start --clear
```

## Step 7: Test!
1. Connect your phone via Expo Go
2. Try registering a user
3. Check backend console - you should see the request! ✅

---

## ⚠️ Important Notes:
- **Keep ngrok running** in a separate terminal while testing
- The ngrok URL changes each time you restart it (free plan)
- If you restart ngrok, update the `.env` file with the new URL

---

## 🎯 That's it! Your app should now work on your real device!

