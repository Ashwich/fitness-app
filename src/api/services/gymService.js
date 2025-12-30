import axios from 'axios';
import { ENV } from '../../config/env';
import { getToken } from '../../storage/tokenStorage';

// Use users-service for gym data (same service, no need for separate gym-service)
const gymClient = axios.create({
  baseURL: ENV.USERS_SERVICE_URL.replace('/api/users', ''), // Remove /api/users to get base URL
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log base URL in development
if (__DEV__) {
  console.log('[GymService] ========================================');
  console.log('[GymService] Gym Service Configuration:');
  console.log('[GymService] Using users-service for gym data');
  console.log('[GymService] Base URL:', gymClient.defaults.baseURL);
  console.log('[GymService] Full URL for /gyms:', `${gymClient.defaults.baseURL}/api/users/gyms`);
  console.log('[GymService] ========================================');
}

// Add auth token interceptor
gymClient.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Could not retrieve token for gym service:', error);
  }
  return config;
});

const extractData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }
  if (response?.data !== undefined) {
    return response.data;
  }
  return response;
};

/**
 * Get gyms by city (public endpoint)
 * @param {string} city - City name
 * @returns {Promise<Array>} List of gyms
 */
export const getGymsByCity = async (city) => {
  try {
    const url = `/api/users/gyms/city/${encodeURIComponent(city)}`;
    console.log('[GymService] Fetching gyms for city:', city);
    console.log('[GymService] Full URL:', `${gymClient.defaults.baseURL}${url}`);
    
    const response = await gymClient.get(url);
    console.log('[GymService] Response status:', response.status);
    
    const data = extractData(response);
    // Backend returns { success: true, data: [...] }
    const gyms = Array.isArray(data) ? data : (data?.data || []);
    console.log('[GymService] Returning gyms:', gyms.length);
    return gyms;
  } catch (error) {
    console.error('[GymService] Error fetching gyms by city:', error);
    if (error.response) {
      console.error('[GymService] Error status:', error.response.status);
      console.error('[GymService] Error data:', JSON.stringify(error.response.data, null, 2));
      
      // Provide helpful error messages for common backend errors
      if (error.response.status === 500) {
        const errorData = error.response.data;
        if (errorData?.error?.includes('httpError is not a function')) {
          console.error('[GymService] ❌ Backend Error: httpError is not a function');
          console.error('[GymService] This is a backend code issue, not a frontend issue.');
          console.error('[GymService] Check backend route handler for GET /api/users/gyms/city/:city');
        }
      }
    }
    throw error;
  }
};

/**
 * Get all approved gyms (public endpoint)
 * @param {number} limit - Number of gyms to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} List of gyms
 */
export const getAllGyms = async (limit = 100, offset = 0) => {
  try {
    const url = '/api/users/gyms';
    console.log('[GymService] Fetching all gyms, limit:', limit, 'offset:', offset);
    console.log('[GymService] Full URL:', `${gymClient.defaults.baseURL}${url}?limit=${limit}&offset=${offset}`);
    
    const response = await gymClient.get(url, {
      params: {
        limit,
        offset,
      },
    });
    console.log('[GymService] Response status:', response.status);
    
    const data = extractData(response);
    // Backend returns { success: true, data: [...] }
    const gyms = Array.isArray(data) ? data : (data?.data || []);
    console.log('[GymService] Returning gyms:', gyms.length);
    return gyms;
  } catch (error) {
    console.error('[GymService] Error fetching gyms:', error);
    if (error.response) {
      console.error('[GymService] Error status:', error.response.status);
      console.error('[GymService] Error data:', JSON.stringify(error.response.data, null, 2));
      
      // Provide helpful error messages for common backend errors
      if (error.response.status === 500) {
        const errorData = error.response.data;
        if (errorData?.error?.includes('httpError is not a function')) {
          console.error('[GymService] ❌ Backend Error: httpError is not a function');
          console.error('[GymService] This is a backend code issue, not a frontend issue.');
          console.error('[GymService]');
          console.error('[GymService] BACKEND FIX NEEDED:');
          console.error('[GymService] 1. Check backend route handler for GET /api/users/gyms');
          console.error('[GymService] 2. Verify httpError function is imported correctly');
          console.error('[GymService] 3. Check backend error handling middleware');
          console.error('[GymService] 4. Look for missing import: const { httpError } = require("...")');
          console.error('[GymService] 5. Check backend logs on VPS server for full stack trace');
        } else {
          console.error('[GymService] ❌ Backend Internal Server Error (500)');
          console.error('[GymService] Check backend logs on VPS: 31.97.206.44:8081');
        }
      }
      
      if (error.response.status === 404) {
        console.error('[GymService] ❌ Endpoint not found: GET /api/users/gyms');
        console.error('[GymService] Verify backend route exists and is registered');
      }
    } else if (error.request) {
      console.error('[GymService] ❌ Network Error: No response from server');
      console.error('[GymService] Check if backend is running on VPS: 31.97.206.44:8081');
    }
    throw error;
  }
};

/**
 * Get gyms near user based on location (uses city endpoint)
 * @param {string} location - User's location (city, state, or coordinates)
 * @param {number} radius - Search radius in km (not used, kept for compatibility)
 * @param {number} limit - Number of gyms to return (not used, kept for compatibility)
 * @returns {Promise<Array>} List of gyms
 */
