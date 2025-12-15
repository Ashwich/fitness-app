import axios from 'axios';
import { ENV } from '../../config/env';

const extractData = (response) => response.data?.data || response.data;

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create a separate client for follows
const createApiClient = (basePath) => {
  const baseURL = `${getBaseURL()}${basePath}`;
  const client = axios.create({
    baseURL,
    timeout: 12000,
  });

  // Add auth token interceptor
  client.interceptors.request.use(async (config) => {
    // Get token directly from storage
    let token = null;
    try {
      const { getToken } = require('../../storage/tokenStorage');
      token = await getToken();
    } catch (e) {
      // Ignore storage errors - request will proceed without token
      if (__DEV__) {
        console.warn('Could not retrieve token from storage:', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = 'application/json';
    config.headers['Content-Type'] = 'application/json';
    
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  });
  
  // Add response interceptor for better error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (__DEV__) {
        console.error('[Follows API Error]', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const followsClient = createApiClient('/api/follows');

export const followUser = async (userId) => {
  const response = await followsClient.post(`/${userId}`);
  return extractData(response);
};

export const unfollowUser = async (userId) => {
  const response = await followsClient.delete(`/${userId}`);
  return extractData(response);
};

export const toggleFollow = async (userId) => {
  const response = await followsClient.post(`/${userId}`);
  return extractData(response);
};

export const getFollowers = async (userId, limit = 50, offset = 0) => {
  const response = await followsClient.get(`/${userId}/followers`, {
    params: { limit, offset },
  });
  return extractData(response);
};

export const getFollowing = async (userId, limit = 50, offset = 0) => {
  const response = await followsClient.get(`/${userId}/following`, {
    params: { limit, offset },
  });
  return extractData(response);
};

export const getFollowStats = async (userId) => {
  const response = await followsClient.get(`/${userId}/stats`);
  return extractData(response);
};

export const checkFollowStatus = async (userId) => {
  const response = await followsClient.get(`/${userId}/status`);
  return extractData(response);
};

