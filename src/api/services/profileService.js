import axios from 'axios';
import { apiClient } from '../client';

const extractData = (payload) => {
  // Handle both response.data and direct data
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

export const fetchProfile = async () => {
  try {
    const response = await apiClient.get('/profile');
    // response.data is already the actual data from axios
    // Handle both nested { data: {...} } and direct {...} structures
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Object.keys(data).length === 1) {
      // If response.data is { data: {...} }, extract it
      data = data.data;
    }
    // Always return an object or null, never undefined
    return data || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Helper function to remove null/undefined values recursively
const cleanPayload = (obj) => {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanPayload).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = cleanPayload(obj[key]);
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }
  
  return obj;
};

export const upsertProfile = async (payload) => {
  // Remove null/undefined values before sending to avoid backend validation errors
  const cleanedPayload = cleanPayload(payload);
  const response = await apiClient.put('/profile', cleanedPayload);
  // response.data is already the actual data from axios
  return response.data?.data || response.data;
};

export const fetchPreferences = async () => {
  try {
    const response = await apiClient.get('/preferences');
    // response.data is already the actual data from axios
    // Handle both nested { data: {...} } and direct {...} structures
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Object.keys(data).length === 1) {
      // If response.data is { data: {...} }, extract it
      data = data.data;
    }
    // Always return an object or null, never undefined
    return data || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const upsertPreferences = async (payload) => {
  const response = await apiClient.put('/preferences', payload);
  // response.data is already the actual data from axios
  return response.data?.data || response.data;
};

