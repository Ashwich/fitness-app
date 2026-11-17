import axios from 'axios';
import { ENV } from '../config/env';
import { getToken } from '../storage/tokenStorage';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const apiClient = axios.create({
  baseURL: ENV.USERS_SERVICE_URL,
  timeout: 12000,
});

// Request interceptor - log requests in development
apiClient.interceptors.request.use(
  async (config) => {
    config.headers = config.headers ?? {};

    // Try to get token from storage first (most reliable)
    // Fallback to in-memory token if storage fails
    let token = null;
    try {
      token = await getToken();
    } catch (error) {
      if (__DEV__) {
        console.warn('[API Client] Could not retrieve token from storage, using in-memory token:', error);
      }
      // Fallback to in-memory token
      token = authToken;
    }

    // If storage didn't have token, use in-memory token
    if (!token) {
      token = authToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        // Log token presence (but not the actual token for security)
        console.log(`[API Client] Token attached for ${config.method?.toUpperCase()} ${config.url}`, {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...',
        });
      }
    } else if (__DEV__) {
      console.warn('[API Client] ⚠️ No auth token available for request:', config.url);
    }

    config.headers.Accept = 'application/json';
    config.headers['Content-Type'] = 'application/json';

    // Free ngrok interstitial — skip when calling users-service via ngrok
    const base = String(config.baseURL || '');
    if (base.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = '1';
    }

    // Log request in development
    if (__DEV__) {
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
      console.log(`[API Request] Base URL: ${config.baseURL}`);
      console.log(`[API Request] Endpoint: ${config.url}`);
      
      // Warn if URL looks suspicious
      if (fullUrl.includes(':8081') && !fullUrl.includes('/api/')) {
        console.warn('[API Request] ⚠️  WARNING: URL contains :8081 but no /api/ path!');
        console.warn('[API Request] This might be hitting Expo dev server instead of backend');
      }
      
      // Check if baseURL looks wrong
      if (config.baseURL && config.baseURL.includes('ngrok') && config.baseURL.includes(':8081')) {
        console.error('[API Request] ❌ ERROR: Base URL contains port number!');
        console.error('[API Request] ngrok URLs should NOT have port numbers');
        console.error('[API Request] Current baseURL:', config.baseURL);
      }
      
      if (config.data) {
        console.log('[API Request Data]', JSON.stringify(config.data, null, 2));
      }
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - log responses and errors
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
      
      // Check if response looks like Expo manifest (shouldn't happen for API calls)
      if (response.data && (response.data.expoGo || response.data.expoClient)) {
        console.error('[API Response] ❌ CRITICAL: Received Expo manifest instead of API response!');
        console.error('[API Response] Request URL:', `${response.config.baseURL}${response.config.url}`);
        console.error('[API Response] Base URL:', response.config.baseURL);
        console.error('[API Response] Endpoint:', response.config.url);
        console.error('[API Response]');
        console.error('[API Response] SOLUTION:');
        console.error('[API Response] 1. Remove --tunnel flag from Expo (ngrok already provides tunnel)');
        console.error('[API Response] 2. Use: npx expo start --port 5173 --clear');
        console.error('[API Response] 3. Test backend: https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health');
        console.error('[API Response] 4. Should return: {"status":"ok","service":"users-service"}');
      }
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      // Soft-expected 404s (no data yet) — log as info, not error
      const status = error.response?.status;
      const url = error.config?.url || '';
      const errMsg = String(error.response?.data?.error || error.response?.data?.message || '');
      const isDiary404 =
        url.includes('/diary') &&
        status === 404 &&
        (errMsg.includes('Diary entry not found') || errMsg.includes('User not found'));
      const isWorkoutTemplates404 =
        status === 404 &&
        url.includes('/workouts') &&
        errMsg.toLowerCase().includes('no workout templates');

      if (isDiary404) {
        console.log('[API Info] Diary entry not found (404) - normal if no food logged yet');
      } else if (isWorkoutTemplates404) {
        console.log('[API Info] No workout templates on server — app will use local starter');
      } else {
        console.error('[API Error]', {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });
      }
    }
    return Promise.reject(error);
  }
);


