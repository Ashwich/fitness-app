import axios from 'axios';
import { ENV } from '../../config/env';

const extractData = (response) => {
  // Handle different response structures
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }
  if (response?.data !== undefined) {
    return response.data;
  }
  return response;
};

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create a separate client for posts/follows since they're at /api/posts and /api/follows
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
        console.error('[Posts API Error]', {
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

const postsClient = createApiClient('/api/posts');
const followsClient = createApiClient('/api/follows');

export const createPost = async (postData) => {
  const response = await postsClient.post('/', postData);
  return extractData(response);
};

export const getFeed = async (limit = 20, offset = 0) => {
  try {
    const response = await postsClient.get('/feed', {
      params: { limit, offset },
    });
    const data = extractData(response);
    // Ensure we return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching feed:', error);
    // Return empty array on error instead of throwing
    return [];
  }
};

export const getPost = async (postId) => {
  const response = await postsClient.get(`/${postId}`);
  return extractData(response);
};

export const getUserPosts = async (userId, limit = 20, offset = 0) => {
  try {
    const response = await postsClient.get(`/user/${userId}`, {
      params: { limit, offset },
    });
    const data = extractData(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
};

export const deletePost = async (postId) => {
  const response = await postsClient.delete(`/${postId}`);
  return extractData(response);
};

export const likePost = async (postId) => {
  const response = await postsClient.post(`/${postId}/like`);
  return extractData(response);
};

export const addComment = async (postId, content) => {
  const response = await postsClient.post(`/${postId}/comment`, {
    content,
  });
  return extractData(response);
};

export const deleteComment = async (commentId) => {
  const response = await postsClient.delete(`/comment/${commentId}`);
  return extractData(response);
};

