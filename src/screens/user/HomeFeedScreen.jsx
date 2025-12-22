import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import { getFeed, likePost, addComment, getPost } from '../../api/services/postService';
import { toggleFollow, checkFollowStatus } from '../../api/services/followService';
import { getUnreadCount as getNotificationUnreadCount } from '../../api/services/notificationService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const { width } = Dimensions.get('window');

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

const HomeFeedScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { bootstrapData, refreshBootstrap, loading: bootstrapLoading } = useBootstrap();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Use bootstrap data if available, otherwise fall back to individual API calls
  const loadFeed = useCallback(async (useBootstrapData = true) => {
    try {
      setLoading(true);
      
      // Try to use bootstrap data first (much faster - 1 API call vs 10+)
      if (useBootstrapData && bootstrapData?.feed?.posts) {
        console.log('[HomeFeed] Using bootstrap data for feed');
        const bootstrapPosts = bootstrapData.feed.posts;
        
        // Deduplicate posts by ID to prevent duplicate keys
        const uniquePosts = bootstrapPosts.reduce((acc, post) => {
          if (!acc.find(p => p.id === post.id)) {
            acc.push(post);
          }
          return acc;
        }, []);
        
        setPosts(uniquePosts);
        
        // Extract follow status from bootstrap posts (already included!)
        const statusMap = {};
        uniquePosts.forEach((post) => {
          if (post.userId !== user?.id) {
            statusMap[post.userId] = post.isFollowing || false;
          }
        });
        setFollowingStatus(statusMap);
        
        // Use unread counts from bootstrap
        if (bootstrapData.notifications?.unreadCount !== undefined) {
          setUnreadNotificationCount(bootstrapData.notifications.unreadCount);
        }
        if (bootstrapData.messages?.unreadCount !== undefined) {
          setUnreadMessageCount(bootstrapData.messages.unreadCount);
        }
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fallback to individual API calls if bootstrap data not available
      console.log('[HomeFeed] Bootstrap data not available, using individual API calls');
      const feedPosts = await getFeed(20, 0);
      
      // Ensure feedPosts is an array
      if (!Array.isArray(feedPosts)) {
        console.warn('Feed posts is not an array:', feedPosts);
        setPosts([]);
        return;
      }
      
      // Transform posts to match UI format
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      
      const transformedPosts = feedPosts.map((post) => {
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
          createdAt: post.createdAt,
        };
      });
      
      // Deduplicate posts by ID to prevent duplicate keys
      const uniquePosts = transformedPosts.reduce((acc, post) => {
        if (!acc.find(p => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, []);
      
      setPosts(uniquePosts);
      
      // Load follow status for all unique users
      const uniqueUserIds = [...new Set(transformedPosts.map(p => p.userId))];
      const followStatusPromises = uniqueUserIds
        .filter(uid => uid !== user?.id)
        .map(async (userId) => {
          try {
            const status = await checkFollowStatus(userId);
            return { userId, isFollowing: status.data?.isFollowing || false };
          } catch (error) {
            console.warn(`Failed to check follow status for ${userId}:`, error);
            return { userId, isFollowing: false };
          }
        });
      
      const followStatuses = await Promise.all(followStatusPromises);
      const statusMap = {};
      followStatuses.forEach(({ userId, isFollowing }) => {
        statusMap[userId] = isFollowing;
      });
      setFollowingStatus(statusMap);
      
      // Load unread notification count
      try {
        const unreadData = await getNotificationUnreadCount();
        setUnreadNotificationCount(unreadData?.count || 0);
      } catch (error) {
        console.warn('Error loading unread count:', error);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bootstrapData, user]);

  // Load feed when bootstrap data is available or when component mounts
  useEffect(() => {
    // Wait for bootstrap to finish loading before making API calls
    if (bootstrapLoading) {
      // Still loading bootstrap, wait...
      return;
    }
    
    if (bootstrapData?.feed?.posts) {
      // Use bootstrap data immediately
      console.log('[HomeFeed] Bootstrap data ready, using it');
      loadFeed(true);
    } else {
      // Bootstrap finished but no data, fallback to individual API calls
      console.log('[HomeFeed] Bootstrap finished but no data, using individual API calls');
      loadFeed(false);
    }
  }, [bootstrapData, bootstrapLoading, loadFeed]);

  // Refresh feed when screen comes into focus (e.g., after posting)
  // Only refresh if bootstrap data exists, don't force bootstrap reload
  useFocusEffect(
    useCallback(() => {
      // Just reload feed from existing bootstrap data or fallback
      // Don't call refreshBootstrap here to avoid multiple API calls
      if (bootstrapData?.feed?.posts) {
        loadFeed(true);
      } else if (!bootstrapLoading) {
        loadFeed(false);
      }
    }, [bootstrapData, bootstrapLoading, loadFeed])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh bootstrap data (which includes feed)
    try {
      await refreshBootstrap();
      await loadFeed(true);
    } catch (error) {
      // Fallback to individual API calls
      await loadFeed(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const result = await likePost(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: result.data?.liked ?? !post.isLiked,
                likes: result.data?.liked
                  ? post.likes + 1
                  : Math.max(0, post.likes - 1),
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleFollow = async (userId) => {
    // Don't allow following yourself
    if (userId === user?.id) {
      return;
    }
    
    try {
      const result = await toggleFollow(userId);
      setFollowingStatus((prev) => ({
        ...prev,
        [userId]: result.data?.following ?? false,
      }));
    } catch (error) {
      console.error('Error following user:', error);
      // Don't show alert for "cannot follow yourself" error
      if (error.response?.data?.error?.includes('yourself')) {
        return;
      }
      Alert.alert('Error', getReadableError(error));
    }
  };

  const handleAddComment = async (postId) => {
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    try {
      const result = await addComment(postId, commentText);
      // Refresh the post to get updated comments
      const updatedPost = await getPost(postId);
      
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: updatedPost.commentsCount || updatedPost.comments?.length || post.comments + 1,
                commentsList: updatedPost.comments || post.commentsList,
              }
            : post
        )
      );
      
      // Clear comment input
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleProfilePress = (userId) => {
    navigation.navigate('UserProfileScreen', { userId });
  };

  const PostCard = ({ post }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postProfileContainer}
          onPress={() => handleProfilePress(post.userId)}
        >
          {post.profilePhoto ? (
            <Image source={{ uri: post.profilePhoto }} style={styles.postProfilePhoto} />
          ) : (
            <View style={styles.postProfilePlaceholder}>
              <Ionicons name="person" size={20} color="#6b7280" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.postUserInfo}>
          <TouchableOpacity onPress={() => handleProfilePress(post.userId)}>
            <Text style={styles.postUsername}>{post.username}</Text>
          </TouchableOpacity>
          <Text style={styles.postTimestamp}>{post.timestamp}</Text>
        </View>
        {post.userId !== user?.id && (
          <TouchableOpacity 
            style={styles.followButton}
            onPress={() => handleFollow(post.userId)}
          >
            <Text style={styles.followButtonText}>
              {followingStatus[post.userId] ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Media */}
      <View style={styles.postMediaContainer}>
        {post.postType === 'video' && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={40} color="#ffffff" />
          </View>
        )}
        <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} />
      </View>

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(post.id)}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={post.isLiked ? '#ef4444' : '#111827'}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleComments(post.id)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Post Stats */}
      <View style={styles.postStats}>
        <Text style={styles.postLikes}>{post.likes} likes</Text>
        <Text style={styles.postComments}>{post.comments} comments</Text>
      </View>

      {/* Post Caption */}
      <View style={styles.postCaption}>
        <Text style={styles.captionText}>
          <Text style={styles.captionUsername}>{post.username}</Text> {post.caption}
        </Text>
      </View>

      {/* Comments Section */}
      {showComments[post.id] && (
        <View style={styles.commentsSection}>
          {post.commentsList && post.commentsList.length > 0 ? (
            // Deduplicate comments before rendering
            [...new Map(post.commentsList.map(comment => [comment.id, comment])).values()].map((comment, index) => (
              <View key={comment.id || `comment-${index}-${comment.createdAt}`} style={styles.commentItem}>
                <Text style={styles.commentText}>
                  <Text style={styles.commentUsername}>
                    {comment.user?.username || comment.user?.profile?.fullName || 'User'}
                  </Text>{' '}
                  {comment.content}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noCommentsText}>No comments yet</Text>
          )}
          
          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentInputs[post.id] || ''}
              onChangeText={(text) =>
                setCommentInputs((prev) => ({ ...prev, [post.id]: text }))
              }
              onSubmitEditing={() => handleAddComment(post.id)}
            />
            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => handleAddComment(post.id)}
            >
              <Text style={styles.commentButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitsera</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('NotificationsScreen')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={24} color="#111827" />
              {unreadNotificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('MessagesScreen')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#111827" />
              {unreadMessageCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No posts yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Follow people to see their fitness journey
              </Text>
            </View>
          ) : (
            posts.map((post, index) => <PostCard key={post.id || `post-${index}-${post.createdAt}`} post={post} />)
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  postCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postProfileContainer: {
    marginRight: 12,
  },
  postProfilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postUserInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  postMediaContainer: {
    width: width,
    height: width,
    position: 'relative',
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 1,
  },
  postActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  postStats: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 16,
    marginBottom: 8,
  },
  postLikes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postComments: {
    fontSize: 14,
    color: '#6b7280',
  },
  postCaption: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  commentsSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  commentItem: {
    paddingVertical: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  commentUsername: {
    fontWeight: '600',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    marginRight: 8,
  },
  commentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeFeedScreen;

