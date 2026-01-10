import axios from 'axios';
import { ENV } from '../../config/env';
import { getToken } from '../../storage/tokenStorage';

// User Community Chat Service - uses users-service (port 8081)
// Note: Community chat requests come from gym-service but user actions go through users-service
const userCommunityChatClient = axios.create({
  baseURL: ENV.USERS_SERVICE_URL.replace('/api/users', ''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add user token interceptor
userCommunityChatClient.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        console.log('[UserCommunityChat] User token attached');
      }
    } else {
      if (__DEV__) {
        console.warn('[UserCommunityChat] ⚠️ No user token available');
      }
    }
  } catch (error) {
    console.warn('[UserCommunityChat] Could not retrieve token:', error);
  }
  return config;
});

// Response interceptor for logging
userCommunityChatClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[UserCommunityChat] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error('[UserCommunityChat] Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

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
 * Get user's community chat rooms
 * @returns {Promise<Array>} List of rooms user is a member of
 */
export const getUserRooms = async () => {
  try {
    // This might be through gym-service, need to check backend
    // For now, using users-service endpoint if it exists
    const response = await userCommunityChatClient.get('/api/users/community-chat/rooms');
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.rooms || []);
  } catch (error) {
    // If endpoint doesn't exist, return empty array
    if (error.response?.status === 404) {
      console.warn('[UserCommunityChat] Rooms endpoint not found, returning empty array');
      return [];
    }
    console.error('[UserCommunityChat] Error fetching user rooms:', error);
    throw error;
  }
};

/**
 * Accept join request (user)
 * @param {string} requestId - Join request ID (optional, can use roomId)
 * @param {string} roomId - Room ID (required if requestId not provided)
 * @returns {Promise<Object>} Acceptance response
 */
export const acceptJoinRequest = async (requestId, roomId = null) => {
  try {
    // Backend endpoint: POST /api/users/community-chat/requests/accept
    // Backend expects roomId, but we can also pass requestId for reference
    if (!roomId && !requestId) {
      throw new Error('Either requestId or roomId is required');
    }
    
    const response = await userCommunityChatClient.post('/api/users/community-chat/requests/accept', {
      roomId: roomId || requestId, // Backend uses roomId to find request
      requestId, // Include for reference
    });
    return extractData(response);
  } catch (error) {
    console.error('[UserCommunityChat] Error accepting join request:', error);
    throw error;
  }
};

/**
 * Reject join request (user)
 * @param {string} requestId - Join request ID (optional, can use roomId)
 * @param {string} roomId - Room ID (required if requestId not provided)
 * @returns {Promise<Object>} Rejection response
 */
export const rejectJoinRequest = async (requestId, roomId = null) => {
  try {
    // Backend endpoint: POST /api/users/community-chat/requests/reject
    // Backend expects roomId, but we can also pass requestId for reference
    if (!roomId && !requestId) {
      throw new Error('Either requestId or roomId is required');
    }
    
    const response = await userCommunityChatClient.post('/api/users/community-chat/requests/reject', {
      roomId: roomId || requestId, // Backend uses roomId to find request
      requestId, // Include for reference
    });
    return extractData(response);
  } catch (error) {
    console.error('[UserCommunityChat] Error rejecting join request:', error);
    throw error;
  }
};

/**
 * Get pending join requests for user
 * @returns {Promise<Array>} List of pending join requests
 */
export const getPendingJoinRequests = async () => {
  try {
    const response = await userCommunityChatClient.get('/api/users/community-chat/requests/pending');
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.requests || []);
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn('[UserCommunityChat] Pending requests endpoint not found');
      return [];
    }
    console.error('[UserCommunityChat] Error fetching pending requests:', error);
    throw error;
  }
};

/**
 * Get chat messages for a community chat room
 * @param {string} roomId - Room ID
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Object>} Messages response with messages array and total
 */
export const getChatMessages = async (roomId, options = {}) => {
  try {
    const { limit = 100, offset = 0 } = options;
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    
    const queryString = params.toString();
    const endpoint = `/api/users/community-chat/rooms/${roomId}/messages${queryString ? `?${queryString}` : ''}`;
    
    const response = await userCommunityChatClient.get(endpoint);
    const data = extractData(response);
    
    // Handle different response structures
    if (data?.messages) {
      return {
        messages: Array.isArray(data.messages) ? data.messages : [],
        total: data.total || data.messages.length,
      };
    }
    if (Array.isArray(data)) {
      return {
        messages: data,
        total: data.length,
      };
    }
    return {
      messages: [],
      total: 0,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn('[UserCommunityChat] Messages endpoint not found');
      return { messages: [], total: 0 };
    }
    console.error('[UserCommunityChat] Error fetching chat messages:', error);
    throw error;
  }
};

/**
 * Send message to a community chat room
 * @param {string} roomId - Room ID
 * @param {string} message - Message content
 * @returns {Promise<Object>} Sent message
 */
export const sendChatMessage = async (roomId, message) => {
  try {
    if (!roomId || !message) {
      throw new Error('Room ID and message are required');
    }
    
    const response = await userCommunityChatClient.post('/api/users/community-chat/messages', {
      roomId,
      message,
    });
    return extractData(response);
  } catch (error) {
    console.error('[UserCommunityChat] Error sending chat message:', error);
    throw error;
  }
};

