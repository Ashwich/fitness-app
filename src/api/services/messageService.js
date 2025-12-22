import axios from 'axios';
import { ENV } from '../../config/env';

const extractData = (response) => response.data?.data || response.data;

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create API client for messages
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

const messagesClient = createApiClient('/api/messages');

export const sendMessage = async (receiverId, content) => {
  const response = await messagesClient.post('/', {
    receiverId,
    content,
  });
  return extractData(response);
};

export const getConversation = async (userId, limit = 50, offset = 0) => {
  const response = await messagesClient.get(`/conversation/${userId}`, {
    params: { limit, offset },
  });
  return extractData(response);
};

export const getConversations = async (limit = 20, offset = 0) => {
  const response = await messagesClient.get('/conversations', {
    params: { limit, offset },
  });
  return extractData(response);
};

export const markAsRead = async (messageId) => {
  const response = await messagesClient.put(`/${messageId}/read`);
  return extractData(response);
};

export const markConversationAsRead = async (userId) => {
  const response = await messagesClient.put(`/conversation/${userId}/read`);
  return extractData(response);
};

export const getUnreadCount = async () => {
  const response = await messagesClient.get('/unread-count');
  return extractData(response);
};

