import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import StoryCircle from './StoryCircle';
import { getStoriesFeed, getUserStories } from '../../api/services/storyService';
import { useAuth } from '../../context/AuthContext';
import { ENV } from '../../config/env';

const StoryBar = ({ navigation, currentUserId }) => {
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      
      // Load user's own stories
      let ownStories = [];
      if (user?.id) {
        try {
          const userStories = await getUserStories(user.id);
          if (userStories && userStories.length > 0) {
            // Transform story media URLs
            const transformedStories = userStories.map((story) => {
              let mediaUrl = story.mediaUrl;
              if (mediaUrl && !mediaUrl.startsWith('http')) {
                mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
              }
              return { ...story, mediaUrl };
            });
            
            // Transform user profile photo URL
            let profilePhoto = user.profile?.avatarUrl || null;
            if (profilePhoto && !profilePhoto.startsWith('http')) {
              profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
            }
            
            ownStories = [{
              user: {
                ...user,
                profile: {
                  ...user.profile,
                  avatarUrl: profilePhoto,
                },
                profilePhoto: profilePhoto,
              },
              stories: transformedStories,
            }];
          }
        } catch (error) {
          console.warn('Error loading own stories:', error);
        }
      }
      
      // Load stories from followed users
      const response = await getStoriesFeed();
      
      // Transform stories to include full URLs
      const transformedStories = response.map((userStories) => {
        // Transform user profile photo URL
        let profilePhoto = userStories.user?.profile?.avatarUrl || null;
        if (profilePhoto && !profilePhoto.startsWith('http')) {
          profilePhoto = profilePhoto.startsWith('/') ? `${baseURL}${profilePhoto}` : `${baseURL}/${profilePhoto}`;
        }
        
        // Transform story media URLs
        const stories = (userStories.stories || []).map((story) => {
          let mediaUrl = story.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
          }
          return { ...story, mediaUrl };
        });
        
        return {
          ...userStories,
          user: {
            ...userStories.user,
            profile: {
              ...userStories.user?.profile,
              avatarUrl: profilePhoto,
            },
            profilePhoto: profilePhoto,
          },
          stories,
        };
      });
      
      // Combine own stories with followed users' stories (own stories first)
      setStoriesFeed([...ownStories, ...transformedStories]);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryPress = (userStories) => {
    if (!userStories.stories || userStories.stories.length === 0) {
      return;
    }
    
    navigation.navigate('StoryViewer', {
      stories: userStories.stories,
      user: userStories.user,
      initialIndex: 0,
    });
  };

  const handleAddStory = () => {
    navigation.navigate('CreateStory');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#c026d3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Story Button */}
        {user && (
          <StoryCircle
            showAddButton={true}
            onAddPress={handleAddStory}
            user={user}
            size={68}
          />
        )}

        {/* User Stories */}
        {storiesFeed.map((userStories, index) => (
          <StoryCircle
            key={userStories.user?.id || index}
            story={userStories}
            user={userStories.user}
            onPress={() => handleStoryPress(userStories)}
            size={68}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});

export default StoryBar;

