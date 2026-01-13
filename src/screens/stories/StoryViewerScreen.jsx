import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { markStoryAsViewed, deleteStory } from '../../api/services/storyService';
import { useAuth } from '../../context/AuthContext';
import { ENV } from '../../config/env';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

const StoryViewerScreen = ({ route, navigation }) => {
  const { stories, user, initialIndex = 0 } = route.params;
  const { user: currentUser } = useAuth();
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const currentStory = stories[currentStoryIndex];
  const isCurrentUser = user.id === currentUser?.id;
  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');

  useEffect(() => {
    if (currentStory && !currentStory.isViewed && !isCurrentUser) {
      markStoryAsViewed(currentStory.id).catch(console.error);
    }
    if (currentStory) {
      setEditCaption(currentStory.caption || '');
    }
  }, [currentStoryIndex]);

  useEffect(() => {
    if (!isPaused && !showEditModal) {
      startProgress();
    } else {
      // Pause progress
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      progressAnim.stopAnimation();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStoryIndex, isPaused, showEditModal]);

  const startProgress = () => {
    setProgress(0);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    // Update progress bar manually
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (STORY_DURATION / 100);
        if (newProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    timerRef.current = interval;
  };

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleTap = (event) => {
    if (showEditModal) return;
    
    const { locationX } = event.nativeEvent;
    const screenWidth = Dimensions.get('window').width;
    
    if (locationX < screenWidth / 2) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  const handleLongPress = () => {
    if (isCurrentUser) {
      setIsPaused(true);
    }
  };

  const handlePressOut = () => {
    if (isCurrentUser) {
      setIsPaused(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setIsPaused(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory(currentStory.id);
              Alert.alert('Success', 'Story deleted', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete story');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = () => {
    // Note: Backend doesn't have update endpoint yet, so we'll just update caption locally
    // In a full implementation, you'd call an updateStory API
    setShowEditModal(false);
    setIsPaused(false);
    Alert.alert('Info', 'Story editing will be available in the next update');
  };

  if (!currentStory) {
    return null;
  }

  // Ensure media URL is absolute
  let mediaUrl = currentStory.mediaUrl;
  if (mediaUrl && !mediaUrl.startsWith('http')) {
    mediaUrl = mediaUrl.startsWith('/') ? `${baseURL}${mediaUrl}` : `${baseURL}/${mediaUrl}`;
  }

  // Ensure avatar URL is absolute
  let avatarUrl = user.profile?.avatarUrl || user.profilePhoto;
  if (avatarUrl && !avatarUrl.startsWith('http')) {
    avatarUrl = avatarUrl.startsWith('/') ? `${baseURL}${avatarUrl}` : `${baseURL}/${avatarUrl}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground} />
            {index === currentStoryIndex ? (
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            ) : index < currentStoryIndex ? (
              <View style={[styles.progressBarFill, { width: '100%' }]} />
            ) : null}
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{user.username || 'User'}</Text>
            <Text style={styles.time}>
              {new Date(currentStory.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Story Content */}
      <TouchableOpacity
        style={styles.content}
        activeOpacity={1}
        onPress={handleTap}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
      >
        {currentStory.mediaType === 'image' ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={48} color="#fff" />
            <Text style={styles.videoText}>Video stories coming soon</Text>
          </View>
        )}

        {/* Caption */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        )}

        {/* View Count (for own stories) */}
        {isCurrentUser && currentStory.viewsCount > 0 && (
          <View style={styles.viewCountContainer}>
            <Text style={styles.viewCount}>
              👁️ {currentStory.viewsCount} {currentStory.viewsCount === 1 ? 'view' : 'views'}
            </Text>
          </View>
        )}

        {/* Edit/Delete buttons for own stories */}
        {isCurrentUser && (
          <View style={styles.ownStoryActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Ionicons name="create-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setIsPaused(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Story</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setIsPaused(false);
                }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Edit caption..."
              placeholderTextColor="#999"
              value={editCaption}
              onChangeText={setEditCaption}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowEditModal(false);
                  setIsPaused(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingTop: 10,
    gap: 3,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  defaultAvatar: {
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  time: {
    color: '#ccc',
    fontSize: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height * 0.7,
  },
  videoPlaceholder: {
    width: width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  caption: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  viewCountContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewCount: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  ownStoryActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalButtonPrimary: {
    backgroundColor: '#E1306C',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});

export default StoryViewerScreen;

