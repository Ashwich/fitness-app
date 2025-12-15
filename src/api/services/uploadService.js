import axios from 'axios';
import { ENV } from '../../config/env';
import { getToken } from '../../storage/tokenStorage';

const extractData = (response) => response.data?.data || response.data;

// Get base URL from USERS_SERVICE_URL (remove /api/users)
const getBaseURL = () => {
  return ENV.USERS_SERVICE_URL.replace('/api/users', '');
};

// Create API client for uploads
const createUploadClient = () => {
  const baseURL = `${getBaseURL()}/api/upload`;
  const client = axios.create({
    baseURL,
    timeout: 60000, // Longer timeout for file uploads
  });

  client.interceptors.request.use(async (config) => {
    let token = null;
    try {
      token = await getToken();
    } catch (e) {
      console.warn('Failed to retrieve token from storage for upload:', e);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = 'application/json';

    if (__DEV__) {
      console.log(`[Upload Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (__DEV__) {
        console.error('[Upload API Error]', {
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

const uploadClient = createUploadClient();

export const uploadPostMedia = async (fileUri, mediaType = 'image') => {
  try {
    // Create FormData
    const formData = new FormData();
    
    // Get filename from URI
    const filename = fileUri.split('/').pop() || `media.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
    const fileType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    
    // Append file to FormData
    formData.append('media', {
      uri: fileUri,
      type: fileType,
      name: filename,
    });

    const response = await uploadClient.post('/post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = extractData(response);
    
    // Return full URL (base URL + file path)
    const baseURL = getBaseURL();
    const fullUrl = data.url.startsWith('http') ? data.url : `${baseURL}${data.url}`;
    
    return {
      ...data,
      url: fullUrl,
    };
  } catch (error) {
    console.error('Error uploading post media:', error);
    throw error;
  }
};

export const uploadProfilePhoto = async (fileUri) => {
  try {
    // Create FormData
    const formData = new FormData();
    
    // Get filename from URI
    const filename = fileUri.split('/').pop() || 'profile.jpg';
    
    // Append file to FormData
    formData.append('photo', {
      uri: fileUri,
      type: 'image/jpeg',
      name: filename,
    });

    const response = await uploadClient.post('/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = extractData(response);
    
    // Return full URL (base URL + file path)
    const baseURL = getBaseURL();
    // Ensure URL is absolute
    let fullUrl = data.url;
    if (!fullUrl.startsWith('http')) {
      // If URL starts with /, use baseURL directly
      if (fullUrl.startsWith('/')) {
        fullUrl = `${baseURL}${fullUrl}`;
      } else {
        fullUrl = `${baseURL}/${fullUrl}`;
      }
    }
    
    return {
      ...data,
      url: fullUrl,
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

