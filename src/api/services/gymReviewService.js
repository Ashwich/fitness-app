import { apiClient } from '../client';

/**
 * Gym Review Service - Handles gym reviews (create, update, get, delete)
 */

/**
 * Create a review for a gym
 * @param {string} gymId - Gym ID
 * @param {Object} reviewData - Review data with rating (1-5) and optional comment
 * @returns {Promise<Object>} Created review
 */
export const createReview = async (gymId, reviewData) => {
  try {
    const response = await apiClient.post(`/gyms/${gymId}/reviews`, reviewData);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[GymReviewService] Error creating review:', error);
    throw error;
  }
};

/**
 * Update a review for a gym
 * @param {string} gymId - Gym ID
 * @param {Object} reviewData - Updated review data (rating and/or comment)
 * @returns {Promise<Object>} Updated review
 */
export const updateReview = async (gymId, reviewData) => {
  try {
    const response = await apiClient.put(`/gyms/${gymId}/reviews`, reviewData);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[GymReviewService] Error updating review:', error);
    throw error;
  }
};

/**
 * Get user's review for a gym
 * @param {string} gymId - Gym ID
 * @returns {Promise<Object|null>} User's review or null if not found
 */
export const getMyReview = async (gymId) => {
  try {
    const response = await apiClient.get(`/gyms/${gymId}/reviews/my`);
    return response.data?.data || response.data || null;
  } catch (error) {
    // 404 means no review exists, which is fine
    if (error.response?.status === 404) {
      return null;
    }
    console.error('[GymReviewService] Error getting review:', error);
    throw error;
  }
};

/**
 * Get all reviews for a gym
 * @param {string} gymId - Gym ID
 * @param {number} limit - Number of reviews to return (default: 50)
 * @param {number} offset - Number of reviews to skip (default: 0)
 * @returns {Promise<Object>} Reviews with total count and average rating
 */
export const getGymReviews = async (gymId, limit = 50, offset = 0) => {
  try {
    const response = await apiClient.get(`/gyms/${gymId}/reviews`, {
      params: { limit, offset },
    });
    return response.data?.data || response.data || { reviews: [], total: 0, averageRating: 0 };
  } catch (error) {
    console.error('[GymReviewService] Error getting gym reviews:', error);
    throw error;
  }
};

/**
 * Delete user's review for a gym
 * @param {string} gymId - Gym ID
 * @returns {Promise<void>}
 */
export const deleteReview = async (gymId) => {
  try {
    await apiClient.delete(`/gyms/${gymId}/reviews`);
  } catch (error) {
    console.error('[GymReviewService] Error deleting review:', error);
    throw error;
  }
};










