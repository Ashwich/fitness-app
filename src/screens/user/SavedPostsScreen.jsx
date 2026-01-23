import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getSavedPosts } from '../../api/services/postService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const SavedPostsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedPosts = async () => {
    try {
      setLoading(true);
      const posts = await getSavedPosts(50, 0);
      
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      console.log('Raw saved posts data:', JSON.stringify(posts, null, 2));
      
      const transformedPosts = posts.map((savedPost) => {
        // Handle different response structures
        const post = savedPost.post || savedPost;
        let mediaUrl = post.mediaUrl || post.media_url;
        if (mediaUrl && !mediaUrl.startsWith('http')) {
          mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
        }
        
        return {
          id: post.id,
          type: post.mediaType || post.media_type,
          url: mediaUrl,
          likes: post.likesCount || post.likes_count || (Array.isArray(post.likes) ? post.likes.length : 0),
          comments: post.commentsCount || post.comments_count || (Array.isArray(post.comments) ? post.comments.length : 0),
          savedAt: savedPost.savedAt || savedPost.createdAt || savedPost.created_at,
        };
      }).filter(post => post.id && post.url); // Filter out invalid posts
      
      console.log('Transformed saved posts:', transformedPosts.length);
      
      setSavedPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading saved posts:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedPosts();
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Posts</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Posts</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {savedPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No saved posts yet</Text>
            <Text style={styles.emptySubtext}>Posts you save will appear here</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {savedPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postThumbnail}
                onPress={() => {
                  // Navigate to post detail
                  navigation.navigate('PostDetailScreen', { postId: post.id });
                }}
              >
                <Image source={{ uri: post.url }} style={styles.thumbnailImage} />
                {post.type === 'video' && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={16} color="#ffffff" />
                  </View>
                )}
                <View style={styles.statsOverlay}>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={12} color="#ffffff" />
                    <Text style={styles.statText}>{post.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble" size={12} color="#ffffff" />
                    <Text style={styles.statText}>{post.comments}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  postThumbnail: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default SavedPostsScreen;


