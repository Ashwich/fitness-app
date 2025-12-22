import axios from 'axios';
import { ENV } from '../../config/env';

const extractData = (response) => response.data?.data || response.data;

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create API client for notifications
const createApiClient = (basePath) => {
  const baseURL = `${getBaseURL()}${basePath}`;
  const client = axios.create({
    baseURL,
    timeout: 12000,
  });

  // Add auth token interceptor
  client.interceptors.request.use(async (config) => {
    let token = null;
    try {
      const { getToken } = require('../../storage/tokenStorage');
      token = await getToken();
    } catch (e) {
      if (__DEV__) {
        console.warn('Could not retrieve token from storage:', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = 'application/json';
    config.headers['Content-Type'] = 'application/json';
    
    return config;
  });

  return client;
};

const notificationsClient = createApiClient('/api/notifications');

export const getNotifications = async (limit = 50, offset = 0) => {
  const response = await notificationsClient.get('/', {
    params: { limit, offset },
  });
  return extractData(response);
};

export const getUnreadCount = async () => {
  const response = await notificationsClient.get('/unread-count');
  return extractData(response);
};

export const markAsRead = async (notificationId) => {
  const response = await notificationsClient.put(`/${notificationId}/read`);
  return extractData(response);
};

export const markAllAsRead = async () => {
  const response = await notificationsClient.put('/read-all');
  return extractData(response);
};

