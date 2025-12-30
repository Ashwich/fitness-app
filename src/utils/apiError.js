import axios from 'axios';

export const getReadableError = (error, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    // Handle network errors (no response from server)
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your connection and try again.';
    }
    
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return 'Network error: Cannot connect to server. Please check:\n• Backend is running on port 8081\n• Using correct IP address (not localhost on physical devices)\n• Device and server are on the same network';
    }

    // Handle CORS errors
    if (error.message && error.message.includes('CORS')) {
      return 'CORS error: Server may not be configured to accept requests from this origin.';
    }

    // Handle response errors (server responded with error)
    if (error.response) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.details;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
      
      // Provide status code info if no message
      if (error.response.status === 404) {
        return 'Endpoint not found. Please check the API URL.';
      }
      if (error.response.status === 429) {
        return 'Too many requests. Please wait a few minutes before trying again.';
      }
      if (error.response.status >= 500) {
        return 'Server error. Please try again later.';
      }
    }

    // Handle request errors (request was made but no response)
    if (error.request) {
      return 'No response from server. Please check:\n• Backend is running on port 8081\n• Network connection is active\n• Firewall settings allow the connection';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};


