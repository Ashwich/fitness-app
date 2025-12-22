import { apiClient } from '../client';

const extractData = (response) => {
  // Handle both response.data and direct data
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
};

/**
 * Get all initial data needed after login in a single request
 * This reduces API calls from ~10+ to just 1-2
 * 
 * @param {Object} options - Query parameters
 * @param {number} options.feedLimit - Number of posts to fetch (default: 20)
 * @param {number} options.feedOffset - Pagination offset for posts (default: 0)
 * @param {number} options.conversationsLimit - Number of conversations to fetch (default: 10)
 * @param {number} options.notificationsLimit - Number of notifications (default: 10)
 * @returns {Promise<Object>} Bootstrap data containing user, feed, notifications, messages
 */
export const getBootstrap = async (options = {}) => {
  const {
    feedLimit = 20,
    feedOffset = 0,
    conversationsLimit = 10,
    notificationsLimit = 10,
  } = options;

  try {
    const params = new URLSearchParams();
    if (feedLimit !== undefined) params.append('feedLimit', feedLimit.toString());
    if (feedOffset !== undefined) params.append('feedOffset', feedOffset.toString());
    if (conversationsLimit !== undefined) params.append('conversationsLimit', conversationsLimit.toString());
    if (notificationsLimit !== undefined) params.append('notificationsLimit', notificationsLimit.toString());

    const queryString = params.toString();
    const url = `/bootstrap${queryString ? `?${queryString}` : ''}`;

    console.log('[Bootstrap API] 📡 Making single bootstrap API call to:', url);
    const response = await apiClient.get(url);
    const data = extractData(response);
    
    // Handle nested data structure
    let bootstrapData;
    if (data && typeof data === 'object' && 'data' in data) {
      bootstrapData = data.data;
    } else {
      bootstrapData = data;
    }
    
    console.log('[Bootstrap API] ✅ Received bootstrap data:', {
      hasUser: !!bootstrapData?.user,
      hasProfile: !!bootstrapData?.user?.profile,
      feedPostsCount: bootstrapData?.feed?.posts?.length || 0,
      unreadNotifications: bootstrapData?.notifications?.unreadCount || 0,
      unreadMessages: bootstrapData?.messages?.unreadCount || 0,
      conversationsCount: bootstrapData?.messages?.conversations?.length || 0,
    });
    
    return bootstrapData;
  } catch (error) {
    console.error('Error fetching bootstrap data:', error);
    throw error;
  }
};

