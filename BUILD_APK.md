# Building APK for Fitsera App

This guide will help you build an APK file that you can share with others for testing.

## Prerequisites

1. **Expo Account**: You need a free Expo account
   - Sign up at: https://expo.dev/signup
   - Or login if you already have one

2. **EAS CLI**: Install the Expo Application Services CLI
   ```bash
   npm install -g eas-cli
   ```

## Step-by-Step Instructions

### 1. Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

### 2. Configure EAS (if needed)

```bash
eas build:configure
```

This will create/update the `eas.json` file (already created for you).

### 3. Build APK for Testing (Preview Build)

This creates an APK that can be installed on any Android device:

```bash
eas build --platform android --profile preview
```

**Options:**
- `--platform android` - Build for Android
- `--profile preview` - Use preview profile (creates APK, not AAB)

### 4. Wait for Build to Complete

- The build will run on Expo's servers (takes 10-20 minutes)
- You'll see a URL to track the build progress
- You'll receive an email when the build is complete

### 5. Download APK

Once the build is complete:
1. Visit the build URL provided
2. Or check: https://expo.dev/accounts/[your-username]/projects/fitsera-app/builds
3. Download the `.apk` file

### 6. Share APK

- Send the APK file to testers
- They need to enable "Install from Unknown Sources" on their Android device
- Settings → Security → Unknown Sources (enable)

## Alternative: Local Build (Advanced)

If you want to build locally (requires Android SDK setup):

```bash
eas build --platform android --profile preview --local
```

## Build Profiles Explained

- **preview**: Creates APK for testing (recommended for sharing)
- **production**: Creates APK/AAB for Play Store
- **development**: Creates development build with dev client

## Troubleshooting

### Build Fails

1. Check build logs on Expo dashboard
2. Verify all dependencies are compatible
3. Ensure app.config.js is valid

### APK Won't Install

1. User needs to enable "Install from Unknown Sources"
2. Check Android version compatibility
3. Verify APK wasn't corrupted during download

### Need to Update APK

1. Update version in `app.config.js`:
   ```javascript
   version: '1.0.1', // Increment version
   android: {
     versionCode: 2, // Increment version code
   }
   ```
2. Run build command again

## Quick Commands Reference

```bash
# Login to Expo
eas login

# Build APK for testing
eas build --platform android --profile preview

# Check build status
eas build:list

# View build details
eas build:view [build-id]
```

## Notes

- First build may take longer (20-30 minutes)
- Subsequent builds are faster (10-15 minutes)
- APK size will be around 30-50 MB
- Free Expo accounts have build limits (check Expo dashboard)

