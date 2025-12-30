import axios from 'axios';
import { ENV } from '../../config/env';
import { getGymToken } from '../../storage/gymTokenStorage';

// Community Chat Service - uses gym-management-service (port 4000)
const communityChatClient = axios.create({
  baseURL: ENV.GYM_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add gym admin token interceptor
communityChatClient.interceptors.request.use(async (config) => {
  try {
    const token = await getGymToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        console.log('[CommunityChat] Gym admin token attached');
      }
    } else {
      if (__DEV__) {
        console.warn('[CommunityChat] ⚠️ No gym admin token available');
      }
    }
  } catch (error) {
    console.warn('[CommunityChat] Could not retrieve gym token:', error);
  }
  return config;
});

// Response interceptor for logging
communityChatClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[CommunityChat] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error('[CommunityChat] Error:', {
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
 * Get all community chat rooms (admin)
 * @returns {Promise<Array>} List of rooms
 */
export const getRooms = async () => {
  try {
    const response = await communityChatClient.get('/community-chat/admin/rooms');
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.rooms || []);
  } catch (error) {
    console.error('[CommunityChat] Error fetching rooms:', error);
    throw error;
  }
};

/**
 * Create a new community chat room (admin)
 * @param {Object} roomData - Room data { name, description, etc. }
 * @returns {Promise<Object>} Created room
 */
export const createRoom = async (roomData) => {
  try {
    const response = await communityChatClient.post('/community-chat/admin/rooms', roomData);
    return extractData(response);
  } catch (error) {
    console.error('[CommunityChat] Error creating room:', error);
    throw error;
  }
};

/**
 * Update a community chat room (admin)
 * @param {string} roomId - Room ID
 * @param {Object} roomData - Updated room data
 * @returns {Promise<Object>} Updated room
 */
export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await communityChatClient.patch(`/community-chat/admin/rooms/${roomId}`, roomData);
    return extractData(response);
  } catch (error) {
    console.error('[CommunityChat] Error updating room:', error);
    throw error;
  }
};

/**
 * Get registered users (admin)
 * @returns {Promise<Array>} List of registered users
 */
export const getRegisteredUsers = async () => {
  try {
    const response = await communityChatClient.get('/community-chat/admin/users');
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.users || []);
  } catch (error) {
    console.error('[CommunityChat] Error fetching registered users:', error);
    throw error;
  }
};

/**
 * Get gym members registered in users app (admin)
 * @returns {Promise<Array>} List of gym members
 */
export const getGymMembers = async () => {
  try {
    const response = await communityChatClient.get('/community-chat/admin/gym-members');
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.members || []);
  } catch (error) {
    console.error('[CommunityChat] Error fetching gym members:', error);
    throw error;
  }
};

/**
 * Send join request to user (admin)
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID to send request to
 * @param {string} message - Optional message
 * @returns {Promise<Object>} Join request response
 */
export const sendJoinRequest = async (roomId, userId, message = '') => {
  try {
    const response = await communityChatClient.post(`/community-chat/admin/rooms/${roomId}/requests`, {
      userId,
      message,
    });
    return extractData(response);
  } catch (error) {
    console.error('[CommunityChat] Error sending join request:', error);
    throw error;
  }
};

/**
 * Get room members (admin)
 * @param {string} roomId - Room ID
 * @returns {Promise<Array>} List of room members
 */
export const getRoomMembers = async (roomId) => {
  try {
    const response = await communityChatClient.get(`/community-chat/admin/rooms/${roomId}/members`);
    const data = extractData(response);
    return Array.isArray(data) ? data : (data?.members || []);
  } catch (error) {
    console.error('[CommunityChat] Error fetching room members:', error);
    throw error;
  }
};

/**
 * Remove member from room (admin)
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} Removal response
 */
export const removeMember = async (roomId, userId) => {
  try {
    const response = await communityChatClient.delete(`/community-chat/admin/rooms/${roomId}/members/${userId}`);
    return extractData(response);
  } catch (error) {
    console.error('[CommunityChat] Error removing member:', error);
    throw error;
  }
};

