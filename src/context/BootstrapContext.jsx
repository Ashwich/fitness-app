import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getBootstrap } from '../api/services/bootstrapService';
import { useAuth } from './AuthContext';
import { ENV } from '../config/env';
import { 
  saveBootstrapCache, 
  loadBootstrapCache, 
  clearBootstrapCache 
} from '../storage/bootstrapCache';

const BootstrapContext = createContext(null);

export const BootstrapProvider = ({ children }) => {
  const { user, token, initializing, updateUser } = useAuth();
  const [bootstrapData, setBootstrapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false); // Track if bootstrap has been loaded
  const isLoadingRef = useRef(false); // Track if bootstrap is currently loading
  const loadedUserIdRef = useRef(null); // Track which user ID we loaded bootstrap for

  /**
   * Clear bootstrap data (e.g., on logout)
   */
  const clearBootstrap = useCallback(async () => {
    setBootstrapData(null);
    await clearBootstrapCache();
  }, []);

  /**
   * Load bootstrap data (all initial data in one call)
   * @param {Object} options - Query parameters for bootstrap
   * @param {boolean} force - Force reload even if already loaded
   * @param {boolean} background - Load in background (don't show loading state)
   */
  const loadBootstrap = useCallback(async (options = {}, force = false, background = false) => {
    if (!token) {
      console.warn('[Bootstrap] No token available, cannot load bootstrap data');
      return null;
    }
    
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current && !force) {
      console.log('[Bootstrap] ⏸️ Bootstrap already loading, skipping duplicate call');
      return bootstrapData;
    }
    
    // If already loaded and not forcing, return existing data
    if (hasLoadedRef.current && bootstrapData && !force) {
      console.log('[Bootstrap] ✅ Bootstrap already loaded, returning cached data');
      return bootstrapData;
    }
    
    try {
      isLoadingRef.current = true;
      if (!background) {
        setLoading(true);
      }
      console.log('[Bootstrap] 🚀 Starting bootstrap data load (single API call)...', { background });
      const startTime = Date.now();
      const data = await getBootstrap(options);
      const endTime = Date.now();
      console.log(`[Bootstrap] ✅ Bootstrap data loaded in ${endTime - startTime}ms`);
      
      // Transform posts to match UI format
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      
      if (data.feed && data.feed.posts) {
        const transformedPosts = data.feed.posts.map((post) => {
          // Ensure mediaUrl is absolute
          let mediaUrl = post.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
          }
          
          // Ensure profilePhoto is absolute
          let profilePhoto = post.user?.profile?.avatarUrl || null;
          if (profilePhoto && !profilePhoto.startsWith('http')) {
            profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
          }
          
          return {
            id: post.id,
            userId: post.userId,
            username: post.user?.username || post.user?.profile?.fullName || 'User',
            profilePhoto: profilePhoto,
            postType: post.mediaType,
            mediaUrl: mediaUrl,
            caption: post.caption || '',
            likes: post.likesCount || post.likes?.length || 0,
            comments: post.commentsCount || post.comments?.length || 0,
            commentsList: post.comments || [],
            timestamp: formatTimestamp(post.createdAt),
            isLiked: post.isLiked || false,
            isFollowing: post.isFollowing || false,
            createdAt: post.createdAt,
          };
        });
        
        // Update feed posts with transformed data
        data.feed.posts = transformedPosts;
      }
      
      setBootstrapData(data);
      hasLoadedRef.current = true;
      
      // Save to cache for instant loading next time
      await saveBootstrapCache(data);
      
      // Update user in AuthContext from bootstrap data (prevents duplicate meRequest call)
      if (data.user) {
        console.log('[Bootstrap] Updating user in AuthContext from bootstrap data');
        updateUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Error loading bootstrap data:', error);
      hasLoadedRef.current = false; // Reset on error so it can retry
      throw error;
    } finally {
      isLoadingRef.current = false;
      if (!background) {
        setLoading(false);
      }
    }
  }, [token, updateUser, bootstrapData]); // Removed user and bootstrapData from dependencies

  /**
   * Refresh bootstrap data (forces reload)
   */
  const refreshBootstrap = useCallback(async (options = {}) => {
    return loadBootstrap(options, true); // Force reload
  }, [loadBootstrap]);

  // Load cached data instantly, then refresh in background
  useEffect(() => {
    const loadCachedData = async () => {
      if (!initializing && token && !bootstrapData && !isLoadingRef.current) {
        // Step 1: Load from cache instantly (show UI immediately)
        const cachedData = await loadBootstrapCache();
        if (cachedData) {
          console.log('[Bootstrap] ⚡ Loaded cached data instantly, showing UI');
          setBootstrapData(cachedData);
          hasLoadedRef.current = true;
          
          // Update user from cache
          if (cachedData.user) {
            updateUser(cachedData.user);
          }
        }
      }
    };
    
    loadCachedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, token]);
  
  // Auto-load bootstrap data when user logs in (only once per user)
  useEffect(() => {
    const currentUserId = user?.id;
    
    // Only load if:
    // 1. Not initializing
    // 2. User is authenticated
    // 3. Token exists
    // 4. Bootstrap hasn't been loaded yet OR user changed
    // 5. Not currently loading
    if (!initializing && user && token && !isLoadingRef.current) {
      // Check if we need to load (new user or not loaded yet)
      const needsLoad = !hasLoadedRef.current || loadedUserIdRef.current !== currentUserId;
      
      if (needsLoad) {
        console.log('[Bootstrap] User authenticated, loading bootstrap data...', { userId: currentUserId });
        loadedUserIdRef.current = currentUserId;
        
        // If we have cached data, refresh in background (don't show loading)
        // Otherwise, show loading state
        const hasCachedData = !!bootstrapData;
        loadBootstrap({}, false, hasCachedData).catch(err => {
          console.error('[Bootstrap] Failed to load bootstrap data:', err);
          hasLoadedRef.current = false; // Reset on error
          loadedUserIdRef.current = null;
        });
      } else {
        console.log('[Bootstrap] ✅ Already loaded for this user, skipping');
      }
    } else if (!user && hasLoadedRef.current) {
      // Clear bootstrap data on logout
      console.log('[Bootstrap] User logged out, clearing bootstrap data');
      clearBootstrap();
      hasLoadedRef.current = false;
      loadedUserIdRef.current = null;
    }
    // Depend on user.id instead of user object to prevent unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, token, user?.id, bootstrapData]);

  const value = {
    bootstrapData,
    loading,
    loadBootstrap,
    refreshBootstrap,
    clearBootstrap,
  };

  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
};

export const useBootstrap = () => {
  const context = useContext(BootstrapContext);
  if (!context) {
    throw new Error('useBootstrap must be used within a BootstrapProvider');
  }
  return context;
};

// Helper function for timestamp formatting (same as in HomeFeedScreen)
const formatTimestamp = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

