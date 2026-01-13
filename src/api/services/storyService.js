import axios from 'axios';
import { ENV } from '../../config/env';
import { getToken } from '../../storage/tokenStorage';

const extractData = (response) => response.data?.data || response.data;

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create API client for stories
const createStoryClient = () => {
  const baseURL = `${getBaseURL()}/api/stories`;
  const client = axios.create({
    baseURL,
    timeout: 12000,
  });

  client.interceptors.request.use(async (config) => {
    let token = null;
    try {
      token = await getToken();
    } catch (e) {
      if (__DEV__) {
        console.warn('Could not retrieve token from storage for stories:', e);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = 'application/json';
    config.headers['Content-Type'] = 'application/json';

    if (__DEV__) {
      console.log(`[Story API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (__DEV__) {
        console.error('[Story API Error]', {
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

const storyClient = createStoryClient();

/**
 * Create a new story
 */
export const createStory = async (mediaUrl, mediaType, caption = '') => {
  const response = await storyClient.post('/', {
    mediaUrl,
    mediaType, // 'image' or 'video'
    caption,
  });
  return extractData(response);
};

/**
 * Get stories feed (stories from users you follow)
 */
export const getStoriesFeed = async () => {
  try {
    const response = await storyClient.get('/feed');
    const data = extractData(response);
    
    // Ensure we return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching stories feed:', error);
    return [];
  }
};

/**
 * Get stories for a specific user
 */
export const getUserStories = async (userId) => {
  try {
    const response = await storyClient.get(`/user/${userId}`);
    const data = extractData(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return [];
  }
};

/**
 * Get a single story
 */
export const getStory = async (storyId) => {
  const response = await storyClient.get(`/${storyId}`);
  return extractData(response);
};

/**
 * Mark story as viewed
 */
export const markStoryAsViewed = async (storyId) => {
  try {
    const response = await storyClient.post(`/${storyId}/view`);
    return extractData(response);
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    throw error;
  }
};

/**
 * Delete a story
 */
export const deleteStory = async (storyId) => {
  const response = await storyClient.delete(`/${storyId}`);
  return extractData(response);
};


