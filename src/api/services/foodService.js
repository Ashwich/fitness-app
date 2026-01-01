import axios from 'axios';
import { apiClient } from '../client';

/**
 * Food Service - Handles food search and nutrition data
 * Uses external API with database caching to reduce API costs
 */

/**
 * Search for food in database first, then external API if not found
 * @param {string} query - Food name to search
 * @returns {Promise<Array>} Array of food items with nutrition data
 */
export const searchFood = async (query) => {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    console.log('[FoodService] Searching for:', query);

    // First, search in our database
    const dbResponse = await apiClient.get('/food/search', {
      params: { query: query.trim() },
    });

    console.log('[FoodService] Database response:', dbResponse.status, dbResponse.data);

    // Handle response structure - could be { success: true, data: [...] } or just [...]
    let dbFoods = [];
    if (dbResponse.data) {
      if (dbResponse.data.success && dbResponse.data.data) {
        dbFoods = dbResponse.data.data;
      } else if (Array.isArray(dbResponse.data)) {
        dbFoods = dbResponse.data;
      } else if (dbResponse.data.data && Array.isArray(dbResponse.data.data)) {
        dbFoods = dbResponse.data.data;
      }
    }

    // If we found foods in database, return them
    if (Array.isArray(dbFoods) && dbFoods.length > 0) {
      console.log(`[FoodService] Found ${dbFoods.length} foods in database for: ${query}`);
      return dbFoods;
    }

    // If not found in database, search external API
    console.log(`[FoodService] Not found in database, searching external API for: ${query}`);
    const externalResponse = await apiClient.post('/food/search-external', {
      query: query.trim(),
    });

    console.log('[FoodService] External API response:', externalResponse.status, externalResponse.data);

    // Handle response structure
    let externalFoods = [];
    if (externalResponse.data) {
      if (externalResponse.data.success && externalResponse.data.data) {
        externalFoods = externalResponse.data.data;
      } else if (Array.isArray(externalResponse.data)) {
        externalFoods = externalResponse.data;
      } else if (externalResponse.data.data && Array.isArray(externalResponse.data.data)) {
        externalFoods = externalResponse.data.data;
      }
    }

    // External API results will be automatically saved to database by backend
    if (Array.isArray(externalFoods) && externalFoods.length > 0) {
      console.log(`[FoodService] Found ${externalFoods.length} foods from external API for: ${query}`);
    } else {
      console.log(`[FoodService] No foods found from external API for: ${query}`);
    }

    return externalFoods;
  } catch (error) {
    console.error('[FoodService] Error searching food:', error);
    console.error('[FoodService] Error response:', error.response?.data);
    console.error('[FoodService] Error status:', error.response?.status);
    throw error;
  }
};

/**
 * Get food details by ID
 * @param {string} foodId - Food ID
 * @returns {Promise<Object>} Food details with nutrition data
 */
export const getFoodById = async (foodId) => {
  try {
    const response = await apiClient.get(`/food/${foodId}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[FoodService] Error fetching food by ID:', error);
    throw error;
  }
};

/**
 * Get nutrition data for a food item with specific amount
 * @param {string} foodId - Food ID
 * @param {number} amount - Amount in grams
 * @returns {Promise<Object>} Nutrition data for the specified amount
 */
export const getFoodNutrition = async (foodId, amount) => {
  try {
    const response = await apiClient.post('/food/nutrition', {
      foodId,
      amount, // Amount in grams
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[FoodService] Error fetching food nutrition:', error);
    throw error;
  }
};










