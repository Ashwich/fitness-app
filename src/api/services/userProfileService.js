import { apiClient } from '../client';

const extractData = (response) => response.data?.data || response.data;

export const getUserById = async (userId) => {
  // apiClient baseURL is already /api/users, so just use /:userId
  const response = await apiClient.get(`/${userId}`);
  return extractData(response);
};

export const getUserProfile = async (userId) => {
  // apiClient baseURL is already /api/users, so use /profile/:userId
  const response = await apiClient.get(`/profile/${userId}`);
  return extractData(response);
};

