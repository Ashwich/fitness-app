const getEnvVar = (key: string, fallback?: string) => {
  // Try process.env first (works in Expo)
  // Expo automatically loads EXPO_PUBLIC_* variables from .env file
  const value = process.env[key];
  if (value && value.length > 0) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${key}`);
};

// VPS Server Configuration
// Default to VPS server (31.97.206.44) - no ngrok needed
const USERS_SERVICE_BASE = getEnvVar('EXPO_PUBLIC_USERS_SERVICE_URL', 'http://31.97.206.44:8081');
// Gym-management-service runs on port 4000 (different microservice)
// VPS Server IP: 31.97.206.44
const GYM_SERVICE_BASE = getEnvVar('EXPO_PUBLIC_GYM_SERVICE_URL', 'http://31.97.206.44:4000');

// Warn if ngrok is detected in environment variable
if (typeof process !== 'undefined' && process.env) {
  const usersUrl = process.env.EXPO_PUBLIC_USERS_SERVICE_URL || '';
  const gymUrl = process.env.EXPO_PUBLIC_GYM_SERVICE_URL || '';
  if (usersUrl.toLowerCase().includes('ngrok') || gymUrl.toLowerCase().includes('ngrok')) {
    console.error('[Config] ⚠️  DETECTED: ngrok URL in environment variables!');
    console.error('[Config] Current EXPO_PUBLIC_USERS_SERVICE_URL:', usersUrl || '(not set)');
    console.error('[Config] Current EXPO_PUBLIC_GYM_SERVICE_URL:', gymUrl || '(not set)');
    console.error('[Config]');
    console.error('[Config] To switch to VPS server:');
    console.error('[Config] 1. Update .env file with:');
    console.error('[Config]    EXPO_PUBLIC_USERS_SERVICE_URL=http://31.97.206.44:8081');
    console.error('[Config]    EXPO_PUBLIC_GYM_SERVICE_URL=http://31.97.206.44:4000');
    console.error('[Config] 2. Or remove .env file to use VPS defaults');
    console.error('[Config] 3. Restart Expo: npx expo start --clear');
  }
}

// Ensure base URL doesn't already include /api/users
const normalizeBaseUrl = (url) => {
  if (!url) return url;
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  // Remove port numbers from ngrok URLs (ngrok handles ports internally)
  // ngrok URLs should be: https://xxx.ngrok-free.dev (no port)
  // But keep ports for direct IP addresses (VPS servers)
  if (url.includes('ngrok') && url.match(/:\d+$/)) {
    console.warn('[Config] Removing port number from ngrok URL - ngrok handles ports internally');
    url = url.replace(/:\d+$/, '');
  }
  // For VPS IPs, keep the port number as it's required
  // If it already ends with /api/users, remove it
  if (url.endsWith('/api/users')) {
    url = url.replace(/\/api\/users$/, '');
  }
  return url;
};

const normalizedUsersBase = normalizeBaseUrl(USERS_SERVICE_BASE);

export const ENV = {
  USERS_SERVICE_URL: `${normalizedUsersBase}/api/users`,
  // Gym service doesn't use /api prefix based on routes structure
  GYM_SERVICE_URL: GYM_SERVICE_BASE,
  APP_NAME: getEnvVar('EXPO_PUBLIC_APP_NAME', 'Fitsera'),
};

// Log backend URL in development for debugging
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[Config] ========================================');
  console.log('[Config] Backend Configuration:');
  console.log('[Config] Full API URL:', ENV.USERS_SERVICE_URL);
  console.log('[Config] Base URL (normalized):', normalizedUsersBase);
  console.log('[Config] Raw ENV Variable:', USERS_SERVICE_BASE);
  console.log('[Config] ========================================');
  
  // Validate URL format
  if (!normalizedUsersBase.startsWith('http://') && !normalizedUsersBase.startsWith('https://')) {
    console.error('[Config] ❌ ERROR: URL must start with http:// or https://');
  }
  
  // Warn if URL looks like Expo tunnel (exp:// or tunnel.exp.direct)
  const urlLower = normalizedUsersBase.toLowerCase();
  if (urlLower.includes('exp://') || urlLower.includes('tunnel.exp.direct')) {
    console.error('[Config] ❌ ERROR: URL points to Expo tunnel!');
    console.error('[Config] .env should point to ngrok URL for backend API');
    console.error('[Config] Expo tunnel is only for app code, not API calls');
  }
  
  // Warn if URL contains port 8081 for ngrok (but allow for VPS IPs)
  if (urlLower.includes(':8081') && urlLower.includes('ngrok') && !urlLower.includes('192.168') && !urlLower.includes('localhost') && !urlLower.includes('31.97.206.44')) {
    console.warn('[Config] ⚠️  WARNING: URL contains port 8081!');
    console.warn('[Config] ngrok URLs should NOT have port numbers');
    console.warn('[Config] Remove :8081 from the URL');
  }
  
  // Check if URL looks like ngrok
  if (urlLower.includes('ngrok')) {
    console.error('[Config] ⚠️  WARNING: Using ngrok URL detected!');
    console.error('[Config] You are using: ' + normalizedUsersBase);
    console.error('[Config]');
    console.error('[Config] To use VPS server instead:');
    console.error('[Config] 1. Update .env file (or create it):');
    console.error('[Config]    EXPO_PUBLIC_USERS_SERVICE_URL=http://31.97.206.44:8081');
    console.error('[Config]    EXPO_PUBLIC_GYM_SERVICE_URL=http://31.97.206.44:4000');
    console.error('[Config] 2. Restart Expo app (clear cache: npx expo start --clear)');
    console.error('[Config]');
    console.error('[Config] Current ngrok URL will be used, but VPS is recommended.');
  }
  
  // Check if URL is VPS server
  if (urlLower.includes('31.97.206.44')) {
    console.log('[Config] ✓ Using VPS server for backend API');
    console.log('[Config] VPS IP: 31.97.206.44');
    console.log('[Config] Users Service URL:', ENV.USERS_SERVICE_URL);
    console.log('[Config] Gym Service URL:', ENV.GYM_SERVICE_URL);
    console.log('[Config] Test backend: http://31.97.206.44:8081/health');
    console.log('[Config] Should return: {"status":"ok","service":"users-service"}');
  }
}


