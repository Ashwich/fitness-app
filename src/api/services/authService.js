import { apiClient } from '../client';

const extractData = (response) => {
  // Axios response structure: response.data contains the actual response body
  // Backend returns: { message: "...", data: { token, userId } } for login
  // Backend returns: { message: "...", data: { user, token } } for register
  if (response?.data) {
    // If response.data has a 'data' property, extract it (this is the actual data)
    if (response.data.data && typeof response.data.data === 'object') {
      // Check if it's the nested data structure from backend
      if ('token' in response.data.data || 'user' in response.data.data) {
        return response.data.data;
      }
    }
    // Otherwise return response.data directly
    return response.data;
  }
  return response;
};

export const register = async (payload) => {
  try {
    // Registration should be public - use /register directly (standard endpoint)
    // /auth/register might require authentication, so we use /register
    const endpoint = '/register';
    
    // Log the actual URL being called
    if (__DEV__) {
      console.log('[Register] Making request to:', `${apiClient.defaults.baseURL}${endpoint}`);
    }
    
    const response = await apiClient.post(endpoint, payload);
    
    // Debug logging
    if (__DEV__) {
      console.log('[Register] ✅ Success! Response status:', response.status);
      console.log('[Register] Response URL:', response.config.url);
      console.log('[Register] Response baseURL:', response.config.baseURL);
      console.log('[Register] Response data type:', typeof response.data);
      console.log('[Register] Response data keys:', response.data ? Object.keys(response.data).slice(0, 5) : 'null');
    }
    
    // Check if response.data looks like Expo manifest (has 'expoGo' or 'expoClient' property)
    if (response.data && (response.data.expoGo || response.data.expoClient)) {
      console.error('[Register] ❌ ERROR: Received Expo manifest instead of API response!');
      console.error('[Register] Request was made to:', `${response.config.baseURL}${response.config.url}`);
      console.error('[Register] Expected URL format: https://your-ngrok-url.ngrok-free.dev/api/users/register');
      console.error('[Register] Current baseURL:', response.config.baseURL);
      console.error('[Register]');
      console.error('[Register] SOLUTION:');
      console.error('[Register] 1. Check your .env file has: EXPO_PUBLIC_USERS_SERVICE_URL=https://unpersonalised-carlota-uncomplexly.ngrok-free.dev');
      console.error('[Register] 2. Make sure ngrok is forwarding to your BACKEND (port 8081), not Expo');
      console.error('[Register] 3. Test backend directly: https://unpersonalised-carlota-uncomplexly.ngrok-free.dev/health');
      console.error('[Register] 4. Should return: {"status":"ok","service":"users-service"}');
      throw new Error('Invalid API response - received Expo manifest. Check your backend URL configuration.');
    }
    
    const extracted = extractData(response);
    
    if (__DEV__) {
      console.log('[Register] ✅ Extracted data:', extracted);
    }
    
    return extracted;
  } catch (error) {
    console.error('[Register] Error:', error);
    if (error.response) {
      console.error('[Register] Error response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`,
      });
      
      // If 401, provide helpful error message
      if (error.response.status === 401) {
        const errorData = error.response.data;
        if (errorData?.error === 'Authorization token missing' || errorData?.error?.includes('Authorization')) {
          console.error('[Register] ❌ Backend requires authentication for registration endpoint!');
          console.error('[Register] This is unusual - registration should be a public endpoint.');
          console.error('[Register] Endpoint attempted:', error.config?.url);
          console.error('[Register]');
          console.error('[Register] TROUBLESHOOTING:');
          console.error('[Register] 1. Check backend routes - /register should be public (no auth middleware)');
          console.error('[Register] 2. Verify backend route exists: POST /api/users/register');
          console.error('[Register] 3. Check backend middleware configuration');
          console.error('[Register] 4. Test endpoint directly: curl -X POST http://31.97.206.44:8081/api/users/register');
        }
      }
      
      // If 404, provide helpful error message
      if (error.response.status === 404) {
        const errorData = error.response.data;
        console.error('[Register] ❌ Backend route not found!');
        console.error('[Register] Expected route: POST /api/users/register');
        console.error('[Register] Full URL attempted:', `${error.config?.baseURL}${error.config?.url}`);
        console.error('[Register]');
        console.error('[Register] TROUBLESHOOTING:');
        console.error('[Register] 1. Check if backend server is running on VPS:');
        console.error('[Register]    Test: http://31.97.206.44:8081/health');
        console.error('[Register]    Should return: {"status":"ok","service":"users-service"}');
        console.error('[Register] 2. Verify backend routes in backend codebase');
        console.error('[Register] 3. Check backend logs for route registration');
      }
    }
    throw error;
  }
};

export const login = async (payload) => {
  try {
    // Log the actual URL being called
    if (__DEV__) {
      console.log('[Login] Making request to:', `${apiClient.defaults.baseURL}/login`);
    }
    
    const response = await apiClient.post('/login', payload);
    
    // Check if response.data looks like Expo manifest (has 'expoGo' or 'expoClient' property)
    if (response.data && (response.data.expoGo || response.data.expoClient)) {
      console.error('[Login] ❌ CRITICAL ERROR: Received Expo manifest instead of API response!');
      console.error('[Login] Request URL:', `${response.config.baseURL}${response.config.url}`);
      console.error('[Login] Response Status:', response.status);
      console.error('[Login]');
      console.error('[Login] DIAGNOSIS:');
      console.error('[Login] ngrok is routing API requests to Expo instead of backend');
      console.error('[Login]');
      console.error('[Login] STEP-BY-STEP FIX:');
      console.error('[Login] 1. STOP Expo (Ctrl+C)');
      console.error('[Login] 2. STOP ngrok (Ctrl+C)');
      console.error('[Login] 3. Verify backend is running: http://localhost:8081/health');
      console.error('[Login] 4. Start ngrok: ngrok http 8081');
      console.error('[Login] 5. Test ngrok in phone browser: https://xxx.ngrok-free.dev/health');
      console.error('[Login]    MUST return: {"status":"ok","service":"users-service"}');
      console.error('[Login]    If you get Expo manifest, ngrok is wrong - restart it');
      console.error('[Login] 6. Update .env: EXPO_PUBLIC_USERS_SERVICE_URL=https://xxx.ngrok-free.dev');
      console.error('[Login] 7. Start Expo: npx expo start --tunnel --port 5173 --clear');
      console.error('[Login]');
      console.error('[Login] VERIFY: Check backend logs when you login');
      console.error('[Login] Should see: [INFO] Incoming request method: "POST" path: "/api/users/login"');
      throw new Error('Invalid API response - received Expo manifest. ngrok is routing to Expo. Restart ngrok after backend is running.');
    }
    
    const extracted = extractData(response);
    
    if (__DEV__) {
      console.log('[Login] Raw response.data:', JSON.stringify(response.data, null, 2));
      console.log('[Login] ✅ Extracted data:', JSON.stringify(extracted, null, 2));
      console.log('[Login] Token in extracted:', extracted?.token);
      console.log('[Login] UserId in extracted:', extracted?.userId);
    }
    
    return extracted;
  } catch (error) {
    console.error('[Login] Error:', error);
    if (error.response) {
      console.error('[Login] Error response:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

export const me = async () => {
  const response = await apiClient.get('/me');
  return extractData(response);
};

