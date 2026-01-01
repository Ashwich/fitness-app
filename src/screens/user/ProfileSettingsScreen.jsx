import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
      description: 'Name, email, and social info',
      icon: 'person',
      color: '#6366f1', // Indigo
      screen: 'PersonalInfoScreen',
      params: { profile, isEditing: true },
    },
    {
      id: 'physical',
      title: 'Physical Stats',
      description: 'Weight, height, and BMI',
      icon: 'fitness',
      color: '#10b981', // Emerald
      screen: 'PhysicalInfoScreen',
      params: { profile, isEditing: true },
    },
    {
      id: 'fitness',
      title: 'Fitness Goals',
      description: 'Activity levels and targets',
      icon: 'trophy',
      color: '#f59e0b', // Amber
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
      description: 'Daily calories and macros',
      icon: 'restaurant',
      color: '#ef4444', // Rose
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
      description: 'Hydration targets',
      icon: 'water',
      color: '#3b82f6', // Blue
      screen: 'WaterIntakeScreen',
      params: {},
    },
    {
      id: 'steps',
      title: 'Steps Goal',
      description: 'Daily movement targets',
      icon: 'walk',
      color: '#8b5cf6', // Violet
      screen: 'StepsGoalScreen',
      params: {},
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

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
              onPress={() => navigation.navigate(option.screen, option.params || {})}
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
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.footerInfo}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} color="#94a3b8" />
          <Text style={styles.footerText}>Your data is encrypted and secure</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 22,
  },
  optionsGrid: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

export default ProfileSettingsScreen;