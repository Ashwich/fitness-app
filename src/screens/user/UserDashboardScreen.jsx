import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import { fetchProfile, upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import {
  getTodaySteps,
  getTodayCaloriesBurned,
  getStepsGoal,
  startStepTracking,
  stopStepTracking,
} from '../../services/healthService';
import {
  getTodayWaterIntake,
  getWaterGoal,
} from '../../services/waterIntakeService';
import {
  getProfilePhoto,
  pickProfilePhoto,
} from '../../services/profilePhotoService';
import { calculateProfileCompletion } from '../../utils/profileCompletion';

const UserDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { bootstrapData, loading: bootstrapLoading } = useBootstrap();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(3.0);
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  // Use ref to store current profile for interval access without causing re-renders
  const profileRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      const profileData = await fetchProfile();
      console.log('Profile data loaded:', profileData);
      
      if (profileData) {
        // Handle calorieGoals if it's a JSON string (from database)
        if (profileData.calorieGoals && typeof profileData.calorieGoals === 'string') {
          try {
            profileData.calorieGoals = JSON.parse(profileData.calorieGoals);
          } catch (e) {
            console.warn('Failed to parse calorieGoals:', e);
          }
        }
        
        // Handle fitnessGoals if it's a JSON string
        if (profileData.fitnessGoals && typeof profileData.fitnessGoals === 'string') {
          try {
            profileData.fitnessGoals = JSON.parse(profileData.fitnessGoals);
          } catch (e) {
            console.warn('Failed to parse fitnessGoals:', e);
          }
        }
        
        setProfile(profileData);
        profileRef.current = profileData; // Update ref
        
        // Calculate actual profile completion
        const completion = calculateProfileCompletion(profileData);
        console.log('=== PROFILE COMPLETION DEBUG ===');
        console.log('Profile completion:', JSON.stringify(completion, null, 2));
        console.log('Full profile data:', JSON.stringify(profileData, null, 2));
        console.log('Fitness Goals:', JSON.stringify(profileData.fitnessGoals, null, 2));
        console.log('Calorie Goals:', JSON.stringify(profileData.calorieGoals, null, 2));
        console.log('Activity Level:', profileData.activityLevel);
        console.log('Full Name:', profileData.fullName);
        console.log('Date of Birth:', profileData.dateOfBirth);
        console.log('Gender:', profileData.gender);
        console.log('Location:', profileData.location);
        console.log('Weight:', profileData.weightKg);
        console.log('Height:', profileData.heightCm);
        
        // Check if database migration is needed
        if (!profileData.hasOwnProperty('location') || !profileData.hasOwnProperty('fitnessGoals') || !profileData.hasOwnProperty('calorieGoals')) {
          console.warn('⚠️ DATABASE MIGRATION NEEDED!');
          console.warn('The database schema is missing these fields. Please run:');
          console.warn('1. cd C:\\Users\\Lenovo\\Desktop\\Gym-Backend\\users-service');
          console.warn('2. npm run prisma:generate');
          console.warn('3. npm run prisma:migrate');
          console.warn('4. Restart the backend server');
        }
        console.log('===============================');
        
        // Profile is complete if 100% of required fields are filled
        setIsProfileComplete(completion.percentage === 100);
        
        // Load real health data
        const steps = await getTodaySteps();
        setTodaySteps(steps);
        
        const calories = await getTodayCaloriesBurned(profileData);
        setCaloriesBurned(calories);
        
        const water = await getTodayWaterIntake();
        setWaterIntake(water);
        
        const wGoal = await getWaterGoal();
        setWaterGoal(wGoal);
        
        // Load profile photo
        const photo = await getProfilePhoto();
        setProfilePhoto(photo);
      } else {
        setProfile(null);
        profileRef.current = null; // Update ref
        setIsProfileComplete(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      if (error.response?.status !== 404) {
        console.error('Error details:', error.message);
      }
      setProfile(null);
      profileRef.current = null; // Update ref
      setIsProfileComplete(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Wait for bootstrap to finish loading
    if (bootstrapLoading) {
      return;
    }
    
    // Try to use bootstrap data first (user profile is included)
    if (bootstrapData?.user?.profile) {
      console.log('[UserDashboard] Using bootstrap data for profile');
      const profileData = bootstrapData.user.profile;
      
      // Handle JSON string parsing
      if (profileData.calorieGoals && typeof profileData.calorieGoals === 'string') {
        try {
          profileData.calorieGoals = JSON.parse(profileData.calorieGoals);
        } catch (e) {
          console.warn('Failed to parse calorieGoals:', e);
        }
      }
      
      if (profileData.fitnessGoals && typeof profileData.fitnessGoals === 'string') {
        try {
          profileData.fitnessGoals = JSON.parse(profileData.fitnessGoals);
        } catch (e) {
          console.warn('Failed to parse fitnessGoals:', e);
        }
      }
      
      setProfile(profileData);
      profileRef.current = profileData;
      
      // Calculate profile completion
      const completion = calculateProfileCompletion(profileData);
      setIsProfileComplete(completion.percentage === 100);
      
      if (isMounted) {
        setLoading(false);
      }
    } else {
      // Fallback to individual API call if bootstrap data not available
      console.log('[UserDashboard] Bootstrap data not available, using individual API call');
      loadProfile().finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    }
    
    startStepTracking();
    
    // Refresh steps and calories every 30 seconds (reduced frequency)
    const interval = setInterval(async () => {
      const currentProfile = profileRef.current; // Use ref to get current profile
      if (currentProfile) {
        const steps = await getTodaySteps();
        setTodaySteps(steps);
        const calories = await getTodayCaloriesBurned(currentProfile);
        setCaloriesBurned(calories);
      }
    }, 30000); // Changed from 5 seconds to 30 seconds
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      stopStepTracking();
    };
  }, []); // Only run once on mount

  // Refresh profile when screen comes into focus (but not if already loading)
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadProfile();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]) // Only depend on loading to prevent infinite loops
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    // Refresh health data
    if (profile) {
      const steps = await getTodaySteps();
      setTodaySteps(steps);
      const calories = await getTodayCaloriesBurned(profile);
      setCaloriesBurned(calories);
      const water = await getTodayWaterIntake();
      setWaterIntake(water);
    }
    setRefreshing(false);
  }, [loadProfile, profile]);

  const handleStartProfileSetup = () => {
    navigation.navigate('PersonalInfoScreen');
  };

  const handleViewProfile = () => {
    if (isProfileComplete && profile) {
      navigation.navigate('ProfileSummaryScreen', {
        userProfile: profile,
        profile: profile,
        personalInfo: {
          fullName: profile.fullName,
          age: profile.age,
          gender: profile.gender,
          location: profile.location,
          dateOfBirth: profile.dateOfBirth,
        },
        physicalInfo: {
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          weight: profile.weightKg,
          height: profile.heightCm,
          bmi: profile.bmi,
          bmiCategory: profile.bmiCategory,
          originalWeight: profile.weightKg,
          originalHeight: profile.heightCm,
        },
        fitnessGoals: {
          primaryGoal: profile.fitnessGoals?.primaryGoal,
          exerciseLevel: profile.activityLevel,
          workoutsPerWeek: profile.workoutsPerWeek,
          timePerWorkout: profile.timePerWorkout,
        },
        calorieGoals: profile.calorieGoals,
      });
    } else {
      Alert.alert('Profile Incomplete', 'Please complete your profile first.');
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('PersonalInfoScreen', {
      profile,
      isEditing: true,
    });
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleProfilePhotoPress = async () => {
    const photo = await pickProfilePhoto();
    if (photo) {
      setProfilePhoto(photo);
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate('ProfileSettingsScreen');
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Ionicons name="fitness" size={40} color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Calculate BMI
  const calculateBMI = () => {
    if (profile?.weightKg && profile?.heightCm) {
      const heightM = profile.heightCm / 100;
      return (profile.weightKg / (heightM * heightM)).toFixed(1);
    }
    return null;
  };

  const bmi = calculateBMI();
  const profileCompletion = calculateProfileCompletion(profile);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleProfilePhotoPress} style={styles.profilePhotoButton}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="person" size={24} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fitsera</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profileCompletion.percentage < 100 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIcon}>
                <Ionicons name="person-circle" size={24} color="#2563eb" />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Profile Completion</Text>
                <Text style={styles.progressPercentage}>{profileCompletion.percentage}%</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${profileCompletion.percentage}%` }
                ]} 
              />
            </View>
            
            <View style={styles.progressDetails}>
              <Text style={styles.progressText}>
                {profileCompletion.completed} of {profileCompletion.total} fields completed
              </Text>
              {profileCompletion.missing.length > 0 && (
                <View style={styles.missingSection}>
                  <Text style={styles.missingTitle}>Still missing:</Text>
                  {profileCompletion.missing.map((item, index) => (
                    <Text key={index} style={styles.missingItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.completeButton} onPress={handleStartProfileSetup}>
              <Text style={styles.completeButtonText}>Complete Profile</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Always show stats if profile exists, even if incomplete */}
        {profile && (
          <>
            {/* Calorie Goal and Calories Burned Row */}
            <View style={styles.topMetricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Calorie Goal</Text>
                <Text style={styles.metricValue}>
                  {profile.calorieGoals?.dailyCalories || 2000} kcal
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Calories Burned</Text>
                <Text style={styles.metricValue}>{caloriesBurned} kcal</Text>
                <Ionicons name="flame" size={16} color="#ef4444" style={styles.metricIcon} />
              </View>
            </View>

            {/* Steps Card */}
            <TouchableOpacity
              style={styles.stepsCard}
              onPress={() => navigation.navigate('StepsGoalScreen')}
            >
              <Text style={styles.cardTitle}>Steps</Text>
              <View style={styles.stepsContent}>
                <View style={styles.stepsLeft}>
                  <Text style={styles.stepsValue}>{todaySteps.toLocaleString()}</Text>
                  <Ionicons name="footsteps" size={20} color="#6b7280" style={styles.stepsIcon} />
                </View>
                <Ionicons name="walk" size={32} color="#10b981" />
              </View>
            </TouchableOpacity>

            {/* Nutrition Goal Card */}
            <TouchableOpacity 
              style={styles.nutritionCard}
              onPress={() => navigation.navigate('CalorieGoalsScreen', {
                userProfile: profile,
                isEditing: true,
                editMode: true,
              })}
            >
              <Text style={styles.cardTitle}>Nutrition Goal</Text>
              {profile.calorieGoals?.dailyCalories ? (
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Pro</Text>
                    <Text style={styles.nutritionValue}>
                      {profile.calorieGoals?.protein || 0}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                    <Text style={styles.nutritionValue}>
                      {profile.calorieGoals?.carbs || 0}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                    <Text style={styles.nutritionValue}>
                      {profile.calorieGoals?.fat || 0}g
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyNutritionState}>
                  <Text style={styles.emptyNutritionText}>
                    Set your nutrition goals to track your macros
                  </Text>
                  <Ionicons name="nutrition-outline" size={24} color="#9ca3af" style={styles.emptyNutritionIcon} />
                </View>
              )}
            </TouchableOpacity>

            {/* Physical Stats Card */}
            <View style={styles.physicalStatsCard}>
              <Text style={styles.cardTitle}>Physical Stats</Text>
              <View style={styles.statsContent}>
                <Text style={styles.statText}>
                  Weight: {profile.weightKg || 'N/A'}kg
                </Text>
                <Text style={styles.statText}>
                  Height: {profile.heightCm || 'N/A'}cm
                </Text>
                <Text style={styles.statText}>
                  BMI: {bmi || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Water Intake Card */}
            <TouchableOpacity
              style={styles.waterCard}
              onPress={() => navigation.navigate('WaterIntakeScreen')}
            >
              <Text style={styles.cardTitle}>Water Intake</Text>
              <View style={styles.waterContent}>
                <Ionicons name="water" size={24} color="#3b82f6" />
                <Text style={styles.waterText}>
                  {waterIntake.toFixed(1)} L / {waterGoal.toFixed(1)} L
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>


          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#10b981',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profilePhotoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Progress Card Styles
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressDetails: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  missingSection: {
    marginTop: 8,
  },
  missingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  missingItem: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    marginBottom: 4,
  },
  completeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeCard: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Top Metrics Row (Calorie Goal & Calories Burned)
  topMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  metricIcon: {
    marginTop: 4,
  },
  // Steps Card
  stepsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  stepsIcon: {
    marginTop: 4,
  },
  // Nutrition Goal Card
  nutritionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyNutritionState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyNutritionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyNutritionIcon: {
    marginTop: 4,
  },
  // Physical Stats Card
  physicalStatsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsContent: {
    marginTop: 12,
    gap: 8,
  },
  statText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  // Water Intake Card
  waterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  waterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  waterText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  // Diary Card
  diaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  diaryContent: {
    flex: 1,
  },
  diarySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Common Card Title
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default UserDashboardScreen;
