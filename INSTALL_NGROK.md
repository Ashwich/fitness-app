# Install ngrok on Windows

## Option 1: Install via Chocolatey (Recommended)

If you have Chocolatey installed:
```powershell
choco install ngrok
```

## Option 2: Install via Scoop

If you have Scoop installed:
```powershell
scoop install ngrok
```

## Option 3: Manual Installation

### Step 1: Download ngrok
1. Go to: https://ngrok.com/download
2. Download the Windows version
3. Extract the ZIP file

### Step 2: Add to PATH

**Option A: Add to System PATH (Permanent)**
1. Copy `ngrok.exe` to a folder (e.g., `C:\tools\ngrok\`)
2. Press `Win + R`, type `sysdm.cpl`, press Enter
3. Click "Environment Variables"
4. Under "System variables", find "Path", click "Edit"
5. Click "New", add: `C:\tools\ngrok\`
6. Click "OK" on all dialogs
7. **Restart PowerShell/terminal**

**Option B: Add to User PATH (Easier)**
1. Copy `ngrok.exe` to: `C:\Users\Lenovo\AppData\Local\Microsoft\WindowsApps\`
2. **Restart PowerShell/terminal**

**Option C: Use Full Path (Quick Fix)**
If ngrok.exe is in a specific folder, use the full path:
```powershell
C:\path\to\ngrok.exe http 8081
```

## Option 4: Use ngrok from Current Directory

If you downloaded ngrok but didn't add it to PATH:

1. **Find where you downloaded ngrok** (check Downloads folder)
2. **Copy ngrok.exe to your project folder:**
   ```powershell
   cd C:\Users\Lenovo\Desktop\fitsera-app
   # Copy ngrok.exe here
   ```
3. **Run from project folder:**
   ```powershell
   .\ngrok.exe http 8081
   ```

## Verify Installation

After installation, restart PowerShell and test:
```powershell
ngrok version
```

Should show: `ngrok version 3.x.x`

## Quick Setup Script

If ngrok is in Downloads, run this:
```powershell
# Create tools directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\tools"

# Copy ngrok (adjust path if different)
Copy-Item "$env:USERPROFILE\Downloads\ngrok.exe" -Destination "$env:USERPROFILE\tools\ngrok.exe"

# Add to PATH for current session
$env:Path += ";$env:USERPROFILE\tools"

# Test
ngrok version
```

## If ngrok is Already Installed

If ngrok was working before, it might be in a different location. Check:
- `C:\Program Files\ngrok\`
- `C:\Program Files (x86)\ngrok\`
- `C:\tools\ngrok\`
- Your Downloads folder

Then either:
1. Add that folder to PATH, OR
2. Use full path: `C:\path\to\ngrok.exe http 8081`

