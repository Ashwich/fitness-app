import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { upsertProfile } from '../../api/services/profileService';
import { getUserById } from '../../api/services/userProfileService';
import { getUserPosts } from '../../api/services/postService';
import { getFollowStats, toggleFollow, checkFollowStatus } from '../../api/services/followService';
import { pickProfilePhoto } from '../../services/profilePhotoService';
import { getReadableError } from '../../utils/apiError';

const UserProfileScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
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

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
            setProfile({ ...userData, ...profileData });
            setBio(profileData.bio || '');
            setProfession(profileData.profession || '');
            setProfilePhoto(profileData.avatarUrl || null);
          } else {
            // Fallback to user data from auth context
            setProfile(user || {});
            setBio('');
            setProfession('');
            setProfilePhoto(null);
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
        const transformedPosts = userPosts.map((post) => ({
          id: post.id,
          type: post.mediaType,
          url: post.mediaUrl,
        }));
        
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
        const transformedPosts = userPosts.map((post) => ({
          id: post.id,
          type: post.mediaType,
          url: post.mediaUrl,
        }));
        
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
      await upsertProfile({
        bio,
        profession,
      });
      setProfile({ ...profile, bio, profession });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setBio(profile?.bio || '');
    setProfession(profile?.profession || '');
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

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Profile' : profile?.fullName || profile?.username}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('CreatePostScreen')}
            style={styles.postIconButton}
          >
            <Ionicons name="add-circle-outline" size={28} color="#2563eb" />
          </TouchableOpacity>
        )}
        {!isOwnProfile && (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.profilePhotoContainer}
            onPress={isOwnProfile && isEditing ? handleUploadPhoto : undefined}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="person" size={40} color="#6b7280" />
              </View>
            )}
            {isOwnProfile && isEditing && (
              <View style={styles.editPhotoBadge}>
                <Ionicons name="camera" size={16} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{profile?.fullName || profile?.username || 'User'}</Text>
          {isEditing ? (
            <>
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
            </>
          ) : (
            <>
              {bio ? <Text style={styles.bio}>{bio}</Text> : null}
              {profession ? <Text style={styles.profession}>{profession}</Text> : null}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isEditing ? handleSave : handleEdit}
            >
              <Text style={styles.primaryButtonText}>
                {isEditing ? 'Save' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Text style={styles.primaryButtonText}>
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
                  <Ionicons name="mail-outline" size={20} color="#111827" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Posts Grid */}
        <View style={styles.postsSection}>
          <Text style={styles.postsSectionTitle}>Posts</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="grid-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyPostsText}>No posts yet</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post, index) => (
                <TouchableOpacity key={post.id || `post-${index}-${post.url}`} style={styles.postThumbnail}>
                  <Image source={{ uri: post.url }} style={styles.thumbnailImage} />
                  {post.type === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={16} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  postIconButton: {
    padding: 4,
  },
  placeholder: {
    width: 40,
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
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  profilePhotoContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profilePhotoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  userInfo: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  profession: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  professionInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#e5e7eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  postsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  postThumbnail: {
    width: '32%',
    aspectRatio: 1,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
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
  logoutSection: {
    padding: 16,
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

