import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import {
  getNearbyGyms,
  getAllGyms,
  getGymsByCity,
  getGymReviews,
  addGymReview,
} from '../../api/services/gymService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const GymsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { bootstrapData } = useBootstrap();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Get user location from profile
  const getUserLocation = () => {
    const profile = bootstrapData?.user?.profile || user?.profile;
    if (profile?.location) {
      return profile.location;
    }
    if (profile?.city && profile?.state) {
      return `${profile.city}, ${profile.state}`;
    }
    if (profile?.city) {
      return profile.city;
    }
    return null;
  };

  const loadGyms = useCallback(async () => {
    try {
      setLoading(true);
      const location = getUserLocation();
      
      let gymsData = [];
      if (location) {
        console.log('[Gyms] Fetching gyms near:', location);
        try {
          // Try to get gyms by city first
          gymsData = await getNearbyGyms(location, 10, 50);
          if (!Array.isArray(gymsData) || gymsData.length === 0) {
            console.log('[Gyms] No gyms found for city, fetching all gyms');
            gymsData = await getAllGyms(50, 0);
          }
        } catch (error) {
          console.warn('[Gyms] Nearby search failed, fetching all gyms:', error);
          gymsData = await getAllGyms(50, 0);
        }
      } else {
        console.log('[Gyms] No location found, fetching all gyms');
        gymsData = await getAllGyms(50, 0);
      }

      // Ensure gymsData is an array
      if (!Array.isArray(gymsData)) {
        console.warn('[Gyms] Gyms data is not an array:', gymsData);
        setGyms([]);
        return;
      }

      // For now, reviews are not implemented, so just format the gym data
      const gymsWithReviews = gymsData.map((gym) => {
        // Extract logo from branding if available
        let logoUrl = null;
        if (gym.branding && typeof gym.branding === 'object') {
          logoUrl = gym.branding.logoUrl || gym.branding.logo || null;
        }
        
        return {
          ...gym,
          logoUrl: logoUrl,
          reviews: [],
          averageRating: 0,
          reviewsCount: 0,
          description: gym.branding?.description || null,
        };
      });

      setGyms(gymsWithReviews);
    } catch (error) {
      console.error('Error loading gyms:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, bootstrapData]);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  useFocusEffect(
    useCallback(() => {
      loadGyms();
    }, [loadGyms])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGyms();
  };

  const handleGymPress = (gym) => {
    // Show gym details in an alert or expand the card
    // For now, just show basic info
    Alert.alert(
      gym.name || 'Gym',
      `${gym.description || 'No description'}\n\n${gym.address || ''}\n${gym.city && gym.state ? `${gym.city}, ${gym.state}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleAddReview = (gym) => {
    setSelectedGym(gym);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedGym) return;
    
    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      // Reviews not implemented yet in backend
      Alert.alert('Coming Soon', 'Review functionality will be available soon!');
      setShowReviewModal(false);
      setSelectedGym(null);
      setReviewComment('');
      setReviewRating(5);
      
      // TODO: Uncomment when reviews are implemented
      // await addGymReview(selectedGym.id, {
      //   rating: reviewRating,
      //   comment: reviewComment.trim(),
      // });
      // Alert.alert('Success', 'Review added successfully');
      // await loadGyms();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setSubmittingReview(false);
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

  if (loading && gyms.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading gyms...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Gyms</Text>
        {getUserLocation() && (
          <Text style={styles.locationText}>{getUserLocation()}</Text>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {gyms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No gyms found</Text>
            <Text style={styles.emptySubtext}>
              {getUserLocation()
                ? 'Try updating your location in profile'
                : 'Please add your location in profile settings'}
            </Text>
          </View>
        ) : (
          gyms.map((gym) => (
            <TouchableOpacity
              key={gym.id}
              style={styles.gymCard}
              onPress={() => handleGymPress(gym)}
            >
              <View style={styles.gymHeader}>
                <View style={styles.gymInfo}>
                  <Text style={styles.gymName}>{gym.name || 'Gym'}</Text>
                  {gym.address && (
                    <Text style={styles.gymAddress}>{gym.address}</Text>
                  )}
                  {gym.city && gym.state && (
                    <Text style={styles.gymLocation}>
                      {gym.city}, {gym.state}
                    </Text>
                  )}
                </View>
                {gym.logoUrl && (
                  <Image source={{ uri: gym.logoUrl }} style={styles.gymLogo} />
                )}
              </View>

              {gym.averageRating > 0 && (
                <View style={styles.ratingContainer}>
                  <View style={styles.starsContainer}>
                    {renderStars(gym.averageRating)}
                  </View>
                  <Text style={styles.ratingText}>
                    {gym.averageRating.toFixed(1)} ({gym.reviewsCount} reviews)
                  </Text>
                </View>
              )}

              {gym.description && (
                <Text style={styles.gymDescription} numberOfLines={2}>
                  {gym.description}
                </Text>
              )}

              <View style={styles.gymActions}>
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => handleAddReview(gym)}
                >
                  <Ionicons name="star-outline" size={18} color="#2563eb" />
                  <Text style={styles.reviewButtonText}>Add Review</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleGymPress(gym)}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Review {selectedGym?.name || 'Gym'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingInputContainer}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <View style={styles.starsInputContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                  >
                    <Ionicons
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= reviewRating ? '#fbbf24' : '#d1d5db'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.commentInputContainer}>
              <Text style={styles.commentLabel}>Comment</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Write your review..."
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submittingReview && styles.submitButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  gymCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gymHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  gymAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  gymLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  gymLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  gymDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  gymActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    gap: 6,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  viewButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  viewButtonText: {
    fontSize: 14,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  ratingInputContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  starsInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInputContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default GymsScreen;

