import React, { useState } from 'react';
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
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', color: '#ef4444' },
  { id: 'weight_gain', label: 'Weight Gain', icon: 'trending-up', color: '#3b82f6' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'barbell', color: '#10b981' },
  { id: 'maintenance', label: 'Maintenance', icon: 'scale-outline', color: '#f59e0b' },
  { id: 'endurance', label: 'Endurance', icon: 'fitness', color: '#8b5cf6' },
  { id: 'strength', label: 'Strength', icon: 'flash', color: '#6b7280' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { id: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { id: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { id: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  { id: 'extremely_active', label: 'Extremely Active', description: 'Very hard exercise, physical job' },
];

const FitnessGoalsScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};

  const [fitnessGoals, setFitnessGoals] = useState({
    primaryGoal: existingProfile?.fitnessGoals?.primaryGoal || '',
    exerciseLevel: existingProfile?.activityLevel || existingProfile?.exerciseLevel || '',
    workoutsPerWeek: existingProfile?.workoutsPerWeek?.toString() || '3',
    timePerWorkout: existingProfile?.timePerWorkout?.toString() || '45 min',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!fitnessGoals.primaryGoal) {
      newErrors.primaryGoal = 'Please select a primary fitness goal';
    }

    if (!fitnessGoals.exerciseLevel) {
      newErrors.exerciseLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    const fitnessGoalsData = {
      primaryGoal: fitnessGoals.primaryGoal,
      exerciseLevel: fitnessGoals.exerciseLevel,
      workoutsPerWeek: parseInt(fitnessGoals.workoutsPerWeek, 10),
      timePerWorkout: fitnessGoals.timePerWorkout,
    };

    // Pass data forward via route params (old app flow)
    navigation.navigate('CalorieGoalsScreen', {
      userProfile: existingProfile,
      personalInfo,
      physicalInfo,
      fitnessGoals: fitnessGoalsData,
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fitness Goals</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Set Your Goals</Text>
          <Text style={styles.sectionSubtitle}>
            Tell us what you want to achieve
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Primary Fitness Goal *</Text>
            <View style={styles.goalsGrid}>
              {FITNESS_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    fitnessGoals.primaryGoal === goal.id && styles.goalCardSelected,
                    fitnessGoals.primaryGoal === goal.id && {
                      borderColor: goal.color,
                      backgroundColor: `${goal.color}10`,
                    },
                  ]}
                  onPress={() => {
                    setFitnessGoals({ ...fitnessGoals, primaryGoal: goal.id });
                    setErrors({ ...errors, primaryGoal: '' });
                  }}
                >
                  <Ionicons
                    name={goal.icon}
                    size={24}
                    color={fitnessGoals.primaryGoal === goal.id ? goal.color : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.goalLabel,
                      fitnessGoals.primaryGoal === goal.id && {
                        color: goal.color,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.primaryGoal && (
              <Text style={styles.errorText}>{errors.primaryGoal}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Activity Level *</Text>
            <View style={styles.activityLevelsList}>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.activityLevelCard,
                    fitnessGoals.exerciseLevel === level.id && styles.activityLevelCardSelected,
                  ]}
                  onPress={() => {
                    setFitnessGoals({ ...fitnessGoals, exerciseLevel: level.id });
                    setErrors({ ...errors, exerciseLevel: '' });
                  }}
                >
                  <View style={styles.activityLevelContent}>
                    <Text
                    style={[
                      styles.activityLevelLabel,
                      fitnessGoals.exerciseLevel === level.id &&
                        styles.activityLevelLabelSelected,
                    ]}
                    >
                      {level.label}
                    </Text>
                    <Text style={styles.activityLevelDescription}>{level.description}</Text>
                  </View>
                  {fitnessGoals.exerciseLevel === level.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.exerciseLevel && (
              <Text style={styles.errorText}>{errors.exerciseLevel}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Workout Frequency</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Days per week</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => {
                      const current = parseInt(fitnessGoals.workoutsPerWeek, 10);
                      if (current > 1) {
                        setFitnessGoals({
                          ...fitnessGoals,
                          workoutsPerWeek: (current - 1).toString(),
                        });
                      }
                    }}
                  >
                    <Ionicons name="remove" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{fitnessGoals.workoutsPerWeek}</Text>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => {
                      const current = parseInt(fitnessGoals.workoutsPerWeek, 10);
                      if (current < 7) {
                        setFitnessGoals({
                          ...fitnessGoals,
                          workoutsPerWeek: (current + 1).toString(),
                        });
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time per workout</Text>
                <View style={styles.durationOptions}>
                  {['20 min', '30 min', '45 min', '60 min', '75 min', '90 min'].map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.durationChip,
                        fitnessGoals.timePerWorkout === duration && styles.durationChipSelected,
                      ]}
                      onPress={() => {
                        setFitnessGoals({ ...fitnessGoals, timePerWorkout: duration });
                      }}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          fitnessGoals.timePerWorkout === duration && styles.durationChipTextSelected,
                        ]}
                      >
                        {duration}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={handleNext} loading={false} />
      </View>
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
  },
  formContainer: {
    padding: 20,
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  goalCardSelected: {
    borderWidth: 2,
  },
  goalLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  activityLevelsList: {
    gap: 8,
  },
  activityLevelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityLevelCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#E8F0FE',
  },
  activityLevelContent: {
    flex: 1,
  },
  activityLevelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityLevelLabelSelected: {
    color: '#2563eb',
  },
  activityLevelDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
  },
  numberButton: {
    padding: 8,
  },
  numberValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  durationChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#E8F0FE',
  },
  durationChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  durationChipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default FitnessGoalsScreen;


