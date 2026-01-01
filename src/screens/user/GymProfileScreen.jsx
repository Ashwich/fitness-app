import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getGymPhotos, createGymInquiry, getGymById } from '../../api/services/gymService';
import { getGymReviews } from '../../api/services/gymReviewService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GymProfileScreen = ({ route, navigation }) => {
  const { gym: initialGym } = route.params || {};
  const { user } = useAuth();
  const [gym, setGym] = useState(initialGym);
  const [loading, setLoading] = useState(!initialGym);
  const [photos, setPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    name: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: '',
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  const loadGymData = useCallback(async () => {
    if (!gym?.id) return;

    try {
      setLoading(true);
      
      // Load photos
      try {
        const gymPhotos = await getGymPhotos(gym.id);
        setPhotos(Array.isArray(gymPhotos) ? gymPhotos : []);
      } catch (error) {
        console.warn('[GymProfile] Failed to load photos:', error);
        setPhotos([]);
      }

      // Load reviews
      try {
        const reviewsData = await getGymReviews(gym.id, 10, 0);
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setReviewsCount(reviewsData.total || 0);
      } catch (error) {
        console.warn('[GymProfile] Failed to load reviews:', error);
        setReviews([]);
      }

      // Try to get full gym details if we only have basic info
      if (!gym.description && !gym.address) {
        try {
          const fullGymData = await getGymById(gym.id);
          if (fullGymData) {
            setGym((prev) => ({ ...prev, ...fullGymData }));
          }
        } catch (error) {
          console.warn('[GymProfile] Could not load full gym details:', error);
        }
      }
    } catch (error) {
      console.error('[GymProfile] Error loading gym data:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  }, [gym?.id]);

  useEffect(() => {
    loadGymData();
  }, [loadGymData]);

  useFocusEffect(
    useCallback(() => {
      loadGymData();
    }, [loadGymData])
  );

  const handleSendInquiry = async () => {
    if (!inquiryData.name.trim() || !inquiryData.message.trim()) {
      Alert.alert('Error', 'Name and message are required');
      return;
    }

    if (!inquiryData.email.trim() && !inquiryData.phone.trim()) {
      Alert.alert('Error', 'Please provide either email or phone number');
      return;
    }

    try {
      setSubmittingInquiry(true);
      await createGymInquiry({
        gymId: gym.id,
        ...inquiryData,
      });
      Alert.alert('Success', 'Your inquiry has been sent successfully!');
      setShowInquiryModal(false);
      setInquiryData({
        name: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        message: '',
      });
    } catch (error) {
      console.error('[GymProfile] Error sending inquiry:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#fbbf24" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#fbbf24" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#d1d5db" />
      );
    }
    return stars;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseURL = ENV.GYM_SERVICE_URL.replace('/api', '');
    return `${baseURL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
  };

  if (loading && !gym) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading gym profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!gym) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Gym not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const logoUrl = gym.logoUrl || gym.branding?.logoUrl || gym.branding?.logo;
  const displayPhotos = photos.length > 0 ? photos : (logoUrl ? [{ url: logoUrl, type: 'logo' }] : []);

  return (
    <ScreenContainer>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gym Profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Gym Logo/Header Image */}
        {logoUrl && (
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: getImageUrl(logoUrl) }}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Gym Info */}
        <View style={styles.infoSection}>
          <Text style={styles.gymName}>{gym.name || 'Gym'}</Text>
          
          {gym.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{gym.address}</Text>
            </View>
          )}

          {(gym.city || gym.state) && (
            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                {[gym.city, gym.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {gym.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{gym.phone}</Text>
            </View>
          )}

          {gym.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{gym.email}</Text>
            </View>
          )}

          {averageRating > 0 && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({reviewsCount} reviews)
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {gym.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{gym.description}</Text>
          </View>
        )}

        {/* Photos Gallery */}
        {displayPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosContainer}
            >
              {displayPhotos.map((photo, index) => {
                const photoUrl = photo.url || photo.imageUrl || photo;
                const imageUrl = typeof photoUrl === 'string' ? getImageUrl(photoUrl) : null;
                
                if (!imageUrl) return null;

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedPhotoIndex(index)}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Reviews Preview */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('GymReviewsScreen', { gym })}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {reviews.slice(0, 3).map((review, index) => (
              <View key={review.id || index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>
                    {review.user?.username || review.userName || 'Anonymous'}
                  </Text>
                  <View style={styles.reviewStars}>
                    {renderStars(review.rating || 0)}
                  </View>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Inquiry Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.inquiryButton}
            onPress={() => setShowInquiryModal(true)}
          >
            <Ionicons name="mail-outline" size={24} color="#fff" />
            <Text style={styles.inquiryButtonText}>Send Inquiry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Inquiry Modal */}
      <Modal
        visible={showInquiryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInquiryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Inquiry to {gym.name}</Text>
              <TouchableOpacity
                onPress={() => setShowInquiryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  value={inquiryData.name}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  value={inquiryData.email}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your phone number"
                  value={inquiryData.phone}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell the gym about your interest..."
                  value={inquiryData.message}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, message: text })}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submittingInquiry && styles.submitButtonDisabled]}
                onPress={handleSendInquiry}
                disabled={submittingInquiry}
              >
                {submittingInquiry ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Send Inquiry</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedPhotoIndex !== null && displayPhotos[selectedPhotoIndex] && (
            <Image
              source={{
                uri: getImageUrl(
                  displayPhotos[selectedPhotoIndex].url ||
                  displayPhotos[selectedPhotoIndex].imageUrl ||
                  displayPhotos[selectedPhotoIndex]
                ),
              }}
              style={styles.fullPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
  },
  logoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  gymName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  section: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  photosContainer: {
    marginTop: 8,
  },
  photoItem: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  inquiryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  inquiryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
});

export default GymProfileScreen;





