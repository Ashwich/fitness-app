import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';

const ProfileSettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await fetchProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Personal Profile',
      description: 'Edit your personal information',
      icon: 'person-outline',
      color: '#2563eb',
      screen: 'PersonalInfoScreen',
      params: { profile, isEditing: true },
    },
    {
      id: 'physical',
      title: 'Physical Stats',
      description: 'Update weight, height, and BMI',
      icon: 'body-outline',
      color: '#10b981',
      screen: 'PhysicalInfoScreen',
      params: { profile, isEditing: true },
    },
    {
      id: 'fitness',
      title: 'Fitness Goals',
      description: 'Set your fitness and activity goals',
      icon: 'trophy-outline',
      color: '#f59e0b',
      screen: 'FitnessGoalsScreen',
      params: {
        userProfile: profile,
        profile: profile,
        personalInfo: {
          fullName: profile?.fullName,
          age: profile?.age,
          gender: profile?.gender,
          location: profile?.location,
          dateOfBirth: profile?.dateOfBirth,
        },
        physicalInfo: {
          weightKg: profile?.weightKg,
          heightCm: profile?.heightCm,
        },
        isEditing: true,
      },
    },
    {
      id: 'nutrition',
      title: 'Nutrition Goals',
      description: 'Set daily calorie and macro targets',
      icon: 'nutrition-outline',
      color: '#ef4444',
      screen: 'CalorieGoalsScreen',
      params: {
        userProfile: profile,
        profile: profile,
        personalInfo: {
          fullName: profile?.fullName,
          age: profile?.age,
          gender: profile?.gender,
        },
        physicalInfo: {
          weightKg: profile?.weightKg,
          heightCm: profile?.heightCm,
        },
        fitnessGoals: {
          primaryGoal: profile?.fitnessGoals?.primaryGoal,
          exerciseLevel: profile?.activityLevel,
          workoutsPerWeek: profile?.workoutsPerWeek,
          timePerWorkout: profile?.timePerWorkout,
        },
      },
    },
    {
      id: 'water',
      title: 'Water Intake',
      description: 'Set water goal and track intake',
      icon: 'water-outline',
      color: '#3b82f6',
      screen: 'WaterIntakeScreen',
      params: {},
    },
    {
      id: 'steps',
      title: 'Steps Goal',
      description: 'Set daily step goal and track progress',
      icon: 'footsteps-outline',
      color: '#8b5cf6',
      screen: 'StepsGoalScreen',
      params: {},
    },
  ];

  const handleNavigate = (option) => {
    if (option.screen) {
      navigation.navigate(option.screen, option.params || {});
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Your Metrics</Text>
          <Text style={styles.sectionSubtitle}>
            Customize all your fitness and health goals
          </Text>
        </View>

        {settingsOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleNavigate(option)}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
              <Ionicons name={option.icon} size={24} color={option.color} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default ProfileSettingsScreen;