export const getNearbyGyms = async (location, radius = 10, limit = 20) => {
  try {
    // Extract city from location string (e.g., "Bhopal" or "Bhopal, MP")
    const city = location.split(',')[0].trim();
    return await getGymsByCity(city);
  } catch (error) {
    console.error('Error fetching nearby gyms:', error);
    throw error;
  }
};

/**
 * Get gym by ID
 * Uses users-service endpoint: GET /api/users/gyms/:gymId (public endpoint)
 * @param {string} gymId - Gym ID
 * @returns {Promise<Object>} Gym details
 */
export const getGymById = async (gymId) => {
  try {
    if (!gymId) {
      console.warn('getGymById: No gymId provided');
      return null;
    }

    // Use users-service public endpoint to get gym by ID
    const response = await gymClient.get(`/api/users/gyms/${gymId}`);
    const data = extractData(response);
    return data;
  } catch (error) {
    console.error('Error fetching gym by ID:', error);
    // Return null instead of throwing to prevent UI breakage
    return null;
  }
};

/**
 * Get gym profile with photos, reviews, and inquiries
 * Uses gym-management-service: GET /api/gym/profile
 * @returns {Promise<Object>} Gym profile data
 */
export const getGymProfile = async () => {
  return getGymById();
};

/**
 * Get gym photos for a specific gym
 * Uses gym-management-service: GET /api/gyms/:gymId/photos (public endpoint)
 * @param {string} gymId - Gym ID
 * @returns {Promise<Array>} List of gym photos
 */
export const getGymPhotos = async (gymId) => {
  try {
    if (!gymId) {
      console.warn('getGymPhotos: No gymId provided');
      return [];
    }

    // Use public endpoint that doesn't require authentication
    const gymServiceClient = axios.create({
      baseURL: ENV.GYM_SERVICE_URL, // http://31.97.206.44:4000
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[GymService] Fetching photos for gym ${gymId} from ${ENV.GYM_SERVICE_URL}/api/gyms/${gymId}/photos`);
    const response = await gymServiceClient.get(`/api/gyms/${gymId}/photos`);
    const data = response.data?.data || response.data;
    const photos = data?.photos || [];
    console.log(`[GymService] ✅ Fetched ${photos.length} photos for gym ${gymId}`);
    return photos;
  } catch (error) {
    console.error('[GymService] ❌ Error fetching gym photos:', {
      gymId,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: `${ENV.GYM_SERVICE_URL}/api/gyms/${gymId}/photos`,
    });
    // Return empty array instead of throwing to prevent UI breakage
    return [];
  }
};

/**
 * Create gym inquiry
 * Uses gym-management-service: POST /api/enquiries/create
 * @param {Object} inquiryData - Inquiry data { name, email, phone, message }
 * @returns {Promise<Object>} Created inquiry
 */
export const createGymInquiry = async (inquiryData) => {
  try {
    const gymServiceClient = axios.create({
      baseURL: ENV.GYM_SERVICE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token if available (optional for inquiries)
    try {
      const token = await getToken();
      if (token) {
        gymServiceClient.defaults.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Inquiries might be public, so token is optional
    }

    const response = await gymServiceClient.post('/api/enquiries/create', inquiryData);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error creating gym inquiry:', error);
    throw error;
  }
};

/**
 * Get reviews for a gym
 * Uses users-service endpoint: GET /api/users/gyms/:gymId/reviews
 * @param {string} gymId - Gym ID
 * @param {number} limit - Number of reviews to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} Reviews with total and averageRating
 */
export const getGymReviews = async (gymId, limit = 20, offset = 0) => {
  try {
    const response = await gymClient.get(`/api/users/gyms/${gymId}/reviews`, {
      params: { limit, offset },
    });
    const data = extractData(response);
    return data || { reviews: [], total: 0, averageRating: 0 };
  } catch (error) {
    console.error('Error fetching gym reviews:', error);
    return { reviews: [], total: 0, averageRating: 0 };
  }
};

/**
 * Add a review for a gym
 * Uses users-service endpoint: POST /api/users/gyms/:gymId/reviews
 * @param {string} gymId - Gym ID
 * @param {Object} reviewData - Review data { rating, comment }
 * @returns {Promise<Object>} Created review
 */
export const addGymReview = async (gymId, reviewData) => {
  try {
    const response = await gymClient.post(`/api/users/gyms/${gymId}/reviews`, reviewData);
    return extractData(response);
  } catch (error) {
    console.error('Error adding gym review:', error);
    throw error;
  }
};

/**
 * Update a review
 * Uses users-service endpoint: PUT /api/users/gyms/:gymId/reviews
 */
export const updateGymReview = async (gymId, reviewData) => {
  try {
    const response = await gymClient.put(`/api/users/gyms/${gymId}/reviews`, reviewData);
    return extractData(response);
  } catch (error) {
    console.error('Error updating gym review:', error);
    throw error;
  }
};

/**
 * Delete a review
 * Uses users-service endpoint: DELETE /api/users/gyms/:gymId/reviews
 */
export const deleteGymReview = async (gymId) => {
  try {
    await gymClient.delete(`/api/users/gyms/${gymId}/reviews`);
  } catch (error) {
    console.error('Error deleting gym review:', error);
    throw error;
  }
};

