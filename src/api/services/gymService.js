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
 * @param {string} gymId - Gym ID
 * @returns {Promise<Object>} Gym details
 */
export const getGymById = async (gymId) => {
  try {
    // For now, we'll need to get from admin endpoint or search
    // Since there's no public endpoint for single gym, we'll return null
    // and handle it in the frontend
    console.warn('getGymById: No public endpoint available, returning null');
    return null;
  } catch (error) {
    console.error('Error fetching gym:', error);
    throw error;
  }
};

/**
 * Get reviews for a gym (placeholder - reviews not implemented yet)
 * @param {string} gymId - Gym ID
 * @param {number} limit - Number of reviews to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} List of reviews (empty for now)
 */
export const getGymReviews = async (gymId, limit = 20, offset = 0) => {
  try {
    // Reviews not implemented yet - return empty array
    // TODO: Implement review endpoints in backend
    return [];
  } catch (error) {
    console.error('Error fetching gym reviews:', error);
    return [];
  }
};

/**
 * Add a review for a gym (placeholder - reviews not implemented yet)
 * @param {string} gymId - Gym ID
 * @param {Object} reviewData - Review data { rating, comment }
 * @returns {Promise<Object>} Created review
 */
export const addGymReview = async (gymId, reviewData) => {
  try {
    // Reviews not implemented yet - throw error
    // TODO: Implement review endpoints in backend
    throw new Error('Review functionality not yet implemented in backend');
  } catch (error) {
    console.error('Error adding gym review:', error);
    throw error;
  }
};

/**
 * Update a review (placeholder)
 */
export const updateGymReview = async (gymId, reviewId, reviewData) => {
  throw new Error('Review functionality not yet implemented in backend');
};

/**
 * Delete a review (placeholder)
 */
export const deleteGymReview = async (gymId, reviewId) => {
  throw new Error('Review functionality not yet implemented in backend');
};

