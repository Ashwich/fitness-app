import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { createPost } from '../../api/services/postService';
import { uploadPostMedia } from '../../api/services/uploadService';
import { getReadableError } from '../../utils/apiError';

const CreatePostScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Check if navigated from tab (no route params) or from another screen
  const isFromTab = !route?.params;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMedia(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMedia(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Select Media',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaType(null);
  };

  const extractHashtags = (text) => {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  };

  const handlePost = async () => {
    if (!media) {
      Alert.alert('No Media', 'Please select a photo or video to post');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Caption Required', 'Please write a caption for your post');
      return;
    }

    try {
      setUploading(true);

      // Upload media to backend first
      const uploadResult = await uploadPostMedia(media, mediaType);
      const mediaUrl = uploadResult.url;
      
      const postData = {
        mediaType: mediaType,
        mediaUrl: mediaUrl, // Use uploaded URL
        caption: caption.trim(),
      };

      await createPost(postData);
      
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setMedia(null);
            setMediaType(null);
            setCaption('');
            // Navigate to home feed
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          {!isFromTab && (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          )}
          {isFromTab && <View style={styles.headerSpacer} />}
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading || !media || !caption.trim()}
            style={[
              styles.postButton,
              (uploading || !media || !caption.trim()) && styles.postButtonDisabled,
            ]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Media Preview */}
          <View style={styles.mediaSection}>
            {media ? (
              <View style={styles.mediaContainer}>
                {mediaType === 'video' ? (
                  <View style={styles.videoContainer}>
                    <Ionicons name="play-circle" size={64} color="#ffffff" />
                    <Text style={styles.videoText}>Video Selected</Text>
                  </View>
                ) : (
                  <Image source={{ uri: media }} style={styles.mediaPreview} />
                )}
                <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                  <Ionicons name="close-circle" size={32} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={showMediaOptions}>
                <Ionicons name="camera-outline" size={48} color="#6b7280" />
                <Text style={styles.uploadText}>Tap to add photo or video</Text>
                <Text style={styles.uploadSubtext}>Camera or Photo Library</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Caption Input */}
          <View style={styles.captionSection}>
            <View style={styles.userInfo}>
              {user?.profile?.avatarUrl ? (
                <Image source={{ uri: user.profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#6b7280" />
                </View>
              )}
              <Text style={styles.username}>{user?.username || 'You'}</Text>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="#9ca3af"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.captionFooter}>
              <Text style={styles.charCount}>{caption.length}/500</Text>
              <TouchableOpacity
                style={styles.hashtagButton}
                onPress={() => {
                  const currentText = caption;
                  const newText = currentText + (currentText.endsWith(' ') ? '' : ' ') + '#';
                  setCaption(newText);
                }}
              >
                <Ionicons name="pricetag-outline" size={18} color="#2563eb" />
                <Text style={styles.hashtagButtonText}>Add Hashtag</Text>
              </TouchableOpacity>
            </View>

            {/* Hashtag Suggestions */}
            {caption.includes('#') && (
              <View style={styles.hashtagInfo}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.hashtagInfoText}>
                  Hashtags: {extractHashtags(caption).join(' ')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 28,
  },
  postButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  mediaSection: {
    padding: 16,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  uploadButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  uploadSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  captionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  captionInput: {
    minHeight: 120,
    fontSize: 16,
    color: '#111827',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  captionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  hashtagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  hashtagButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  hashtagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 8,
  },
  hashtagInfoText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
});

export default CreatePostScreen;

