import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { upsertProfile } from '../../api/services/profileService';
import { getUserById } from '../../api/services/userProfileService';
import { getUserPosts } from '../../api/services/postService';
import { getFollowStats, toggleFollow, checkFollowStatus } from '../../api/services/followService';
import { pickProfilePhoto, requestPermissions } from '../../services/profilePhotoService';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfilePhoto, uploadCoverPhoto } from '../../api/services/uploadService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UserProfileScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { socketService } = useSocket();
  const userId = route?.params?.userId || user?.id;
  const isOwnProfile = !route?.params?.userId || route?.params?.userId === user?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [profession, setProfession] = useState('');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const bannerImageRef = useRef(null); // Ref to preserve banner image across reloads

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Listen for real-time like updates via socket.io
  useEffect(() => {
    if (!socketService) return;

    const unsubscribe = socketService.on('post-like-updated', (likeData) => {
      // Update post with real-time like data
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === likeData.postId) {
            return {
              ...post,
              likes: likeData.likeCount || post.likes,
            };
          }
          return post;
        })
      );
    });

    return () => {
      unsubscribe();
    };
  }, [socketService]);

  // Refresh profile when screen comes into focus (e.g., after posting)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      if (isOwnProfile) {
        // Load own profile - use getUserById to handle cases where profile doesn't exist yet
        try {
          const userData = await getUserById(userId);
          
          if (userData) {
            // User data includes profile if it exists, otherwise profile is null
            const profileData = userData.profile || {};
            
            // Merge user data with profile data for easier access
            const mergedProfile = { ...userData, ...profileData };
            setProfile(mergedProfile);
            setBio(profileData.bio || '');
            setProfession(profileData.profession || '');
            setProfilePhoto(profileData.avatarUrl || null);
            
            // Get bannerUrl from profile data, or from top-level userData (in case it was just updated)
            // Also preserve existing bannerImage state if profile doesn't have it yet (database migration pending)
            // This ensures the image stays visible even if the database doesn't have the field yet
            const bannerUrl = profileData.bannerUrl || 
                             profileData.bannerImage || 
                             userData.bannerUrl || 
                             null; // Don't preserve from state here - we want fresh data from backend
            
            // Only update bannerImage if we got a value from backend, otherwise keep existing state
            // This prevents clearing the image if backend doesn't have the field yet (migration pending)
            if (bannerUrl) {
              setBannerImage(bannerUrl);
              bannerImageRef.current = bannerUrl; // Update ref
            } else if (bannerImageRef.current && !bannerUrl) {
              // Keep existing bannerImage from ref if backend doesn't return one (migration not run yet)
              console.log('[UserProfile] Backend returned null bannerUrl, preserving from ref:', bannerImageRef.current);
              setBannerImage(bannerImageRef.current);
            } else {
              // Only clear if we don't have a preserved value
              setBannerImage(null);
              bannerImageRef.current = null;
            }
            
            if (__DEV__) {
              console.log('[UserProfile] Loaded profile data:', {
                profileDataBannerUrl: profileData.bannerUrl,
                profileDataBannerImage: profileData.bannerImage,
                userDataBannerUrl: userData.bannerUrl,
                existingBannerImage: bannerImage,
                finalBannerUrl: bannerUrl || bannerImage,
              });
            }
          } else {
            // Fallback to user data from auth context
            setProfile(user || {});
            setBio('');
            setProfession('');
            setProfilePhoto(null);
            setBannerImage(null);
          }
        } catch (userError) {
          // If getUserById fails, use user data from auth context
          console.warn('Failed to fetch user by ID, using auth context user:', userError);
          setProfile(user || {});
          setBio('');
          setProfession('');
          setProfilePhoto(null);
        }
        
        // Load own posts
        const userPosts = await getUserPosts(userId, 50, 0);
        const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
        const transformedPosts = userPosts.map((post) => {
          let mediaUrl = post.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
          }
          return {
            id: post.id,
            type: post.mediaType,
            url: mediaUrl,
            views: post.viewsCount || post.views || 0,
            likes: post.likesCount || post.likes?.length || 0,
            comments: post.commentsCount || post.comments?.length || 0,
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
        
        // Load follow stats
        const stats = await getFollowStats(userId);
        setFollowers(stats.followers || 0);
        setFollowing(stats.following || 0);
      } else {
        // Load other user's profile - getUserById includes profile if it exists
        const userData = await getUserById(userId);
        
        if (userData) {
          // User data includes profile if it exists, otherwise profile is null
          const profileData = userData.profile || {};
          setProfile({ ...userData, ...profileData });
          setBio(profileData.bio || '');
          setProfession(profileData.profession || '');
          setProfilePhoto(profileData.avatarUrl || null);
        }
        
        // Load user's posts
        const userPosts = await getUserPosts(userId, 50, 0);
        const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
        const transformedPosts = userPosts.map((post) => {
          let mediaUrl = post.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
          }
          return {
            id: post.id,
            type: post.mediaType,
            url: mediaUrl,
            views: post.viewsCount || post.views || 0,
            likes: post.likesCount || post.likes?.length || 0,
            comments: post.commentsCount || post.comments?.length || 0,
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
        
        // Load follow stats and status
        const [stats, followStatus] = await Promise.all([
          getFollowStats(userId),
          checkFollowStatus(userId),
        ]);
        
        setFollowers(stats.followers || 0);
        setFollowing(stats.following || 0);
        // Handle different response formats
        const followingStatus = followStatus?.data?.isFollowing ?? followStatus?.isFollowing ?? false;
        setIsFollowing(followingStatus);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const updateData = {
        bio,
        profession,
      };
      
      // Include banner image if it was updated
      if (bannerImage) {
        updateData.bannerUrl = bannerImage;
      }
      
      await upsertProfile(updateData);
      setProfile({ ...profile, bio, profession, bannerUrl: bannerImage || profile?.bannerUrl });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
      // Reload profile to get updated data
      loadProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setBio(profile?.bio || '');
    setProfession(profile?.profession || '');
    setBannerImage(profile?.bannerUrl || profile?.bannerImage || null);
  };

  const handleFollow = async () => {
    try {
      const result = await toggleFollow(userId);
      const newFollowingStatus = result.data?.following ?? !isFollowing;
      setIsFollowing(newFollowingStatus);
      setFollowers(newFollowingStatus ? followers + 1 : Math.max(0, followers - 1));
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', getReadableError(error));
    }
  };

  const handleUploadPhoto = async () => {
    const photo = await pickProfilePhoto();
    if (photo) {
      setProfilePhoto(photo);
      // Photo is automatically uploaded to backend by pickProfilePhoto
    }
  };

  const handleUploadBanner = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Use MediaType if available, otherwise fallback to MediaTypeOptions
      const getMediaType = () => {
        if (ImagePicker.MediaType) {
          return ImagePicker.MediaType.Images;
        }
        if (ImagePicker.MediaTypeOptions) {
          return ImagePicker.MediaTypeOptions.Images;
        }
        return 'images'; // Fallback to string value
      };
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getMediaType(),
        allowsEditing: true,
        aspect: [16, 9], // Banner aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        try {
          // Upload cover/banner image using the cover photo upload service
          const uploadResult = await uploadCoverPhoto(photoUri);
          const uploadedUrl = uploadResult.url;
          
          console.log('[UserProfile] Cover photo uploaded, URL:', uploadedUrl);
          console.log('[UserProfile] Upload result:', JSON.stringify(uploadResult, null, 2));
          
          // Update profile with bannerUrl
          const updateResult = await upsertProfile({ bannerUrl: uploadedUrl });
          console.log('[UserProfile] Profile update result:', JSON.stringify(updateResult, null, 2));
          console.log('[UserProfile] Profile updated with bannerUrl:', uploadedUrl);
          
          // Update local state immediately and preserve in ref
          setBannerImage(uploadedUrl);
          bannerImageRef.current = uploadedUrl; // Preserve in ref for reload
          setProfile((prevProfile) => {
            const updated = {
              ...prevProfile,
              bannerUrl: uploadedUrl,
            };
            console.log('[UserProfile] Updated local profile state:', updated);
            return updated;
          });
          
          // Don't reload profile immediately - the state is already updated
          // The image should display immediately with the updated state
          console.log('[UserProfile] Cover photo uploaded and state updated. Image should display now.');
          
          Alert.alert('Success', 'Cover photo uploaded successfully');
        } catch (error) {
          console.error('Error uploading cover photo:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          Alert.alert('Upload Failed', `Failed to upload cover photo: ${error.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error picking banner image:', error);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Get banner image URL
  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
  let bannerImageUrl = bannerImage || profile?.bannerUrl || profile?.bannerImage || null;
  
  // Log for debugging
  if (__DEV__) {
    console.log('[UserProfile] Banner image state:', {
      bannerImage,
      profileBannerUrl: profile?.bannerUrl,
      profileBannerImage: profile?.bannerImage,
      finalUrl: bannerImageUrl,
    });
  }
  
  // Ensure URL is absolute
  if (bannerImageUrl && !bannerImageUrl.startsWith('http')) {
    if (bannerImageUrl.startsWith('/')) {
      bannerImageUrl = `${baseURL}${bannerImageUrl}`;
    } else {
      bannerImageUrl = `${baseURL}/${bannerImageUrl}`;
    }
  }
  
  if (__DEV__ && bannerImageUrl) {
    console.log('[UserProfile] Final banner image URL:', bannerImageUrl);
  }

  // Format username with @
  const displayUsername = profile?.username 
    ? `@${profile.username}` 
    : profile?.email 
      ? `@${profile.email.split('@')[0]}` 
      : '';

  // Format followers count
  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <ScreenContainer noPadding={true}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          {bannerImageUrl ? (
            <Image 
              source={{ uri: bannerImageUrl }} 
              style={styles.bannerImage} 
              resizeMode="cover"
              onError={(error) => {
                console.error('[UserProfile] ❌ Error loading banner image');
                console.error('[UserProfile] Error:', error.nativeEvent?.error || error);
                console.error('[UserProfile] Failed URL:', bannerImageUrl);
              }}
              onLoad={() => {
                console.log('[UserProfile] ✅ Banner image loaded successfully');
              }}
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="image-outline" size={48} color="#9ca3af" />
            </View>
          )}
          
          {/* Banner Edit Button */}
          {isOwnProfile && isEditing && (
            <TouchableOpacity
              style={styles.bannerEditButton}
              onPress={handleUploadBanner}
            >
              <Ionicons name="camera" size={20} color="#ffffff" />
              <Text style={styles.bannerEditButtonText}>Change Cover</Text>
            </TouchableOpacity>
          )}
          
          {/* Profile Picture Overlay */}
          <View style={styles.profilePictureOverlay}>
            <TouchableOpacity
              style={styles.profilePhotoContainer}
              onPress={isOwnProfile && isEditing ? handleUploadPhoto : undefined}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Ionicons name="person" size={50} color="#6b7280" />
                </View>
              )}
              {isOwnProfile && isEditing && (
                <View style={styles.editPhotoBadge}>
                  <Ionicons name="camera" size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Name and Handle */}
        <View style={styles.userNameSection}>
          <Text style={styles.userName}>{profile?.fullName || profile?.username || 'User'}</Text>
          {displayUsername ? <Text style={styles.userHandle}>{displayUsername}</Text> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{formatCount(followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{formatCount(following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={isEditing ? handleSave : handleEdit}
              >
                <Text style={styles.editProfileButtonText}>
                  {isEditing ? 'Save' : 'Edit Profile'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addPostButton}
                onPress={() => {
                  navigation.navigate('CreatePostScreen');
                }}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              {isFollowing && (
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => {
                    navigation.navigate('ChatScreen', {
                      userId: userId,
                      partner: profile,
                    });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bio Section */}
        {!isEditing && (bio || profession) && (
          <View style={styles.bioSection}>
            {bio ? <Text style={styles.bio}>{bio}</Text> : null}
            {profession ? <Text style={styles.profession}>{profession}</Text> : null}
          </View>
        )}

        {/* Edit Mode Inputs */}
        {isEditing && (
          <View style={styles.editSection}>
            <TextInput
              style={styles.bioInput}
              placeholder="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.professionInput}
              placeholder="Profession"
              value={profession}
              onChangeText={setProfession}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Saved Posts Section - Only for own profile */}
        {isOwnProfile && (
          <View style={styles.photosSection}>
            <View style={styles.photosSectionHeader}>
              <Text style={styles.photosSectionTitle}>Saved Posts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SavedPostsScreen')}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyPosts}>
              <Ionicons name="bookmark-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyPostsText}>No saved posts yet</Text>
              <Text style={styles.emptyPostsSubtext}>Posts you save will appear here</Text>
            </View>
          </View>
        )}

        {/* Photos Section */}
        <View style={styles.photosSection}>
          <View style={styles.photosSectionHeader}>
            <Text style={styles.photosSectionTitle}>Photos</Text>
            {posts.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="grid-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyPostsText}>No posts yet</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScrollContent}
            >
              {posts.map((post, index) => (
                <TouchableOpacity 
                  key={post.id || `post-${index}-${post.url}`} 
                  style={styles.photoThumbnail}
                  onPress={() => {
                    // Navigate to post detail or open in full screen
                    navigation.navigate('PostDetailScreen', { postId: post.id });
                  }}
                >
                  <Image source={{ uri: post.url }} style={styles.photoThumbnailImage} />
                  {post.type === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={16} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.photoStatsOverlay}>
                    <View style={styles.photoStatItem}>
                      <Ionicons name="heart" size={14} color="#ffffff" />
                      <Text style={styles.photoStatText}>
                        {post.likes ? formatCount(post.likes) : '0'}
                      </Text>
                    </View>
                    <View style={styles.photoStatItem}>
                      <Ionicons name="eye-outline" size={14} color="#ffffff" />
                      <Text style={styles.photoStatText}>
                        {post.views ? formatCount(post.views) : '0'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Logout Section - Only for own profile */}
        {isOwnProfile && (
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await logout();
                          // Navigation will be handled by AuthContext
                        } catch (error) {
                          Alert.alert('Error', 'Failed to logout');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Banner Section
  bannerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#1f2937',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureOverlay: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  // User Name Section
  userNameSection: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
    justifyContent: 'center',
  },
  editProfileButton: {
    flex: 1,
    backgroundColor: '#9333ea',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    maxWidth: 200,
  },
  editProfileButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#9333ea',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    maxWidth: 200,
  },
  followingButton: {
    backgroundColor: '#e5e7eb',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPostButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEditButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  bannerEditButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Bio Section
  bioSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  profession: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Edit Section
  editSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 12,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  professionInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#9333ea',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Photos Section
  photosSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  photosSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllLink: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  photosScrollContent: {
    gap: 12,
  },
  photoThumbnail: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoStatsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  photoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoStatText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    padding: 6,
  },
  emptyPosts: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyPostsText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyPostsSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Logout Section
  logoutSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default UserProfileScreen;

