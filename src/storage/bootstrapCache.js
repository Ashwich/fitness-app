import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOTSTRAP_CACHE_KEY = '@fitsera:bootstrap_data';
const BOOTSTRAP_CACHE_TIMESTAMP_KEY = '@fitsera:bootstrap_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Save bootstrap data to cache
 */
export const saveBootstrapCache = async (data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(cacheData));
    await AsyncStorage.setItem(BOOTSTRAP_CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log('[BootstrapCache] ✅ Data cached successfully');
  } catch (error) {
    console.error('[BootstrapCache] Error saving cache:', error);
  }
};

/**
 * Load bootstrap data from cache
 */
export const loadBootstrapCache = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(BOOTSTRAP_CACHE_KEY);
    const timestamp = await AsyncStorage.getItem(BOOTSTRAP_CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) {
      console.log('[BootstrapCache] No cached data found');
      return null;
    }
    
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    
    if (cacheAge > CACHE_EXPIRY_MS) {
      console.log('[BootstrapCache] Cache expired, age:', Math.round(cacheAge / 1000), 'seconds');
      await clearBootstrapCache();
      return null;
    }
    
    const parsed = JSON.parse(cachedData);
    console.log('[BootstrapCache] ✅ Loaded cached data, age:', Math.round(cacheAge / 1000), 'seconds');
    return parsed.data;
  } catch (error) {
    console.error('[BootstrapCache] Error loading cache:', error);
    return null;
  }
};

/**
 * Clear bootstrap cache
 */
export const clearBootstrapCache = async () => {
  try {
    await AsyncStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    await AsyncStorage.removeItem(BOOTSTRAP_CACHE_TIMESTAMP_KEY);
    console.log('[BootstrapCache] Cache cleared');
  } catch (error) {
    console.error('[BootstrapCache] Error clearing cache:', error);
  }
};

/**
 * Check if cache is valid (not expired)
 */
export const isCacheValid = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(BOOTSTRAP_CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    return cacheAge < CACHE_EXPIRY_MS;
  } catch (error) {
    return false;
  }
};

