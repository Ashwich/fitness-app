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
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import { getFeed, likePost, addComment, getPost } from '../../api/services/postService';
import { toggleFollow, checkFollowStatus, getFollowing } from '../../api/services/followService';
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
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

const HomeFeedScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { bootstrapData, refreshBootstrap, loading: bootstrapLoading } = useBootstrap();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [stories, setStories] = useState([]);
  const [expandedCaptions, setExpandedCaptions] = useState({});

  // Load feed posts
  const loadFeed = useCallback(async (useBootstrapData = true) => {
    try {
      setLoading(true);
      
      if (useBootstrapData && bootstrapData?.feed?.posts) {
        const bootstrapPosts = bootstrapData.feed.posts;
        const uniquePosts = bootstrapPosts.reduce((acc, post) => {
          if (!acc.find(p => p.id === post.id)) {
            acc.push(post);
          }
          return acc;
        }, []);
        
        const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
        const transformedPosts = uniquePosts.map((post) => {
          let mediaUrl = post.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
          }
          
          let profilePhoto = post.user?.profile?.avatarUrl || null;
          if (profilePhoto && !profilePhoto.startsWith('http')) {
            profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
          }
          
          // Better username extraction - try multiple paths
          let username = 'User';
          if (post.user?.username) {
            username = post.user.username;
          } else if (post.user?.profile?.fullName) {
            username = post.user.profile.fullName;
          } else if (post.username) {
            username = post.username;
          } else if (post.user?.email) {
            username = post.user.email.split('@')[0];
          }
          
          return {
            id: post.id,
            userId: post.userId,
            username: username,
            profilePhoto: profilePhoto,
            postType: post.mediaType,
            mediaUrl: mediaUrl,
            caption: post.caption || '',
            likes: post.likesCount ?? (post.likes?.length ?? 0),
            comments: post.commentsCount || post.comments?.length || 0,
            commentsList: Array.isArray(post.comments) ? post.comments : (Array.isArray(post.commentsList) ? post.commentsList : []),
            timestamp: formatTimestamp(post.createdAt),
            isLiked: post.isLiked || false,
            createdAt: post.createdAt,
          };
        });
        
        setPosts(transformedPosts);
        
        const statusMap = {};
        transformedPosts.forEach((post) => {
          if (post.userId !== user?.id) {
            statusMap[post.userId] = post.isFollowing || false;
          }
        });
        setFollowingStatus(statusMap);
        
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
      
      const feedResult = await getFeed(20, 0);
      const feedPosts = feedResult.items || feedResult || [];
      
      if (!Array.isArray(feedPosts)) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      
      const transformedPosts = feedPosts.map((post) => {
        let mediaUrl = post.mediaUrl;
        if (mediaUrl && !mediaUrl.startsWith('http')) {
          mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
        }
        
        let profilePhoto = post.user?.profile?.avatarUrl || null;
        if (profilePhoto && !profilePhoto.startsWith('http')) {
          profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
        }
        
        // Better username extraction - try multiple paths
        let username = 'User';
        if (post.user?.username) {
          username = post.user.username;
        } else if (post.user?.profile?.fullName) {
          username = post.user.profile.fullName;
        } else if (post.username) {
          username = post.username;
        } else if (post.user?.email) {
          username = post.user.email.split('@')[0];
        }
        
        return {
          id: post.id,
          userId: post.userId,
          username: username,
          profilePhoto: profilePhoto,
          postType: post.mediaType,
          mediaUrl: mediaUrl,
          caption: post.caption || '',
          likes: post.likesCount ?? (post.likes?.length ?? 0),
          comments: post.commentsCount || post.comments?.length || 0,
            commentsList: Array.isArray(post.comments) ? post.comments : (Array.isArray(post.commentsList) ? post.commentsList : []),
          timestamp: formatTimestamp(post.createdAt),
          isLiked: post.isLiked || false,
          createdAt: post.createdAt,
        };
      });
      
      const uniquePosts = transformedPosts.reduce((acc, post) => {
        if (!acc.find(p => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, []);
      
      setPosts(uniquePosts);
      
      const uniqueUserIds = [...new Set(transformedPosts.map(p => p.userId))];
      const followStatusPromises = uniqueUserIds
        .filter(uid => uid !== user?.id)
        .map(async (userId) => {
          try {
            const status = await checkFollowStatus(userId);
            return { userId, isFollowing: status.data?.isFollowing || false };
          } catch (error) {
            return { userId, isFollowing: false };
          }
        });
      
      const followStatuses = await Promise.all(followStatusPromises);
      const statusMap = {};
      followStatuses.forEach(({ userId, isFollowing }) => {
        statusMap[userId] = isFollowing;
      });
      setFollowingStatus(statusMap);
      
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

  // Load stories
  const loadStories = useCallback(async () => {
    try {
      const storiesList = [];
      
      if (user) {
        const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
        let profilePhoto = user.profile?.avatarUrl || null;
        if (profilePhoto && !profilePhoto.startsWith('http')) {
          profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
        }
        
        storiesList.push({
          id: user.id,
          username: user.username || 'You',
          profilePhoto: profilePhoto,
          isOwn: true,
        });
      }
      
      try {
        const following = await getFollowing(user?.id, 10, 0);
        if (Array.isArray(following)) {
          const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
          following.forEach((follow) => {
            const followedUser = follow.user || follow;
            let profilePhoto = followedUser.profile?.avatarUrl || null;
            if (profilePhoto && !profilePhoto.startsWith('http')) {
              profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
            }
            
            storiesList.push({
              id: followedUser.id,
              username: followedUser.username || 'User',
              profilePhoto: profilePhoto,
              isOwn: false,
            });
          });
        }
      } catch (error) {
        console.warn('Error loading following for stories:', error);
      }
      
      setStories(storiesList);
    } catch (error) {
      console.warn('Error loading stories:', error);
    }
  }, [user]);

  // Load feed on mount
  useEffect(() => {
    if (bootstrapLoading) {
      return;
    }
    
    if (bootstrapData?.feed?.posts) {
      loadFeed(true);
    } else {
      loadFeed(false);
    }
    
    loadStories();
  }, [bootstrapData, bootstrapLoading, loadFeed, loadStories]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (bootstrapData?.feed?.posts) {
        loadFeed(true);
      } else if (!bootstrapLoading) {
        loadFeed(false);
      }
    }, [bootstrapData, bootstrapLoading, loadFeed])
  );

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBootstrap();
      await loadFeed(true);
      await loadStories();
    } catch (error) {
      await loadFeed(false);
    }
  };

  // Handle like
  const handleLike = async (postId) => {
    try {
      // Optimistic update - update UI immediately
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const newIsLiked = !post.isLiked;
            return {
              ...post,
              isLiked: newIsLiked,
              likes: newIsLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
            };
          }
          return post;
        })
      );

      // Then make the API call
      const result = await likePost(postId);
      
      // Update with actual server response
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            // Handle different response structures
            const isLiked = result?.data?.liked ?? result?.liked ?? result?.isLiked ?? !post.isLiked;
            const likesCount = result?.data?.likesCount ?? result?.likesCount ?? result?.data?.likes ?? result?.likes;
            
            return {
              ...post,
              isLiked: isLiked,
              likes: likesCount !== undefined ? likesCount : (isLiked ? post.likes + 1 : Math.max(0, post.likes - 1)),
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update on error
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        })
      );
      Alert.alert('Error', 'Failed to like post');
    }
  };

  // Handle add comment
  const handleAddComment = async (postId) => {
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    // Clear input immediately for better UX
    const originalInput = commentInputs[postId];
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    try {
      const result = await addComment(postId, commentText);
      
      // Fetch updated post to get all comments
      const updatedPost = await getPost(postId);
      
      // Extract comments from various possible response structures
      let updatedComments = [];
      if (Array.isArray(updatedPost.comments)) {
        updatedComments = updatedPost.comments;
      } else if (Array.isArray(updatedPost.commentsList)) {
        updatedComments = updatedPost.commentsList;
      } else if (result?.comment) {
        // If addComment returns the comment directly
        updatedComments = [result.comment];
      } else if (result?.comments && Array.isArray(result.comments)) {
        updatedComments = result.comments;
      }
      
      // Get current post to preserve other data
      setPosts((prevPosts) => {
        const currentPost = prevPosts.find(p => p.id === postId);
        if (!currentPost) return prevPosts;
        
        // Merge existing comments with new ones, avoiding duplicates
        const existingComments = Array.isArray(currentPost.commentsList) ? currentPost.commentsList : [];
        const mergedComments = [...existingComments];
        
        // Add new comments that don't already exist
        updatedComments.forEach(newComment => {
          const exists = mergedComments.some(c => 
            c.id === newComment.id || 
            (c.content === newComment.content && 
             Math.abs(new Date(c.createdAt || c.created_at || 0) - new Date(newComment.createdAt || newComment.created_at || 0)) < 1000)
          );
          if (!exists) {
            mergedComments.push(newComment);
          }
        });
        
        // Sort by creation date
        mergedComments.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateA - dateB;
        });
        
        return prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: updatedPost.commentsCount || mergedComments.length || (post.comments || 0) + 1,
                commentsList: mergedComments,
              }
            : post
        );
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      // Restore input on error
      setCommentInputs((prev) => ({ ...prev, [postId]: originalInput }));
      Alert.alert('Error', getReadableError(error) || 'Failed to add comment');
    }
  };

  // Toggle comments
  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Handle profile press
  const handleProfilePress = (userId) => {
    navigation.navigate('UserProfileScreen', { userId });
  };

  const PostCard = ({ post }) => {
    const isCaptionExpanded = expandedCaptions[post.id];
    const shouldTruncate = post.caption && post.caption.length > 90;
    const displayCaption = isCaptionExpanded || !shouldTruncate 
      ? post.caption 
      : post.caption.substring(0, 90) + '...';

    return (
      <View style={styles.postCard}>
        {/* Post Media with Overlay Header */}
        <View style={styles.postMediaContainer}>
          <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
          
          {/* Overlay Header on Top of Image */}
          <View style={styles.overlayHeader}>
            <TouchableOpacity onPress={() => handleProfilePress(post.userId)} style={styles.userPill}>
              {post.profilePhoto ? (
                <Image source={{ uri: post.profilePhoto }} style={styles.postProfilePhoto} />
              ) : (
                <View style={styles.postProfilePlaceholder}><Ionicons name="person" size={16} color="#6b7280" /></View>
              )}
              <Text style={styles.postUsername}>{post.username}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.morePill}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          
          {post.postType === 'video' && (
            <View style={styles.videoIndicator}>
              <Ionicons name="play" size={32} color="#ffffff" />
            </View>
          )}
          
          {/* Overlay Footer with Likes */}
          <View style={styles.overlayFooter}>
            <TouchableOpacity onPress={() => handleLike(post.id)} style={styles.likesPill}>
              <Ionicons 
                name={post.isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={post.isLiked ? "#ef4444" : "#111827"} 
              />
              <Text style={styles.overlayLikesText}>{post.likes.toLocaleString()} Likes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity onPress={() => toggleComments(post.id)} style={styles.actionIcon}>
              <Feather name="message-circle" size={24} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Feather name="send" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Feather name="bookmark" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Post Info */}
        <View style={styles.postInfoContainer}>
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
              <Text style={styles.captionUsername}>{post.username} </Text>
              {displayCaption}
              {shouldTruncate && !isCaptionExpanded && (
                <Text style={styles.moreLink} onPress={() => setExpandedCaptions(p => ({...p, [post.id]: true}))}> more</Text>
              )}
            </Text>
          </View>

          {/* Comments Section */}
          {post.comments > 0 && (
            <View style={styles.commentsSection}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsCountText}>{post.comments || 0} Comments</Text>
                {post.commentsList && post.commentsList.length > 1 && (
                  <TouchableOpacity onPress={() => toggleComments(post.id)}>
                    <Text style={styles.seeAllLink}>
                      {showComments[post.id] ? 'Show Less' : 'See All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* First Comment Preview - Only show when NOT expanded */}
              {post.commentsList && post.commentsList.length > 0 && !showComments[post.id] && (
                <View style={styles.commentPreview}>
                  {(() => {
                    const firstComment = post.commentsList[0];
                    let commentUsername = 'User';
                    if (firstComment.user?.username) {
                      commentUsername = firstComment.user.username;
                    } else if (firstComment.user?.profile?.fullName) {
                      commentUsername = firstComment.user.profile.fullName;
                    } else if (firstComment.username) {
                      commentUsername = firstComment.username;
                    } else if (firstComment.user?.email) {
                      commentUsername = firstComment.user.email.split('@')[0];
                    }
                    
                    const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
                    let commentAvatar = firstComment.user?.profile?.avatarUrl || firstComment.user?.avatarUrl || firstComment.avatarUrl || null;
                    if (commentAvatar && !commentAvatar.startsWith('http')) {
                      commentAvatar = commentAvatar.startsWith('/') ? `${baseURL}${commentAvatar}` : `${baseURL}/${commentAvatar}`;
                    }
                    
                    return (
                      <View style={styles.commentItem}>
                        {commentAvatar ? (
                          <Image source={{ uri: commentAvatar }} style={styles.commentAvatar} />
                        ) : (
                          <View style={styles.commentAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color="#9ca3af" />
                          </View>
                        )}
                        <View style={styles.commentContent}>
                          <Text style={styles.commentText}>
                            <Text style={styles.commentUsername}>{commentUsername}. </Text>
                            {firstComment.content}
                          </Text>
                          <Text style={styles.commentTime}>{formatTimestamp(firstComment.createdAt || firstComment.created_at || firstComment.timestamp)}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
              
              {/* Expanded Comments - Only show when expanded */}
              {showComments[post.id] && (
                <View style={styles.expandedCommentsList}>
                  {Array.isArray(post.commentsList) && post.commentsList.length > 0 ? post.commentsList.map((comment, idx) => {
                    let commentUsername = 'User';
                    if (comment.user?.username) {
                      commentUsername = comment.user.username;
                    } else if (comment.user?.profile?.fullName) {
                      commentUsername = comment.user.profile.fullName;
                    } else if (comment.username) {
                      commentUsername = comment.username;
                    } else if (comment.user?.email) {
                      commentUsername = comment.user.email.split('@')[0];
                    }
                    
                    const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
                    let commentAvatar = comment.user?.profile?.avatarUrl || comment.user?.avatarUrl || comment.avatarUrl || null;
                    if (commentAvatar && !commentAvatar.startsWith('http')) {
                      commentAvatar = commentAvatar.startsWith('/') ? `${baseURL}${commentAvatar}` : `${baseURL}/${commentAvatar}`;
                    }
                    
                    return (
                      <View key={comment.id || idx} style={styles.commentItem}>
                        {commentAvatar ? (
                          <Image source={{ uri: commentAvatar }} style={styles.commentAvatar} />
                        ) : (
                          <View style={styles.commentAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color="#9ca3af" />
                          </View>
                        )}
                        <View style={styles.commentContent}>
                          <Text style={styles.commentText}>
                            <Text style={styles.commentUsername}>{commentUsername}. </Text>
                            {comment.content}
                          </Text>
                          <Text style={styles.commentTime}>{formatTimestamp(comment.createdAt || comment.created_at || comment.timestamp)}</Text>
                        </View>
                      </View>
                    );
                  }                  ) : (
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Always-visible comment input - below comments section or caption if no comments */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentInputs[post.id] || ''}
              onChangeText={(text) => setCommentInputs(prev => ({ ...prev, [post.id]: text }))}
              onSubmitEditing={() => handleAddComment(post.id)}
              multiline={false}
            />
            {commentInputs[post.id]?.trim() && (
              <TouchableOpacity 
                onPress={() => handleAddComment(post.id)} 
                style={styles.commentPostButton}
                activeOpacity={0.7}
              >
                <Text style={styles.commentPostText}>Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Calculate header padding - iOS needs less padding
  // On iOS, use a smaller fixed value since SafeAreaView already provides some spacing
  const headerPaddingTop = Platform.OS === 'ios' 
    ? 8 // iOS: small fixed padding (SafeAreaView already handles safe area)
    : Math.max(insets.top, StatusBar.currentHeight || 0); // Android: use insets or StatusBar height

  return (
    <ScreenContainer noPadding={true}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={styles.headerTitle}>Fitsera</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('NotificationsScreen')} style={styles.headerIconButton}>
            <Feather name="heart" size={24} color="#111827" />
            {unreadNotificationCount > 0 && <View style={styles.dotBadge} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MessagesScreen')} style={styles.headerIconButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#111827" />
            {unreadMessageCount > 0 && <View style={styles.dotBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesWrapper} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {stories.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyCircleContainer}>
              <View style={[styles.storyRing, story.isOwn ? styles.ownStoryRing : styles.activeStoryRing]}>
                <Image source={{ uri: story.profilePhoto || 'https://via.placeholder.com/150' }} style={styles.storyImage} />
                {story.isOwn && (
                  <View style={styles.plusIcon}>
                    <Ionicons name="add" size={14} color="white" />
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{story.isOwn ? 'Your Story' : story.username}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator style={{ marginTop: 20 }} color="#000" /> : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 18,
    position: 'relative',
  },
  dotBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  // Stories
  storiesWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  storyCircleContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2.5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStoryRing: {
    borderColor: '#c026d3', // Gradient look
  },
  ownStoryRing: {
    borderColor: '#dbdbdb',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyName: {
    fontSize: 11,
    marginTop: 4,
    color: '#262626',
  },
  // Post Card
  postCard: {
    backgroundColor: '#fff',
    marginBottom: 10,
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
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent', // Transparent background
    zIndex: 10,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Blur effect with semi-transparent white
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  morePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Blur effect with semi-transparent white
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlayFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  likesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Blur effect with semi-transparent white
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  overlayLikesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827', // Dark text for blurred white background
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 16,
  },
  postProfilePhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  postProfilePlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827', // Dark text for blurred white background
  },
  postInfoContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  likesCountText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#262626',
  },
  captionUsername: {
    fontWeight: '700',
  },
  moreLink: {
    color: '#8e8e8e',
  },
  commentsSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentsCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllLink: {
    fontSize: 14,
    color: '#111827',
    textDecorationLine: 'underline',
  },
  commentPreview: {
    marginTop: 4,
  },
  expandedCommentsList: {
    marginTop: 4,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
  miniCommentInput: {
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#efefef',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputStyle: {
    fontSize: 13,
    color: '#262626',
    flex: 1,
  },
  commentPostButton: {
    paddingLeft: 8,
  },
  commentPostText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#efefef',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 20,
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    zIndex: 1,
  },
  captionContainer: {
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    backgroundColor: '#ffffff',
  },
});

export default HomeFeedScreen;