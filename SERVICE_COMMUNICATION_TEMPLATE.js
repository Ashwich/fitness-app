/**
 * INTERNAL SERVICE-TO-SERVICE API CLIENT TEMPLATE
 * 
 * This is a template file that can be copied to your microservices codebase.
 * 
 * USAGE:
 * 1. Copy this file to your microservice: src/utils/internalApiClient.js
 * 2. Update the service URL and service name
 * 3. Import and use in your service methods
 * 
 * EXAMPLE:
 *   const { gymServiceClient } = require('./utils/internalApiClient');
 *   const gyms = await gymServiceClient.get('/gyms/city/Bhopal');
 */

const axios = require('axios');

/**
 * Internal API client for communicating with other microservices
 * Uses localhost/internal network for fast, secure communication
 */
class InternalApiClient {
  constructor(serviceUrl, serviceName) {
    this.serviceUrl = serviceUrl;
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL: serviceUrl,
      timeout: 5000, // Short timeout for internal calls (5 seconds)
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true', // Identify as internal request
        'X-Source-Service': process.env.SERVICE_NAME || 'unknown-service', // Identify source service
      },
    });

    // Add service token if configured
    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (serviceToken) {
      this.client.defaults.headers['X-Service-Token'] = serviceToken;
    }

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Internal API] ${config.method?.toUpperCase()} ${this.serviceName}: ${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error(`[Internal API] Request error to ${this.serviceName}:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Internal API] ${this.serviceName} response:`, response.status);
        }
        return response;
      },
      (error) => {
        console.error(`[Internal API] ${this.serviceName} error:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint (e.g., '/gyms/city/Bhopal')
   * @param {object} params - Query parameters
   * @returns {Promise<any>} Response data
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async patch(endpoint, data = {}) {
    try {
      const response = await this.client.patch(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} Response data
   */
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and format errors
   * @param {Error} error - Axios error
   * @returns {object} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Service responded with error status
      return {
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data,
        service: this.serviceName,
      };
    } else if (error.request) {
      // Request made but no response (service might be down)
      return {
        status: 503,
        message: `${this.serviceName} is unavailable`,
        service: this.serviceName,
        originalError: error.message,
      };
    } else {
      // Error setting up request
      return {
        status: 500,
        message: `Error calling ${this.serviceName}: ${error.message}`,
        service: this.serviceName,
      };
    }
  }
}

// ============================================================================
// USER SERVICE CONFIGURATION
// ============================================================================
// For user-service: Create client to call gym-service
// const GYM_SERVICE_URL = process.env.INTERNAL_GYM_SERVICE_URL || 'http://localhost:3000';
// const gymServiceClient = new InternalApiClient(GYM_SERVICE_URL, 'gym-service');
// module.exports = { gymServiceClient, InternalApiClient };

// ============================================================================
// GYM SERVICE CONFIGURATION
// ============================================================================
// For gym-management-service: Create client to call user-service
// const USER_SERVICE_URL = process.env.INTERNAL_USER_SERVICE_URL || 'http://localhost:8081';
// const userServiceClient = new InternalApiClient(USER_SERVICE_URL, 'user-service');
// module.exports = { userServiceClient, InternalApiClient };

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: In user-service, calling gym-service
 * 
 * const { gymServiceClient } = require('./utils/internalApiClient');
 * 
 * // Get gyms by city
 * const gyms = await gymServiceClient.get('/gyms/city/Bhopal');
 * 
 * // Get gym by ID
 * const gym = await gymServiceClient.get('/internal/gyms/gym-123');
 * 
 * // Create gym membership (if needed)
 * const membership = await gymServiceClient.post('/gyms/memberships', {
 *   userId: 'user-123',
 *   gymId: 'gym-123',
 * });
 */

/**
 * Example: In gym-service, calling user-service
 * 
 * const { userServiceClient } = require('./utils/internalApiClient');
 * 
 * // Get user by ID
 * const user = await userServiceClient.get('/api/users/user-123');
 * 
 * // Get multiple users
 * const users = await userServiceClient.post('/api/users/bulk', {
 *   userIds: ['user-1', 'user-2', 'user-3']
 * });
 */

module.exports = {
  InternalApiClient,
};


