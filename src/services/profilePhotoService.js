import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadProfilePhoto } from '../api/services/uploadService';
import { upsertProfile } from '../api/services/profileService';

// Use MediaType if available, otherwise fallback to MediaTypeOptions (deprecated but still works)
const getMediaType = () => {
  if (ImagePicker.MediaType) {
    return ImagePicker.MediaType.Images;
  }
  if (ImagePicker.MediaTypeOptions) {
    return ImagePicker.MediaTypeOptions.Images;
  }
  return 'images'; // Fallback to string value
};

const PROFILE_PHOTO_KEY = 'fitsera_profile_photo';

export const requestPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'We need access to your photos to set a profile picture.'
    );
    return false;
  }
  return true;
};

export const pickProfilePhoto = async (uploadToBackend = true) => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getMediaType(),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const photoUri = result.assets[0].uri;
      
      // Upload to backend if requested
      if (uploadToBackend) {
        try {
          const uploadResult = await uploadProfilePhoto(photoUri);
          const uploadedUrl = uploadResult.url;
          
          // Save to profile
          await upsertProfile({ avatarUrl: uploadedUrl });
          
          // Also save locally for quick access
          await saveProfilePhoto(uploadedUrl);
          
          return uploadedUrl;
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          Alert.alert('Upload Failed', 'Failed to upload profile photo. Using local version.');
          // Fallback to local storage
          await saveProfilePhoto(photoUri);
          return photoUri;
        }
      } else {
        // Just save locally
        await saveProfilePhoto(photoUri);
        return photoUri;
      }
    }
    return null;
  } catch (error) {
    console.error('Error picking profile photo:', error);
    return null;
  }
};

export const takeProfilePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to take a profile picture.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const photoUri = result.assets[0].uri;
      await saveProfilePhoto(photoUri);
      return photoUri;
    }
    return null;
  } catch (error) {
    console.error('Error taking profile photo:', error);
    return null;
  }
};

export const saveProfilePhoto = async (uri) => {
  try {
    await AsyncStorage.setItem(PROFILE_PHOTO_KEY, uri);
  } catch (error) {
    console.error('Error saving profile photo:', error);
  }
};

export const getProfilePhoto = async () => {
  try {
    return await AsyncStorage.getItem(PROFILE_PHOTO_KEY);
  } catch (error) {
    console.error('Error getting profile photo:', error);
    return null;
  }
};

export const deleteProfilePhoto = async () => {
  try {
    await AsyncStorage.removeItem(PROFILE_PHOTO_KEY);
  } catch (error) {
    console.error('Error deleting profile photo:', error);
  }
};

