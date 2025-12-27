import { apiClient } from '../client';

/**
 * Diary Service - Handles nutrition diary entries
 * Tracks breakfast, brunch, dinner and calculates totals
 */

/**
 * Get diary entry for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise<Object>} Diary entry with meals and totals
 */
export const getDiaryEntry = async (date = null) => {
  try {
    const params = date ? { date } : {};
    console.log('[DiaryService] Fetching diary entry with params:', params);
    const response = await apiClient.get('/diary', { params });
    
    // Handle response structure
    let entry = null;
    if (response.data) {
      if (response.data.success && response.data.data) {
        entry = response.data.data;
      } else if (response.data.data) {
        entry = response.data.data;
      } else {
        entry = response.data;
      }
    }
    
    console.log('[DiaryService] Diary entry loaded:', entry ? 'Found' : 'Not found');
    return entry;
  } catch (error) {
    // If 404, check if it's "User not found" vs "Diary entry not found"
    if (error.response?.status === 404) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '';
      if (errorMessage.toLowerCase().includes('user not found')) {
        console.error('[DiaryService] ❌ User not found - authentication issue');
        console.error('[DiaryService] Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        // This is an authentication/authorization issue, not a missing diary entry
        throw new Error('User authentication failed. Please log in again.');
      } else {
      console.log('[DiaryService] No diary entry found for date (404)');
      return null;
      }
    }
    console.error('[DiaryService] Error fetching diary entry:', error);
    throw error;
  }
};

/**
 * Save or update diary entry
 * @param {Object} entry - Diary entry data
 * @param {Array} entry.breakfast - Breakfast food items
 * @param {Array} entry.brunch - Brunch food items
 * @param {Array} entry.dinner - Dinner food items
 * @param {string} entry.date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise<Object>} Saved diary entry
 */
export const saveDiaryEntry = async (entry) => {
  try {
    const response = await apiClient.post('/diary', entry);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[DiaryService] Error saving diary entry:', error);
    throw error;
  }
};

/**
 * Update diary entry
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} entry - Diary entry data to update
 * @returns {Promise<Object>} Updated diary entry
 */
export const updateDiaryEntry = async (date, entry) => {
  try {
    const response = await apiClient.put(`/diary/${date}`, entry);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[DiaryService] Error updating diary entry:', error);
    throw error;
  }
};

/**
 * Add food item to a meal
 * @param {string} mealType - 'breakfast', 'brunch', 'dinner', or 'snacks'
 * @param {Object} foodItem - Food item with nutrition data
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise<Object>} Updated diary entry
 */
export const addFoodToMeal = async (mealType, foodItem, date = null) => {
  try {
    console.log('[DiaryService] Adding food to meal:', {
      mealType,
      foodItem: {
        foodName: foodItem.foodName,
        amount: foodItem.amount,
        calories: foodItem.calories,
      },
      date,
    });

    const response = await apiClient.post('/diary/meal', {
      mealType,
      foodItem,
      date,
    });

    console.log('[DiaryService] Add food response:', response.status, response.data);

    // Handle response structure
    let entry = null;
    if (response.data) {
      if (response.data.success && response.data.data) {
        entry = response.data.data;
      } else if (response.data.data) {
        entry = response.data.data;
      } else {
        entry = response.data;
      }
    }

    console.log('[DiaryService] Updated diary entry:', entry);
    return entry;
  } catch (error) {
    console.error('[DiaryService] Error adding food to meal:', error);
    console.error('[DiaryService] Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Remove food item from a meal
 * @param {string} mealType - 'breakfast', 'brunch', or 'dinner'
 * @param {string} foodItemId - Food item ID to remove
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise<Object>} Updated diary entry
 */
export const removeFoodFromMeal = async (mealType, foodItemId, date = null) => {
  try {
    const response = await apiClient.delete('/diary/meal', {
      params: {
        mealType,
        foodItemId,
        date,
      },
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[DiaryService] Error removing food from meal:', error);
    throw error;
  }
};

/**
 * Get diary statistics
 * @param {number} days - Number of days to get statistics for (default: 30)
 * @returns {Promise<Object>} Statistics including days completed, average nutrition, etc.
 */
export const getDiaryStats = async (days = 30) => {
  try {
    const response = await apiClient.get('/diary/stats', {
      params: { days },
    });
    return response.data?.data || response.data || {};
  } catch (error) {
    console.error('[DiaryService] Error fetching diary stats:', error);
    throw error;
  }
};

/**
 * Get diary history (list of dates with entries)
 * @param {number} days - Number of days to get history for (default: 30)
 * @returns {Promise<Array>} Array of dates with diary entries
 */
export const getDiaryHistory = async (days = 30) => {
  try {
    const response = await apiClient.get('/diary/history', {
      params: { days },
    });
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('[DiaryService] Error fetching diary history:', error);
    throw error;
  }
};

