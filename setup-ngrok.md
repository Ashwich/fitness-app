# Quick Fix: Use ngrok for HTTPS Tunnel

## Step 1: Install ngrok
Download from: https://ngrok.com/download
Or use chocolatey: `choco install ngrok`

## Step 2: Start ngrok tunnel
In a new terminal (keep backend running):
```bash
ngrok http 8081
```

## Step 3: Copy the HTTPS URL
You'll see something like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8081
```

## Step 4: Update .env file
Update your `.env` file with the ngrok HTTPS URL:
```
EXPO_PUBLIC_USERS_SERVICE_URL=https://abc123.ngrok-free.app
```

## Step 5: Restart Expo
```bash
npx expo start --clear
```

Now your app will use HTTPS and Expo Go will allow the connection!

