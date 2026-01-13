import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import FilterSelector from '../../components/filters/FilterSelector';
import { applyFilter, getFilterStyle, getFilterOverlay, getFilterBlendMode } from '../../utils/imageFilters';
import { uploadStoryMedia } from '../../api/services/uploadService';
import { createStory } from '../../api/services/storyService';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

const CreateStoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [uploading, setUploading] = useState(false);
  const [textOverlays, setTextOverlays] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [filteredImageUri, setFilteredImageUri] = useState(null);
  const viewShotRef = useRef(null);

  useEffect(() => {
    // Request permissions
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'We need camera and photo library access to create stories.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const pickMedia = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [9, 16], // Story aspect ratio
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [9, 16],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedMedia(asset.uri);
        setFilteredImageUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
        setSelectedFilter('none');
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
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
      setFilteredImageUri(selectedMedia);
    } else {
      // Keep original image, overlay will handle the filter effect
      setFilteredImageUri(selectedMedia);
    }
  };

  const captureImageWithText = async () => {
    if (!viewShotRef.current) {
      return selectedMedia;
    }

    try {
      const uri = await viewShotRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Error capturing image:', error);
      return selectedMedia; // Fallback to original
    }
  };

  const handlePublish = async () => {
    if (!selectedMedia) {
      Alert.alert('Error', 'Please select a photo or video');
      return;
    }

    try {
      setUploading(true);

      let mediaToUpload = selectedMedia;

      // If image has text overlays, capture the image with text
      if (mediaType === 'image' && textOverlays.length > 0) {
        mediaToUpload = await captureImageWithText();
      }

      // Step 1: Upload media
      const uploadResult = await uploadStoryMedia(mediaToUpload, mediaType);
      const mediaUrl = uploadResult.url;

      // Step 2: Create story (no caption - text is on image)
      await createStory(mediaUrl, mediaType, '');

      Alert.alert('Success', 'Story published!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error publishing story:', error);
      Alert.alert('Error', getReadableError(error) || 'Failed to publish story');
    } finally {
      setUploading(false);
    }
  };

  const addTextOverlay = () => {
    if (currentText.trim()) {
      // Position text in center by default
      const centerX = 50; // Percentage
      const centerY = 50; // Percentage
      
      setTextOverlays([...textOverlays, {
        id: Date.now(),
        text: currentText,
        x: centerX,
        y: centerY,
      }]);
      setCurrentText('');
      setShowTextInput(false);
    }
  };

  const removeTextOverlay = (id) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
  };

  // Calculate safe header padding for Android
  const headerPaddingTop = Platform.OS === 'android' 
    ? Math.max(insets.top, StatusBar.currentHeight || 0) 
    : insets.top;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.header, { paddingTop: headerPaddingTop + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Story</Text>
          <TouchableOpacity 
            onPress={handlePublish} 
            disabled={uploading || !selectedMedia}
            style={styles.headerButton}
          >
            <Text style={[styles.publishButton, (!selectedMedia || uploading) && styles.publishButtonDisabled]}>
              {uploading ? 'Publishing...' : 'Publish'}
            </Text>
          </TouchableOpacity>
        </View>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#E1306C" />
          <Text style={styles.uploadingText}>Uploading story...</Text>
        </View>
      )}

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {selectedMedia ? (
            <>
              <View style={styles.mediaContainer}>
                {mediaType === 'image' ? (
                  <ViewShot
                    ref={viewShotRef}
                    options={{ format: 'jpg', quality: 0.9 }}
                    style={styles.imageWrapper}
                  >
                    <Image 
                      source={{ uri: filteredImageUri || selectedMedia }} 
                      style={[
                        styles.mediaPreview,
                        getFilterStyle(selectedFilter),
                      ]} 
                    />
                    {/* Filter Overlay */}
                    {selectedFilter !== 'none' && (
                      <View 
                        style={[
                          styles.filterOverlay,
                          { 
                            backgroundColor: getFilterOverlay(selectedFilter),
                          }
                        ]} 
                      />
                    )}
                    {/* Text Overlays - These will be captured in the image */}
                    {textOverlays.map((overlay) => (
                      <TouchableOpacity
                        key={overlay.id}
                        style={[
                          styles.textOverlay, 
                          { 
                            left: `${overlay.x}%`, 
                            top: `${overlay.y}%`,
                            transform: [{ translateX: -50 }, { translateY: -50 }],
                          }
                        ]}
                        onLongPress={() => removeTextOverlay(overlay.id)}
                        activeOpacity={1}
                      >
                        <Text style={styles.overlayText}>{overlay.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </ViewShot>
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam" size={48} color="#fff" />
                    <Text style={styles.videoText}>Video selected</Text>
                  </View>
                )}
              </View>

              {/* Filter Selector */}
              {mediaType === 'image' && (
                <FilterSelector
                  imageUri={selectedMedia}
                  selectedFilter={selectedFilter}
                  onFilterSelect={handleFilterSelect}
                />
              )}

              {/* Editing Tools */}
              <View style={styles.toolsContainer}>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => setShowTextInput(!showTextInput)}
                >
                  <Ionicons name="text" size={24} color="#fff" />
                  <Text style={styles.toolButtonText}>Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => {
                    if (textOverlays.length > 0) {
                      Alert.alert('Clear All Text', 'Remove all text overlays?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear', onPress: () => setTextOverlays([]), style: 'destructive' },
                      ]);
                    }
                  }}
                  disabled={textOverlays.length === 0}
                >
                  <Ionicons name="trash-outline" size={24} color={textOverlays.length > 0 ? "#fff" : "#666"} />
                  <Text style={[styles.toolButtonText, textOverlays.length === 0 && styles.toolButtonTextDisabled]}>Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              {showTextInput && (
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your text..."
                    placeholderTextColor="#999"
                    value={currentText}
                    onChangeText={setCurrentText}
                    multiline
                    maxLength={100}
                    autoFocus
                  />
                  <View style={styles.textInputActions}>
                    <TouchableOpacity
                      style={styles.textInputButton}
                      onPress={() => {
                        setShowTextInput(false);
                        setCurrentText('');
                      }}
                    >
                      <Text style={styles.textInputButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.textInputButton, styles.textInputButtonPrimary]}
                      onPress={addTextOverlay}
                    >
                      <Text style={[styles.textInputButtonText, styles.textInputButtonTextPrimary]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Select a photo or video</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={() => pickMedia('camera')}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.pickButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={() => pickMedia('library')}
                >
                  <Ionicons name="images" size={24} color="#fff" />
                  <Text style={styles.pickButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#000',
    minHeight: 50,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: 5,
  },
  cancelButton: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  publishButton: {
    color: '#E1306C',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  publishButtonDisabled: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
  },
  mediaContainer: {
    width: '100%',
    height: Platform.OS === 'android' ? 400 : 450,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
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
  textOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 250,
    minWidth: 80,
  },
  overlayText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 20,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  toolButtonActive: {
    backgroundColor: 'rgba(225, 48, 108, 0.5)',
    borderWidth: 2,
    borderColor: '#E1306C',
  },
  toolButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toolButtonTextDisabled: {
    color: '#666',
  },
  textInputContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  textInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  textInputButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  textInputButtonPrimary: {
    backgroundColor: '#E1306C',
  },
  textInputButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  textInputButtonTextPrimary: {
    color: '#fff',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
  },
  pickButton: {
    backgroundColor: '#E1306C',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default CreateStoryScreen;

