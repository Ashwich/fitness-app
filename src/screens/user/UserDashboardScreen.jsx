import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import { fetchProfile } from '../../api/services/profileService';
import {
  getTodaySteps,
  getTodayCaloriesBurned,
  getStepsGoal,
  startStepTracking,
  stopStepTracking,
  initializeHealthKit,
} from '../../services/healthService';
import { getDiaryEntry } from '../../api/services/diaryService';
import {
  getTodayWaterIntake,
  getWaterGoal,
} from '../../services/waterIntakeService';
import {
  getProfilePhoto,
} from '../../services/profilePhotoService';
import { calculateProfileCompletion } from '../../utils/profileCompletion';
import { markDayActive, todayISO } from '../../services/activityCalendarService';

const { width } = Dimensions.get('window');

const UserDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { bootstrapData, loading: bootstrapLoading } = useBootstrap();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(3.0);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [diaryTotals, setDiaryTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const profileRef = useRef(null);

  // --- KEEPING EXISTING LOGIC UNCHANGED ---
  const loadProfile = useCallback(async () => {
    try {
      const profileData = await fetchProfile();
      if (profileData) {
        if (profileData.calorieGoals && typeof profileData.calorieGoals === 'string') {
          try { profileData.calorieGoals = JSON.parse(profileData.calorieGoals); } catch (e) {}
        }
        if (profileData.fitnessGoals && typeof profileData.fitnessGoals === 'string') {
          try { profileData.fitnessGoals = JSON.parse(profileData.fitnessGoals); } catch (e) {}
        }
        setProfile(profileData);
        profileRef.current = profileData;
        const completion = calculateProfileCompletion(profileData);
        setIsProfileComplete(completion.percentage === 100);
        
        const steps = await getTodaySteps();
        setTodaySteps(steps);
        if (steps > 0) {
          markDayActive(todayISO(), steps >= 5000 ? 3 : steps >= 1000 ? 2 : 1).catch(() => {});
        }
        const goal = await getStepsGoal();
        setStepsGoal(goal || 10000);
        const calories = await getTodayCaloriesBurned(profileData);
        setCaloriesBurned(calories);
        const water = await getTodayWaterIntake();
        setWaterIntake(water);
        const wGoal = await getWaterGoal();
        setWaterGoal(wGoal);
        const photo = await getProfilePhoto();
        setProfilePhoto(photo);
        
        // Load today's diary entry for nutrition breakdown
        try {
          const today = new Date().toISOString().split('T')[0];
          const diaryEntry = await getDiaryEntry(today);
          if (diaryEntry) {
            const totals = {
              calories: parseFloat(diaryEntry.totalCalories) || 0,
              protein: parseFloat(diaryEntry.totalProtein) || 0,
              carbs: parseFloat(diaryEntry.totalCarbs) || 0,
              fat: parseFloat(diaryEntry.totalFat) || 0,
            };
            setDiaryTotals(totals);
          } else {
            setDiaryTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          }
        } catch (error) {
          // Don't show error for missing diary entries (404 is expected if no food added yet)
          if (error.message && error.message.includes('authentication')) {
            console.error('Error loading diary entry:', error);
      } else {
            // Silent fail for missing diary entries
            setDiaryTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (bootstrapLoading) return;

    const run = async () => {
      const profileData = bootstrapData?.user?.profile;
      if (profileData) {
        setProfile(profileData);
        profileRef.current = profileData;
        const completion = calculateProfileCompletion(profileData);
        setIsProfileComplete(completion.percentage === 100);
        if (isMounted) setLoading(false);
        try {
          const steps = await getTodaySteps();
          if (!isMounted) return;
          setTodaySteps(steps);
          const goal = await getStepsGoal();
          setStepsGoal(goal || 10000);
          const calories = await getTodayCaloriesBurned(profileData);
          setCaloriesBurned(calories);
          const water = await getTodayWaterIntake();
          setWaterIntake(water);
          const wGoal = await getWaterGoal();
          setWaterGoal(wGoal);
          const photo = await getProfilePhoto();
          setProfilePhoto(photo);
        } catch {
          /* ignore */
        }
      } else {
        await loadProfile();
        if (isMounted) setLoading(false);
      }
    };

    run();

    initializeHealthKit().then((initialized) => {
      if (initialized) {
        console.log('[UserDashboard] HealthKit/Google Fit initialized');
      } else {
        startStepTracking();
      }
    });

    const interval = setInterval(async () => {
      const currentProfile = profileRef.current;
      if (!currentProfile) return;
      try {
        const steps = await getTodaySteps();
        setTodaySteps(steps);
        const calories = await getTodayCaloriesBurned(currentProfile);
        setCaloriesBurned(calories);
      } catch {
        /* ignore */
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      stopStepTracking();
    };
    // Only re-run when bootstrap finishes loading — not on every profile object identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapLoading]);

  // Reload profile only when returning to this screen (skip first mount — handled above)
  const didMountFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didMountFocus.current) {
        didMountFocus.current = true;
        return;
      }
      loadProfile();
    }, [loadProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const handleStartProfileSetup = () => navigation.navigate('PersonalInfoScreen');
  const handleSettingsPress = () => navigation.navigate('ProfileSettingsScreen');

  const calculateBMI = () => {
    if (profile?.weightKg && profile?.heightCm) {
      const heightM = profile.heightCm / 100;
      return (profile.weightKg / (heightM * heightM)).toFixed(1);
    }
    return 'N/A';
  };

  const profileCompletion = calculateProfileCompletion(profile);

  // Calculate steps progress
  const stepsProgress = stepsGoal > 0 ? Math.min(100, (todaySteps / stepsGoal) * 100) : 0;
  const stepsProgressAngle = stepsProgress > 0 ? ((stepsProgress / 100) * 360 - 90) : -90;

  // Calculate nutrition progress
  const goals = profile?.calorieGoals || {};
  const proteinProgress = goals.protein > 0 ? Math.min(100, (diaryTotals.protein / goals.protein) * 100) : 0;
  const carbsProgress = goals.carbs > 0 ? Math.min(100, (diaryTotals.carbs / goals.carbs) * 100) : 0;
  const fatProgress = goals.fat > 0 ? Math.min(100, (diaryTotals.fat / goals.fat) * 100) : 0;

  // --- NEW RENDER UI ---
  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Ionicons name="fitness" size={40} color="#30d158" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Updated Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingText}>Hi,</Text>
            <Text style={styles.userNameText}>{profile?.fullName?.split(' ')[0] || 'Athlete'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileHeaderImageContainer}
            onPress={handleSettingsPress}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.headerProfilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="settings-outline" size={20} color="#30d158" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#30d158" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          
          {/* Profile Completion - Subtle Banner Style */}
        {profileCompletion.percentage < 100 && (
            <TouchableOpacity style={styles.completionBanner} onPress={handleStartProfileSetup}>
              <Ionicons name="sparkles" size={20} color="#30d158" />
              <Text style={styles.completionBannerText}>
                Complete your profile ({profileCompletion.percentage}%) to unlock insights
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#30d158" />
            </TouchableOpacity>
          )}

          {/* Steps & Activity Hero Card (Inspired by your Screenshot 1 & 4) */}
          <View style={styles.heroCard}>
            <View style={styles.heroInfo}>
              <View style={styles.heroMetric}>
                <Ionicons name="footsteps" size={18} color="#30d158" />
                <Text style={styles.heroLabel}>Steps Today</Text>
                <Text style={styles.heroValue}>{todaySteps.toLocaleString()}</Text>
              </View>
              <View style={[styles.heroMetric, { marginTop: 20 }]}>
                <Ionicons name="flame" size={18} color="#ef4444" />
                <Text style={styles.heroLabel}>Active Burn</Text>
                <Text style={styles.heroValue}>{caloriesBurned} kcal</Text>
              </View>
            </View>
            
            <View style={styles.progressCircleContainer}>
              <View style={styles.circularProgressWrapper}>
                <View style={styles.circularProgressOuter}>
                  {stepsProgress > 0 && (
                    <View style={[
                      styles.circularProgress,
                      { transform: [{ rotate: `${stepsProgressAngle}deg` }] }
                    ]} />
                  )}
                  <View style={styles.circularProgressInner}>
                    <Text style={styles.circularProgressValue}>
                      {Math.round(stepsProgress)}%
                    </Text>
                    <Text style={styles.circularProgressLabel}>Goal</Text>
            </View>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.smallMetricCard}>
              <Text style={styles.smallLabel}>BMI</Text>
              <Text style={styles.smallValue}>{calculateBMI()}</Text>
              <View style={[styles.indicator, { backgroundColor: '#8b5cf6' }]} />
              </View>
            <View style={styles.smallMetricCard}>
              <Text style={styles.smallLabel}>Step Goal</Text>
              <Text style={styles.smallValue}>{stepsGoal.toLocaleString()}</Text>
              <View style={[styles.indicator, { backgroundColor: '#30d158' }]} />
            </View>
            <View style={styles.smallMetricCard}>
              <Text style={styles.smallLabel}>Target Calories</Text>
              <Text style={styles.smallValue}>{profile?.calorieGoals?.dailyCalories || 2000}</Text>
              <View style={[styles.indicator, { backgroundColor: '#f59e0b' }]} />
              </View>
            </View>

          {/* Nutrition Macros Section (Inspired by Screenshot 2) */}
            <TouchableOpacity
             style={styles.sectionCard}
             onPress={() => navigation.navigate('CalorieGoalsScreen', { userProfile: profile, isEditing: true, editMode: true })}
            >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </View>
            
            <View style={styles.macroContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Protein</Text>
                <View style={styles.macroBarBg}>
                  <View style={[styles.macroBarFill, { width: `${proteinProgress}%`, backgroundColor: '#3b82f6' }]} />
                </View>
                <Text style={styles.macroValue}>{Math.round(diaryTotals.protein)}g / {goals.protein || 0}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <View style={styles.macroBarBg}>
                  <View style={[styles.macroBarFill, { width: `${carbsProgress}%`, backgroundColor: '#ec4899' }]} />
                </View>
                <Text style={styles.macroValue}>{Math.round(diaryTotals.carbs)}g / {goals.carbs || 0}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Fats</Text>
                <View style={styles.macroBarBg}>
                  <View style={[styles.macroBarFill, { width: `${fatProgress}%`, backgroundColor: '#f59e0b' }]} />
                </View>
                <Text style={styles.macroValue}>{Math.round(diaryTotals.fat)}g / {goals.fat || 0}g</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Water & Attendance Horizontal Row */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.halfCard, { backgroundColor: '#1c1c1e' }]}
              onPress={() => navigation.navigate('WaterIntakeScreen')}
            >
                <Ionicons name="water" size={24} color="#3b82f6" />
              <Text style={styles.halfCardTitle}>Hydration</Text>
              <Text style={styles.halfCardValue}>{waterIntake.toFixed(1)}L / {waterGoal.toFixed(1)}L</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.halfCard, { backgroundColor: '#1c1c1e' }]}
              onPress={() => navigation.navigate('AttendanceScreen')}
            >
              <Ionicons name="qr-code" size={24} color="#8b5cf6" />
              <Text style={styles.halfCardTitle}>Gym Entry</Text>
              <Text style={styles.halfCardValue}>Check In</Text>
            </TouchableOpacity>
          </View>

          {/* Settings / Profile Footer */}
          <TouchableOpacity style={styles.footerButton} onPress={handleSettingsPress}>
             <Ionicons name="settings-sharp" size={20} color="#6b7280" />
             <Text style={styles.footerButtonText}>Account Settings</Text>
            </TouchableOpacity>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(235,235,245,0.6)', fontSize: 16, marginTop: 10 },
  header: {
    backgroundColor: '#000000',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: { fontSize: 16, color: 'rgba(235,235,245,0.6)', fontWeight: '500' },
  userNameText: { fontSize: 24, fontWeight: '600', color: '#ffffff' },
  profileHeaderImageContainer: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#2c2c2e',
    borderWidth: 2,
    borderColor: '#30d158',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  headerProfilePhoto: { width: '100%', height: '100%' },
  profilePhotoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, backgroundColor: '#000000' },
  mainContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  
  // Banner
  completionBanner: {
    backgroundColor: '#30d158',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  completionBannerText: { flex: 1, color: '#ffffff', fontSize: 13, fontWeight: '600', marginHorizontal: 10 },
  notificationCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  notificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notificationCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  inviteItem: {
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    gap: 10,
  },
  inviteText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  inviteButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rejectButton: {
    backgroundColor: '#2c2c2e',
  },
  rejectButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 12,
  },
  acceptButton: {
    backgroundColor: '#30d158',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Hero Activity Card
  heroCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 16,
  },
  heroInfo: { flex: 1 },
  heroMetric: { gap: 2 },
  heroLabel: { fontSize: 12, color: 'rgba(235,235,245,0.32)', fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { fontSize: 22, fontWeight: '600', color: '#ffffff' },
  progressCircleContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleGraphic: { alignItems: 'center' },
  circleSubtext: { fontSize: 10, color: 'rgba(235,235,245,0.32)', fontWeight: '600' },

  // Grid
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  
  // Circular Progress
  circularProgressWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circularProgress: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#30d158',
  },
  circularProgressInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  circularProgressValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#30d158',
  },
  circularProgressLabel: {
    fontSize: 10,
    color: 'rgba(235,235,245,0.32)',
    fontWeight: '600',
    marginTop: 2,
  },
  smallMetricCard: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2,
  },
  smallLabel: { fontSize: 12, color: 'rgba(235,235,245,0.32)', fontWeight: '600' },
  smallValue: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginTop: 4 },
  indicator: { height: 3, width: 20, borderRadius: 2, marginTop: 8 },

  // Section Cards
  sectionCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  macroContainer: { flexDirection: 'row', gap: 15 },
  macroItem: { flex: 1 },
  macroLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(235,235,245,0.6)', marginBottom: 5 },
  macroBarBg: { height: 6, backgroundColor: '#2c2c2e', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  macroBarFill: { height: '100%', borderRadius: 3 },
  macroValue: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  // Row Helpers
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard: { flex: 1, padding: 20, borderRadius: 14, gap: 8 },
  halfCardTitle: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  halfCardValue: { fontSize: 13, color: 'rgba(235,235,245,0.6)', fontWeight: '500' },
  
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 8,
    marginTop: 10,
  },
  footerButtonText: { color: 'rgba(235,235,245,0.6)', fontWeight: '600', fontSize: 14 },
});

export default UserDashboardScreen;