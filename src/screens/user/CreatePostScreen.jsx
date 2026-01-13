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
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import FilterSelector from '../../components/filters/FilterSelector';
import { applyFilter, getFilterStyle, getFilterOverlay, getFilterBlendMode } from '../../utils/imageFilters';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { createPost } from '../../api/services/postService';
import { uploadPostMedia } from '../../api/services/uploadService';
import { getReadableError } from '../../utils/apiError';

const CreatePostScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [filteredImageUri, setFilteredImageUri] = useState(null);
  
  const isFromTab = !route?.params;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select photos or videos.'
        );
        return;
      }

      // Use MediaType if available, otherwise fallback to MediaTypeOptions
      const getMediaTypes = () => {
        if (ImagePicker.MediaType) {
          return [ImagePicker.MediaType.Images, ImagePicker.MediaType.Videos];
        }
        if (ImagePicker.MediaTypeOptions) {
          return ImagePicker.MediaTypeOptions.All;
        }
        return 'all'; // Fallback to string value
      };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getMediaTypes(),
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMedia(asset.uri);
        setFilteredImageUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
        setSelectedFilter('none');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please check your permissions.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your camera to take photos or videos.'
        );
        return;
      }

      // Use MediaType if available, otherwise fallback to MediaTypeOptions
      const getMediaTypes = () => {
        if (ImagePicker.MediaType) {
          return [ImagePicker.MediaType.Images, ImagePicker.MediaType.Videos];
        }
        if (ImagePicker.MediaTypeOptions) {
          return ImagePicker.MediaTypeOptions.All;
        }
        return 'all'; // Fallback to string value
      };

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: getMediaTypes(),
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMedia(asset.uri);
        setFilteredImageUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
        setSelectedFilter('none');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please check your permissions.');
    }
  };

  const handleFilterSelect = async (filterId) => {
    if (mediaType === 'video') {
      Alert.alert('Info', 'Filters are only available for images');
      return;
    }

    setSelectedFilter(filterId);
    // Filters are applied via overlay, so no need for async processing
    // Just update the filter selection
    if (filterId === 'none') {
      setFilteredImageUri(media);
    } else {
      // Keep original image, overlay will handle the filter effect
      setFilteredImageUri(media);
    }
  };

  const handlePost = async () => {
    if (!media || !caption.trim()) {
      Alert.alert('Error', 'Please add a caption and media to your post.');
      return;
    }

    try {
      setUploading(true);

      // Use filtered image if filter is applied, otherwise use original
      const mediaToUpload = filteredImageUri && selectedFilter !== 'none' 
        ? filteredImageUri 
        : media;

      // Upload media first
      const uploadResult = await uploadPostMedia(mediaToUpload, mediaType);
      const mediaUrl = uploadResult.url;

      // Create post
      await createPost({
        caption,
        mediaUrl,
        mediaType,
      });

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setMedia(null);
            setFilteredImageUri(null);
            setMediaType(null);
            setCaption('');
            setSelectedFilter('none');
            if (isFromTab) {
              navigation.navigate('Home');
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', getReadableError(error) || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const hashtags = caption.match(/#[\w]+/g) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isFromTab && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={styles.headerRight}>
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
              <Text style={styles.postButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info Row */}
          <View style={styles.userRow}>
            {user?.profile?.avatarUrl ? (
              <Image source={{ uri: user.profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={16} color="#94a3b8" />
              </View>
            )}
            <View>
              <Text style={styles.username}>{user?.username || 'You'}</Text>
              <Text style={styles.locationText}>Global Feed</Text>
            </View>
          </View>

          {/* Caption Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="What's on your mind?..."
              placeholderTextColor="#94a3b8"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />
            
            {hashtags.length > 0 && (
              <View style={styles.tagCloud}>
                {hashtags.map((tag, i) => (
                  <View key={i} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Media Section */}
          <View style={styles.mediaWrapper}>
            {media ? (
              <>
                <View style={styles.previewContainer}>
                  {mediaType === 'video' ? (
                    <View style={styles.videoPlaceholder}>
                      <MaterialCommunityIcons name="video" size={48} color="#fff" />
                      <Text style={styles.videoPlaceholderText}>Video Attached</Text>
                    </View>
                  ) : (
                    <View style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: filteredImageUri || media }} 
                        style={[
                          styles.imagePreview,
                          getFilterStyle(selectedFilter),
                        ]} 
                      />
                      {/* Filter Overlay */}
                      {selectedFilter !== 'none' && (
                        <View 
                          style={[
                            styles.filterOverlay,
                            { backgroundColor: getFilterOverlay(selectedFilter) }
                          ]} 
                        />
                      )}
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeMediaBtn} 
                    onPress={() => {
                      setMedia(null);
                      setFilteredImageUri(null);
                      setSelectedFilter('none');
                    }}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                {/* Filter Selector for Images */}
                {mediaType === 'image' && media && (
                  <View style={styles.filterSection}>
                    <FilterSelector
                      imageUri={media}
                      selectedFilter={selectedFilter}
                      onFilterSelect={handleFilterSelect}
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyMediaActions}>
                <TouchableOpacity style={styles.actionSquare} onPress={pickImage}>
                  <Ionicons name="images" size={32} color="#6366f1" />
                  <Text style={styles.actionLabel}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionSquare, styles.actionSquareAlt]} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color="#06b6d4" />
                  <Text style={styles.actionLabel}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Quick Bar */}
        <View style={styles.footerBar}>
          <TouchableOpacity 
            style={styles.footerAction} 
            onPress={() => setCaption(prev => prev + ' #')}
          >
            <Ionicons name="hash" size={20} color="#64748b" />
            <Text style={styles.footerActionText}>Hashtag</Text>
          </TouchableOpacity>
          <Text style={[styles.charCount, caption.length > 450 && { color: '#ef4444' }]}>
            {caption.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { width: 60 },
  headerRight: { width: 80, alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  closeBtn: { padding: 4 },
  postButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: { backgroundColor: '#e2e8f0' },
  postButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  content: { flex: 1 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  username: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginLeft: 12 },
  locationText: { fontSize: 12, color: '#94a3b8', marginLeft: 12 },

  inputContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  captionInput: {
    fontSize: 18,
    color: '#1e293b',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  tagChip: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },

  mediaWrapper: { padding: 16 },
  filterSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  previewContainer: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  imageWrapper: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 300, borderRadius: 16, backgroundColor: '#f8fafc' },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  filterLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  videoPlaceholder: { width: '100%', height: 200, backgroundColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  videoPlaceholderText: { color: '#fff', marginTop: 8, fontWeight: '600' },
  removeMediaBtn: { 
    position: 'absolute', top: 12, right: 12, 
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 18 
  },

  emptyMediaActions: { flexDirection: 'row', gap: 16 },
  actionSquare: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSquareAlt: { backgroundColor: '#ecfeff', borderColor: '#cffafe' },
  actionLabel: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#475569' },

  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerActionText: { color: '#64748b', fontWeight: '600' },
  charCount: { fontSize: 12, color: '#94a3b8' },
});

export default CreatePostScreen;