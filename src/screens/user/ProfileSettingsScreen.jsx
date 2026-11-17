import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchProfile } from '../../api/services/profileService';
import { colors } from '../../theme/opengym';

const ProfileSettingsScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const profileData = await fetchProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const buildOptions = (p) => {
    const options = [
      {
        id: 'profile',
        title: 'Personal Profile',
        description: 'Name, email, and social info',
        icon: 'person',
        color: '#6366f1',
        screen: 'PersonalInfoScreen',
        params: { profile: p, isEditing: true },
      },
      {
        id: 'physical',
        title: 'Physical Stats',
        description: 'Weight, height, and BMI',
        icon: 'fitness',
        color: '#10b981',
        screen: 'PhysicalInfoScreen',
        params: { userProfile: p, profile: p, isEditing: true, editMode: true },
      },
      {
        id: 'fitness',
        title: 'Fitness Goals',
        description: 'Activity levels and targets',
        icon: 'trophy',
        color: '#f59e0b',
        screen: 'FitnessGoalsScreen',
        params: {
          userProfile: p,
          profile: p,
          personalInfo: {
            fullName: p?.fullName,
            age: p?.age,
            gender: p?.gender,
            location: p?.location,
            dateOfBirth: p?.dateOfBirth,
          },
          physicalInfo: {
            weightKg: p?.weightKg,
            heightCm: p?.heightCm,
            bmi: p?.bmi,
          },
          isEditing: true,
          editMode: true,
        },
      },
      {
        id: 'nutrition',
        title: 'Nutrition Goals',
        description: 'Daily calories and macros',
        icon: 'restaurant',
        color: '#ef4444',
        screen: 'CalorieGoalsScreen',
        params: {
          userProfile: p,
          profile: p,
          personalInfo: {
            fullName: p?.fullName,
            age: p?.age,
            gender: p?.gender,
          },
          physicalInfo: {
            weightKg: p?.weightKg,
            heightCm: p?.heightCm,
          },
          fitnessGoals: {
            primaryGoal: p?.fitnessGoals?.primaryGoal || p?.goalType,
            exerciseLevel: p?.activityLevel,
            workoutsPerWeek: p?.workoutsPerWeek,
            timePerWorkout: p?.timePerWorkout,
          },
          isEditing: true,
          editMode: true,
        },
      },
      {
        id: 'water',
        title: 'Water Intake',
        description: 'Hydration targets',
        icon: 'water',
        color: '#3b82f6',
        screen: 'WaterIntakeScreen',
        params: {},
      },
      {
        id: 'steps',
        title: 'Steps Goal',
        description: 'Daily movement targets',
        icon: 'walk',
        color: '#8b5cf6',
        screen: 'StepsGoalScreen',
        params: {},
      },
    ];

    if (p?.gender === 'female') {
      options.splice(4, 0, {
        id: 'periods',
        title: 'Period tracking',
        description: 'Cycle calendar & reminders',
        icon: 'calendar',
        color: '#e11d48',
        screen: 'PeriodTrackingScreen',
        params: {},
      });
    }
    return options;
  };

  const settingsOptions = buildOptions(profile);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && !profile ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introSection}>
            <Text style={styles.mainTitle}>My Metrics</Text>
            <Text style={styles.subTitle}>
              Fine-tune your health data to get the most accurate insights.
            </Text>
          </View>

          <View style={styles.optionsGrid}>
            {settingsOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.card}
                onPress={() => {
                  // Always navigate with freshly loaded profile snapshot
                  const fresh = buildOptions(profile).find((o) => o.id === option.id);
                  navigation.navigate(fresh.screen, fresh.params || {});
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon} size={26} color={option.color} />
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {option.description}
                  </Text>
                </View>

                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={18} color={colors.label3} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerInfo}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.label3} />
            <Text style={styles.footerText}>Your data is encrypted and secure</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.label },
  placeholder: { width: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  introSection: { paddingHorizontal: 24, paddingVertical: 20 },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.label,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 15,
    color: colors.label2,
    marginTop: 6,
    lineHeight: 22,
  },
  optionsGrid: { paddingHorizontal: 20, marginTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.label },
  cardDesc: { fontSize: 13, color: colors.label3, marginTop: 2 },
  arrowContainer: { paddingLeft: 8 },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: { fontSize: 12, color: colors.label3, fontWeight: '500' },
});

export default ProfileSettingsScreen;
