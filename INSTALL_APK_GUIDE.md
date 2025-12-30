# Installing APK on Android - Troubleshooting Guide

## Common Installation Issues

### 1. Version Mismatch Error

**Problem:** "App not installed" or "Version mismatch" error

**Solution:**
1. **Uninstall the old app first:**
   - Go to Settings → Apps → Find "fitsera-app" or "Fitsera"
   - Tap "Uninstall"
   - Or long-press the app icon → Uninstall

2. **Then install the new APK:**
   - Download the new APK
   - Open it and install

### 2. "App not installed" Error

**Possible Causes & Solutions:**

#### A. Unknown Sources Not Enabled
1. Go to **Settings → Security** (or **Settings → Apps → Special access**)
2. Enable **"Install unknown apps"** or **"Unknown sources"**
3. Select your file manager/browser and enable it
4. Try installing again

#### B. Storage Permission
1. Go to **Settings → Apps → [Your File Manager]**
2. Enable **Storage** permission
3. Try installing again

#### C. Corrupted APK
1. Re-download the APK file
2. Make sure download completed fully
3. Try installing again

### 3. "Package appears to be invalid" Error

**Solution:**
1. Delete the downloaded APK
2. Re-download from Expo dashboard
3. Make sure you're using the correct APK (not AAB file)

### 4. Android Version Compatibility

**Minimum Requirements:**
- Android 5.0 (API 21) or higher
- At least 50 MB free storage

**Check your Android version:**
- Settings → About phone → Android version

### 5. Insufficient Storage

**Solution:**
1. Free up at least 100 MB of storage
2. Delete unused apps or files
3. Try installing again

## Step-by-Step Installation

### Method 1: Direct Installation

1. **Download APK** to your phone
2. **Open Downloads** folder (or wherever you saved it)
3. **Tap the APK file**
4. If prompted, tap **"Install"**
5. If you see "Blocked by Play Protect":
   - Tap **"Install anyway"** or **"More details"** → **"Install anyway"**
6. Wait for installation to complete
7. Tap **"Open"** to launch the app

### Method 2: Using ADB (Advanced)

If direct installation fails:

```bash
# Connect phone via USB
# Enable USB Debugging in Developer Options
adb install path/to/app.apk
```

## Enabling Unknown Sources (Different Android Versions)

### Android 8.0+ (Oreo and above)
1. Settings → Apps → Special access
2. Install unknown apps
3. Select your browser/file manager
4. Enable "Allow from this source"

### Android 7.0 and below
1. Settings → Security
2. Enable "Unknown sources"
3. Confirm with "OK"

## Developer Options (If Needed)

1. Go to **Settings → About phone**
2. Tap **Build number** 7 times
3. Go back to **Settings**
4. Find **Developer options**
5. Enable **USB debugging** (if using ADB)

## Still Having Issues?

### Check These:

1. **APK File Size:**
   - Should be around 30-50 MB
   - If much smaller, download might be corrupted

2. **Android Version:**
   - Must be Android 5.0+ (Lollipop)
   - Check: Settings → About phone

3. **Storage Space:**
   - Need at least 100 MB free
   - Check: Settings → Storage

4. **Previous Installation:**
   - Make sure old version is completely uninstalled
   - Restart phone after uninstalling

5. **Download Source:**
   - Download directly from Expo dashboard
   - Don't use third-party downloaders

## Rebuild with Higher Version

If you still get version mismatch:

1. The version has been updated to:
   - Version: 1.0.1
   - Version Code: 2

2. Rebuild the APK:
   ```bash
   eas build --platform android --profile preview
   ```

3. Download and install the new APK

## Contact Support

If nothing works:
1. Check Expo build logs for errors
2. Try building with a different profile
3. Check phone's error logs (if developer mode enabled)

