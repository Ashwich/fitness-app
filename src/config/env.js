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

const USERS_SERVICE_BASE = getEnvVar('EXPO_PUBLIC_USERS_SERVICE_URL', 'http://192.168.1.6:8081');
const GYM_SERVICE_BASE = getEnvVar('EXPO_PUBLIC_GYM_SERVICE_URL', 'http://192.168.1.6:8080');

// Ensure base URL doesn't already include /api/users
const normalizeBaseUrl = (url) => {
  if (!url) return url;
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  // Remove port numbers from ngrok URLs (ngrok handles ports internally)
  // ngrok URLs should be: https://xxx.ngrok-free.dev (no port)
  if (url.includes('ngrok') && url.match(/:\d+$/)) {
    console.warn('[Config] Removing port number from ngrok URL - ngrok handles ports internally');
    url = url.replace(/:\d+$/, '');
  }
  // If it already ends with /api/users, remove it
  if (url.endsWith('/api/users')) {
    url = url.replace(/\/api\/users$/, '');
  }
  return url;
};

const normalizedUsersBase = normalizeBaseUrl(USERS_SERVICE_BASE);

export const ENV = {
  USERS_SERVICE_URL: `${normalizedUsersBase}/api/users`,
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
  
  // Warn if URL contains port 8081 (might conflict with Expo)
  if (urlLower.includes(':8081') && !urlLower.includes('192.168') && !urlLower.includes('localhost')) {
    console.warn('[Config] ⚠️  WARNING: URL contains port 8081!');
    console.warn('[Config] ngrok URLs should NOT have port numbers');
    console.warn('[Config] Remove :8081 from the URL');
  }
  
  // Check if URL looks like ngrok
  if (urlLower.includes('ngrok')) {
    console.log('[Config] ✓ Using ngrok tunnel for backend API');
    console.log('[Config] Test backend: ' + normalizedUsersBase + '/health');
    console.log('[Config] Should return: {"status":"ok","service":"users-service"}');
    console.log('[Config] Note: Expo --tunnel is for app code, ngrok is for API');
  }
}


