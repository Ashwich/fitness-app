const getEnvVar = (key, fallback) => {
  // Expo loads EXPO_PUBLIC_* from .env
  const value = process.env[key];
  if (value && value.length > 0) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${key}`);
};

// Option A hybrid: users via local ngrok; gym is live GCP.
const USERS_SERVICE_BASE = getEnvVar(
  'EXPO_PUBLIC_USERS_SERVICE_URL',
  'https://users-api.fitsera.in'
);
const GYM_SERVICE_BASE = getEnvVar(
  'EXPO_PUBLIC_GYM_SERVICE_URL',
  'https://api.fitsera.in'
);

const normalizeBaseUrl = (url) => {
  if (!url) return url;
  url = url.trim().replace(/\/+$/, '');
  // ngrok URLs should not include a port
  if (url.includes('ngrok') && url.match(/:\d+$/)) {
    console.warn(
      '[Config] Removing port from ngrok URL — ngrok handles ports internally'
    );
    url = url.replace(/:\d+$/, '');
  }
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

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[Config] ========================================');
  console.log('[Config] Users API:', ENV.USERS_SERVICE_URL);
  console.log('[Config] Gym API:', ENV.GYM_SERVICE_URL);
  if (normalizedUsersBase.includes('ngrok')) {
    console.log(
      '[Config] Hybrid: ngrok → local users-service; gym → api.fitsera.in'
    );
  }
  console.log('[Config] ========================================');

  if (
    !normalizedUsersBase.startsWith('http://') &&
    !normalizedUsersBase.startsWith('https://')
  ) {
    console.error('[Config] ERROR: Users URL must start with http:// or https://');
  }

  const urlLower = normalizedUsersBase.toLowerCase();
  if (urlLower.includes('exp://') || urlLower.includes('tunnel.exp.direct')) {
    console.error(
      '[Config] ERROR: Users URL points at Expo tunnel — use ngrok for users-service'
    );
  }
  if (urlLower.includes('31.97.206.44')) {
    console.warn(
      '[Config] Old VPS IP 31.97.206.44 is dead — use ngrok users + https://api.fitsera.in'
    );
  }
}
